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
    var pages = [];
    function items(start, count) {
        var result = [];
        for (var i = start; i < Math.min(75, start + count); i += 1) {
            result.push({ ratingKey: String(100 + i), type: "movie", title: "Synthetic " + i });
        }
        return result;
    }
    window.fetch = function (target) {
        var url = new URL(target);
        assert.strictEqual(url.origin, "https://pms.synthetic.invalid");
        assert.strictEqual(url.pathname, "/hubs/items");
        assert.strictEqual(url.searchParams.get("identifier"), "home.movies.recent");
        var start = Number(url.searchParams.get("X-Plex-Container-Start"));
        pages.push(start);
        return Promise.resolve({ ok: true, status: 200, json: function () {
            return Promise.resolve({ MediaContainer: { totalSize: 75, offset: start, Metadata: items(start, 50) } });
        } });
    };
    ["js/plex-api.js", "js/home-hero.js", "js/item-menu.js", "js/preferences.js", "js/i18n.js"].forEach(function (file) {
        window.eval(fs.readFileSync(path.join(app, file), "utf8"));
    });
    window.__client = window.PlexApi.createClient({ baseUrl: "https://pms.synthetic.invalid", fetch: window.fetch });
    var source = fs.readFileSync(path.join(app, "main.js"), "utf8");
    var boot = source.lastIndexOf('    addConnectForm("");');
    assert(boot > 0);
    source = source.slice(0, boot) +
        '    currentClient = window.__client; renderHome([], [{title: "Recent", ' +
        'hubIdentifier: "home.movies.recent", size: 75, Metadata: ' + JSON.stringify(items(0, 12)) + '}]); }());';
    window.eval(source);
    async function settle() { for (var i = 0; i < 40; i += 1) { await Promise.resolve(); } }
    function key(code) {
        window.document.dispatchEvent(new window.KeyboardEvent("keydown", { keyCode: code, bubbles: true }));
    }
    function button(label) {
        var control = Array.from(window.document.querySelectorAll("button")).find(function (node) {
            return node.textContent === label;
        });
        assert(control, "Missing remote action: " + label);
        return control;
    }
    try {
        var last = window.document.querySelectorAll(".shelf-row .media-card")[11];
        last.focus();
        key(39);
        assert.strictEqual(window.document.activeElement.textContent, "See all",
            "Right beyond the twelfth title must reach a shelf-expansion action");
        key(13);
        await settle();
        assert.strictEqual(window.document.querySelectorAll(".item-list .media-card").length, 50,
            window.document.getElementById("status").textContent);
        button("Load more").focus();
        key(13);
        await settle();
        assert.strictEqual(window.document.querySelectorAll(".item-list .media-card").length, 75);
        assert.deepStrictEqual(pages, [0, 50], "Expanded shelves use bounded PMS pages");
        var finalCard = window.document.querySelectorAll(".item-list .media-card")[74];
        finalCard.focus();
        button("Back").click();
        await settle();
        assert.strictEqual(window.document.activeElement.textContent, "See all",
            "Back restores the exact Home shelf control without reloading Home");
        key(13);
        await settle();
        assert.deepStrictEqual(pages, [0, 50, 0]);
    } finally { window.close(); }
    console.log("Tizen remote Home shelf expansion and paging: passed");
}
run().catch(function (error) { console.error(error.stack || error); process.exitCode = 1; });
