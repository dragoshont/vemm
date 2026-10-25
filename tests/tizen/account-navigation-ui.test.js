"use strict";
var assert = require("assert");
var fs = require("fs");
var path = require("path");
var JSDOM = require("jsdom").JSDOM;
var app = path.resolve(__dirname, "../../samsung/Vemm");

async function run() {
    var dom = new JSDOM(fs.readFileSync(path.join(app, "index.html"), "utf8"), {
        url: "https://app.synthetic.invalid", runScripts: "outside-only"
    });
    var window = dom.window;
    var document = window.document;
    var sections = [{ key: "1", type: "movie", title: "Movies" },
        { key: "2", type: "show", title: "Shows" }];
    var items = [{ ratingKey: "201", type: "movie", title: "Synthetic first" },
        { ratingKey: "202", type: "movie", title: "Synthetic second" }];
    var shows = [{ ratingKey: "301", type: "show", title: "Synthetic show first" },
        { ratingKey: "302", type: "show", title: "Synthetic show second" }];
    var hubs = [{ title: "Recent", hubIdentifier: "home.recent", size: 2, Metadata: items }];
    var mode = "items";
    var pendingPage;
    var reads = [];
    window.fetch = function () { assert.fail("Remote navigation must not contact a real account or media service"); };
    ["js/preferences.js", "js/i18n.js", "js/home-hero.js", "js/home-layout.js"].forEach(function (file) {
        window.eval(fs.readFileSync(path.join(app, file), "utf8"));
    });
    window.__navigationClient = {
        getSections: function () { reads.push("sections"); return Promise.resolve(sections); },
        getHomeHubs: function () { reads.push("hubs"); return Promise.resolve(hubs); },
        getSectionItems: function (key, offset, count) {
            assert(["1", "2"].includes(key));
            assert.strictEqual(offset, 0);
            assert.strictEqual(count, 50);
            reads.push("library:" + key);
            var page = { items: mode === "empty" ? [] : key === "1" ? items : shows,
                offset: 0, totalSize: mode === "empty" ? 0 : 2 };
            if (mode === "pending") {
                var pending = new Promise(function (resolve) {
                    pendingPage = function () { resolve(page); return pending; };
                });
                return pending;
            }
            if (mode === "denied") { return Promise.reject({ status: 403, message: "Synthetic library access denied" }); }
            return Promise.resolve(page);
        }
    };
    var source = fs.readFileSync(path.join(app, "main.js"), "utf8");
    var boundary = source.lastIndexOf('    addConnectForm("");');
    assert(boundary > 0);
    window.__navigationSections = sections;
    window.__navigationHubs = hubs;
    window.eval(source.slice(0, boundary) +
        '    currentClient = window.__navigationClient; currentServerId = "synthetic-server";' +
        'activeProfile = {id:"synthetic-profile"};' +
        'renderHome(window.__navigationSections, window.__navigationHubs); }());');

    function key(code, repeated) {
        document.dispatchEvent(new window.KeyboardEvent("keydown", {
            keyCode: code, bubbles: true, repeat: !!repeated
        }));
        document.dispatchEvent(new window.KeyboardEvent("keyup", { keyCode: code, bubbles: true }));
    }
    function active(text) {
        assert.strictEqual(document.activeElement.textContent, text);
        assert(!document.activeElement.closest("[hidden]"), "Remote focus must remain visible");
    }
    async function until(predicate) {
        var deadline = Date.now() + 2000;
        while (!predicate()) {
            assert(Date.now() < deadline, "Remote navigation did not settle: " + document.getElementById("status").textContent);
            await new Promise(function (resolve) { setTimeout(resolve, 0); });
        }
    }
    function accountFromNavigation() {
        for (var i = 0; i < 5 && !document.activeElement.classList.contains("account-control"); i += 1) { key(37); }
        active("Account");
        key(13);
        active("Settings");
        key(13, true);
        active("Settings");
        assert(!document.querySelector(".screen-settings"), "Held Enter must not reopen or activate another action");
        key(13);
        assert(document.querySelector(".screen-settings"));
        assert(/^Quality:/.test(document.activeElement.textContent));
    }
    async function closeSettings() {
        key(10009);
        await until(function () { return !document.querySelector(".screen-settings"); });
        active("Account");
        assert(document.querySelector(".home-utilities").hidden,
            "Back from Settings returns to the collapsed Account destination");
    }
    try {
        active("Home");
        key(40);
        assert(document.activeElement.classList.contains("home-feature-primary"));
        key(40);
        assert(document.activeElement.classList.contains("media-card"));
        key(38);
        assert(document.activeElement.classList.contains("home-feature-primary"));
        key(38);
        active("Home");
        accountFromNavigation();
        await closeSettings();
        await until(function () { return document.querySelector(".home-hero"); });
        active("Account");

        for (var scenario of ["items", "empty", "denied", "pending"]) {
            mode = scenario;
            var library = scenario === "empty" || scenario === "pending" ? "Shows" : "Movies";
            key(39);
            active("Home");
            key(39);
            if (library === "Shows") { key(39); }
            active(library);
            key(13);
            if (scenario === "items") {
                await until(function () { return document.activeElement.classList.contains("media-card"); });
                for (var i = 0; i < 5 && !document.activeElement.closest(".home-navigation"); i += 1) { key(38); }
                assert(document.activeElement.closest(".home-navigation"), "Library Up must reach its navigation");
            } else if (scenario === "empty") {
                await until(function () { return /No available items/.test(document.body.textContent); });
            } else if (scenario === "denied") {
                await until(function () { return /Synthetic library access denied/.test(document.getElementById("status").textContent); });
            }
            accountFromNavigation();
            if (scenario === "pending") {
                await pendingPage();
                assert(document.querySelector(".screen-settings"), "Late library data must not replace Settings");
                assert(/^Quality:/.test(document.activeElement.textContent), "Late library data must not steal Settings focus");
            }
            await closeSettings();
            assert(document.querySelector(".screen-library"));
            key(10009);
            await until(function () { return document.querySelector(".home-hero"); });
            active(library);
            if (library === "Shows") { key(37); }
            key(37);
            key(37);
            active("Account");
        }
        assert.deepStrictEqual(reads.filter(function (read) { return read.indexOf("library:") === 0; }),
            ["library:1", "library:2", "library:1", "library:2"]);
        mode = "items";
        key(39); active("Home");
        key(39); active("Movies"); key(13);
        await until(function () { return document.activeElement.classList.contains("media-card"); });
        for (var up = 0; up < 5 && !document.activeElement.closest(".home-navigation"); up += 1) { key(38); }
        for (var left = 0; left < 5 && document.activeElement.textContent !== "Movies"; left += 1) { key(37); }
        active("Movies");
        key(39); active("Shows"); key(13);
        await until(function () { return document.activeElement.classList.contains("media-card"); });
        assert(document.querySelector(".media-card").textContent.includes("Synthetic show first"));
        key(10009);
        await until(function () { return document.querySelector('.home-navigation [aria-current="page"]').textContent === "Movies"; });
        assert(document.querySelector(".media-card").textContent.includes("Synthetic first"),
            "Library-to-library Back must restore the original library items, not the successor library's global page");
        assert(!document.querySelector(".media-card").textContent.includes("Synthetic show"));
    } finally { window.close(); }
    console.log("Tizen Home/library Account and Settings D-pad, Back, held Enter and late-page ownership: passed");
}
run().catch(function (error) { console.error(error.stack || error); process.exitCode = 1; });
