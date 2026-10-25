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
    var error = null;
    var clock = 100000;
    window.Date.now = function () { return clock; };
    window.fetch = function () { assert.fail("Home cache tests never contact a server"); };
    function result(value) { return error ? Promise.reject(error) : Promise.resolve(value); }
    window.__client = {
        getSections: function () { return result([{ key: "1", type: "movie", title: "Movies" }]); },
        getHomeHubs: function () { return result([{ title: "Recent", hubIdentifier: "home.movies.recent",
            Metadata: [{ ratingKey: "100", title: "Synthetic cached title", type: "movie" }] }]); }
    };
    ["js/home-hero.js", "js/i18n.js"].forEach(function (file) {
        window.eval(fs.readFileSync(path.join(app, file), "utf8"));
    });
    var source = fs.readFileSync(path.join(app, "main.js"), "utf8");
    source = source.slice(0, source.lastIndexOf('    addConnectForm("");')) +
        '    currentClient = window.__client; window.__reloadHome = function () { loadHome(false); };' +
        ' window.__switchProfile = function () { activeProfile = {uuid:"different-synthetic-profile"}; };' +
        ' window.__chooseProfile = function () { accountClient = {getProfiles:function(){return Promise.resolve([]);}}; openProfiles(); };' +
        ' loadHome(false); }());';
    window.eval(source);
    async function settle() { for (var i = 0; i < 40; i += 1) { await Promise.resolve(); } }
    try {
        await settle();
        assert.strictEqual(window.document.querySelectorAll(".media-card").length, 1);
        error = new Error("Synthetic network outage");
        window.__reloadHome();
        await settle();
        assert.strictEqual(window.document.querySelectorAll(".media-card").length, 1,
            "A transient outage retains bounded metadata already viewed by the same active profile");
        assert(/Cached Home/.test(window.document.getElementById("status").textContent));
        assert(Array.from(window.document.querySelectorAll("button")).some(function (node) {
            return node.textContent === "Retry";
        }), "Cached results include explicit online recovery");
        error.status = 403;
        window.__reloadHome();
        await settle();
        assert.strictEqual(window.document.querySelectorAll(".media-card").length, 0,
            "Authorization refusal must never fall back to cached library metadata");
        error = null;
        window.__reloadHome();
        await settle();
        window.__switchProfile();
        error = new Error("Synthetic outage after profile change");
        window.__reloadHome();
        await settle();
        assert.strictEqual(window.document.querySelectorAll(".media-card").length, 0,
            "Another profile never inherits cached protected metadata");
        error = null;
        window.__reloadHome();
        await settle();
        clock += 300001;
        error = new Error("Synthetic outage after cache expiry");
        window.__reloadHome();
        await settle();
        assert.strictEqual(window.document.querySelectorAll(".media-card").length, 0,
            "Expired metadata requires a new server response");
        error = null;
        window.__reloadHome();
        await settle();
        window.__chooseProfile();
        await settle();
        error = new Error("Synthetic outage while choosing a protected profile");
        window.__reloadHome();
        await settle();
        assert.strictEqual(window.document.querySelectorAll(".media-card").length, 0,
            "Entering profile selection purges the previous profile's snapshot before PIN entry");
        assert.strictEqual(window.localStorage.length, 0, "Cached grants and metadata are never persisted");
    } finally { window.close(); }
    console.log("Tizen scoped in-memory Home outage recovery: passed");
}
run().catch(function (error) { console.error(error.stack || error); process.exitCode = 1; });
