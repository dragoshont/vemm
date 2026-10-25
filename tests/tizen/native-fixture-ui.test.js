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
async function runHttp(origin) {
    assert.match(origin, /^http:\/\/127\.0\.0\.1:[0-9]+$/);
    var dom = new JSDOM(fs.readFileSync(path.join(app, "index.html"), "utf8"), {
        url: "https://app.synthetic.invalid", runScripts: "outside-only", pretendToBeVisual: true
    });
    var w = dom.window;
    var calls = [];
    var state = "NONE";
    var listener;
    w.TextDecoder = TextDecoder;
    w.AbortController = AbortController;
    w.tizen = { application: { getCurrentApplication: function () {
        return { appInfo: { id: "VemmQaApp0.NativeQa" } };
    } } };
    w.webapis = { avplay: {
        getState: function () { return state; }, open: function () { state = "IDLE"; },
        close: function () { state = "NONE"; }, stop: function () { state = "IDLE"; },
        setDisplayRect: function () {}, setDisplayMethod: function () {},
        setListener: function (value) { listener = value; },
        prepareAsync: function (success) { state = "READY"; success(); },
        getDuration: function () { return 30000; }, getCurrentTime: function () { return 1500; },
        play: function () { state = "PLAYING"; }, pause: function () { state = "PAUSED"; },
        seekTo: function (_, success) { success(); }
    } };
    w.fetch = function (target, options) {
        var url = new URL(target);
        assert.strictEqual(url.origin, origin);
        return fetch(target, options).then(function (response) {
            calls.push({ path: url.pathname, method: options.method, query: url.searchParams, status: response.status });
            return response;
        });
    };
    function key(code) {
        w.document.dispatchEvent(new w.KeyboardEvent("keydown", { keyCode: code, bubbles: true }));
        w.document.dispatchEvent(new w.KeyboardEvent("keyup", { keyCode: code, bubbles: true }));
    }
    async function until(check, message) {
        var deadline = Date.now() + 3000;
        while (!check() && Date.now() < deadline) {
            await new Promise(function (resolve) { setTimeout(resolve, 10); });
        }
        assert(check(), message + ": " + w.document.getElementById("status").textContent);
    }
    try {
        Array.from(w.document.querySelectorAll("script[src]")).forEach(function (script) {
            var file = script.getAttribute("src");
            if (file.indexOf("$WEBAPIS") < 0) {
                w.eval(file === "main.js" ? source : fs.readFileSync(path.join(app, file), "utf8"));
            }
        });
        w.VemmNativeFixture.start(origin);
        await until(function () { return w.document.querySelector(".media-card"); }, "Synthetic Home must load");
        w.VemmNativeFixture.detail("20000");
        await until(function () { return w.document.activeElement.textContent.trim() === "Play"; },
            "Detail must give initial remote focus to Play");
        var started = Date.now();
        key(13);
        await until(function () { return state === "PLAYING"; },
            "The real API parser and generated boot must start video against the Python HTTP fixture");
        listener.oncurrentplaytime(1500);
        await until(function () { return calls.some(function (call) {
            return call.path === "/:/timeline" && call.query.get("state") === "playing";
        }); }, "Playing timeline must reach the actual HTTP server");
        await until(function () { return Array.from(w.document.querySelectorAll("button")).some(function (button) {
            return button.textContent.trim() === "Skip Intro";
        }); }, "Synthetic episode markers must reach the actual player UI");
        await until(function () { return Date.now() - started > 160; }, "Respect the media-key debounce");
        key(413);
        await until(function () { return calls.some(function (call) {
            return call.path === "/playQueues/9007199254740993/items" && call.method === "DELETE";
        }) && calls.some(function (call) {
            return call.path === "/:/timeline" && call.query.get("state") === "stopped";
        }); }, "Remote Stop must confirm timeline and owned queue cleanup through HTTP");
        assert.strictEqual(state, "NONE");
        assert(calls.every(function (call) { return call.status >= 200 && call.status < 300; }),
            JSON.stringify(calls.filter(function (call) { return call.status >= 300; }).map(function (call) {
                return [call.method, call.path, call.status];
            })));
    } finally { w.close(); }
}
run("wrong.synthetic.app").then(function () { return run("VemmQaApp0.NativeQa"); }).then(function () {
    if (process.argv[2]) { return runHttp(process.argv[2]); }
}).then(function () {
    console.log("Tizen account-free native boot: exact QA identity, source binding, explicit origin and HTTP guard passed");
}).catch(function (error) { console.error(error.stack || error); process.exitCode = 1; });
