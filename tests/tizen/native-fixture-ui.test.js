"use strict";
var assert = require("assert");
var fs = require("fs");
var path = require("path");
var execFileSync = require("child_process").execFileSync;
var JSDOM = require("jsdom").JSDOM;
var acorn = require("acorn");
var root = path.resolve(__dirname, "../..");
var app = path.join(root, "samsung/Vemm");
var boot = execFileSync("python3", ["-c",
    "import importlib.util; s=importlib.util.spec_from_file_location('f','tools/tizen/native-fixture.py');" +
    "m=importlib.util.module_from_spec(s); s.loader.exec_module(m); print(m.fixture_boot('a'*40))"
], { cwd: root, encoding: "utf8" });
var original = fs.readFileSync(path.join(app, "main.js"), "utf8");
var source = original.slice(0, original.lastIndexOf('    addConnectForm("");')) + boot;
acorn.parse(source, { ecmaVersion: 5, allowReserved: false });

async function run(identity) {
    var dom = new JSDOM(fs.readFileSync(path.join(app, "index.html"), "utf8"), {
        url: "https://app.synthetic.invalid", runScripts: "outside-only"
    });
    var window = dom.window;
    var calls = [];
    window.tizen = { application: { getCurrentApplication: function () {
        return { appInfo: { id: identity } };
    } } };
    window.fetch = function (target, options) {
        var url = new URL(target);
        assert.strictEqual(url.origin, "http://127.0.0.1:32491");
        assert.strictEqual(options.headers["X-Plex-Token"], undefined,
            "The account-free native widget needs no embedded Plex credential, even a synthetic one");
        calls.push(url.pathname);
        var container;
        if (url.pathname === "/library/sections") { container = { Directory: [] }; }
        else if (url.pathname === "/hubs/promoted") { container = { Hub: [] }; }
        else if (url.pathname === "/hubs/continueWatching") { container = { Metadata: [] }; }
        else { assert.fail("Missing explicit native-fixture contract: " + url.pathname); }
        return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve({ MediaContainer: container }); } });
    };
    ["js/product.js", "js/plex-api.js", "js/preferences.js", "js/home-layout.js", "js/home-hero.js", "js/i18n.js"].forEach(function (file) {
        window.eval(fs.readFileSync(path.join(app, file), "utf8"));
    });
    try {
        window.eval(source);
        await assert.rejects(window.fetch("https://app.plex.tv/"), /blocked non-fixture HTTP/);
        assert.strictEqual(calls.length, 0, "The generated native boot makes no account or PMS request before explicit start");
        if (identity !== "VemmQaApp0.NativeQa") {
            assert.strictEqual(window.VemmNativeFixture, undefined);
            assert(window.document.getElementById("status").textContent.includes("wrong application identity"));
            return;
        }
        assert.throws(function () { window.VemmNativeFixture.start("https://public.invalid"); }, /private/);
        window.VemmNativeFixture.start("http://127.0.0.1:32491");
        for (var i = 0; i < 60; i += 1) { await Promise.resolve(); }
        assert.deepStrictEqual(calls.sort(), ["/hubs/continueWatching", "/hubs/promoted", "/library/sections"]);
        assert.strictEqual(window.VemmNativeFixture.summary().source, "a".repeat(40));
        assert.strictEqual(window.VemmNativeFixture.summary().appId, identity);
        assert.throws(function () { window.VemmNativeFixture.detail("999"); }, /Unknown synthetic/);
        assert.throws(function () { window.VemmNativeFixture.start("http://127.0.0.1:32491"); }, /already running/);
        await assert.rejects(window.fetch("http://127.0.0.1:32491.attacker.invalid/"), /blocked non-fixture HTTP/);
    } finally { window.close(); }
}
run("wrong.synthetic.app").then(function () { return run("VemmQaApp0.NativeQa"); }).then(function () {
    console.log("Tizen account-free native boot: exact QA identity, source binding, explicit origin and HTTP guard passed");
}).catch(function (error) { console.error(error.stack || error); process.exitCode = 1; });
