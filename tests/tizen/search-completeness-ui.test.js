"use strict";
var assert = require("assert");
var fs = require("fs");
var path = require("path");
var JSDOM = require("jsdom").JSDOM;
var root = path.resolve(__dirname, "../../samsung/Vemm");
async function run() {
    var dom = new JSDOM(fs.readFileSync(path.join(root, "index.html"), "utf8"), {
        url: "https://app.synthetic.invalid", runScripts: "outside-only", pretendToBeVisual: true
    });
    var w = dom.window;
    var pending;
    var calls = [];
    var mode = "complete";
    var clip = { ratingKey: "2", type: "clip", title: "Synthetic clip" };
    var playlist = { ratingKey: "7", type: "playlist", playlistType: "video", title: "Synthetic playlist", smart: "0" };
    function response(container) {
        return { ok: true, status: 200, json: function () { return Promise.resolve({ MediaContainer: container }); } };
    }
    var hubs = [{ type: "clip", title: "Clips", Metadata: [clip] },
        { type: "playlist", title: "Playlists", Metadata: [playlist,
            { ratingKey: "8", type: "playlist", playlistType: "audio", title: "Unsupported audio playlist" }] }];
    w.TextDecoder = TextDecoder;
    w.fetch = function (target, request) {
        var url = new URL(target);
        assert.strictEqual(url.origin, "https://pms.synthetic.invalid");
        assert.strictEqual(request.method, "GET", "Searching and browsing cannot play or write");
        calls.push(url.pathname);
        if (url.pathname === "/hubs/search") {
            assert.strictEqual(url.searchParams.get("limit"), "50");
            if (mode === "pending") {
                return new Promise(function (resolve) { pending = function () { resolve(response({ Hub: hubs })); }; });
            }
            return Promise.resolve(response({ Hub: hubs }));
        }
        assert.strictEqual(url.pathname, "/playlists/7", "A playlist result must not use /library/metadata/7");
        return Promise.resolve(response({ Metadata: [playlist] }));
    };
    for (var script of w.document.querySelectorAll("script[src]")) {
        var name = script.getAttribute("src");
        if (name !== "main.js" && name.indexOf("$WEBAPIS") < 0) { w.eval(fs.readFileSync(path.join(root, name), "utf8")); }
    }
    w.__client = w.PlexApi.createClient({ baseUrl: "https://pms.synthetic.invalid", token: "synthetic-token", fetch: w.fetch });
    var source = fs.readFileSync(path.join(root, "main.js"), "utf8");
    var boundary = source.lastIndexOf('    addConnectForm("");');
    w.eval(source.slice(0, boundary) + '    currentClient = window.__client; servers = []; openSearch("");' +
        ' window.__multiSearch = function () { servers = window.__servers; openSearch("Copies"); }; }());');
    async function settle() {
        for (var i = 0; i < 6; i += 1) { await new Promise(function (resolve) { setTimeout(resolve, 0); }); }
    }
    function search(value) {
        var input = w.document.querySelector('input[type="search"]');
        input.value = value;
        input.dispatchEvent(new w.Event("input", { bubbles: true }));
        Array.from(w.document.querySelectorAll("button")).find(function (node) { return node.textContent === "Search"; }).click();
    }
    try {
        search("Synthetic"); await settle();
        assert(w.document.querySelector(".search-results").textContent.includes(clip.title), "Supported clip results must not disappear");
        var result = Array.from(w.document.querySelectorAll(".media-card")).find(function (node) { return node.textContent.includes(playlist.title); });
        assert(result, "Supported video-playlist results must not disappear");
        assert(!w.document.querySelector(".search-results").textContent.includes("Unsupported audio playlist"));
        result.focus();
        w.document.dispatchEvent(new w.KeyboardEvent("keydown", { keyCode: 13, bubbles: true }));
        w.document.dispatchEvent(new w.KeyboardEvent("keyup", { keyCode: 13, bubbles: true }));
        await settle();
        assert(calls.includes("/playlists/7"));
        w.document.dispatchEvent(new w.KeyboardEvent("keydown", { keyCode: 10009, bubbles: true }));
        w.document.dispatchEvent(new w.KeyboardEvent("keyup", { keyCode: 10009, bubbles: true }));
        await settle();
        assert.strictEqual(w.document.querySelector("input").value, "Synthetic");
        assert(w.document.activeElement.textContent.includes(playlist.title), "Back restores the exact playlist search result");
        mode = "pending"; search("Old query");
        while (!pending) { await new Promise(function (resolve) { setTimeout(resolve, 0); }); }
        var input = w.document.querySelector("input");
        input.value = "";
        input.dispatchEvent(new w.Event("input", { bubbles: true }));
        var count = calls.length;
        pending(); await settle();
        assert.strictEqual(w.document.querySelector(".search-results").children.length, 0,
            "Clearing the query must retire pending results, not repopulate an empty search");
        assert.strictEqual(calls.length, count, "An empty input must not search again");
        mode = "complete";
        hubs = Array.from({ length: 1000 }, function (_, index) {
            return { type: "clip", title: "Synthetic group " + index,
                Metadata: [{ ratingKey: String(index + 100), type: "clip", title: "Synthetic item " + index }] };
        });
        search("Bounded"); await settle();
        assert.strictEqual(w.document.querySelectorAll(".search-results .media-card").length, 200);
        assert.strictEqual(w.document.querySelector(".search-results").children.length, 200,
            "The global result bound cannot retain hundreds of empty extra hub headings");
        mode = "pending"; pending = null; search("Another old query");
        while (!pending) { await new Promise(function (resolve) { setTimeout(resolve, 0); }); }
        input = w.document.querySelector("input");
        input.value = "Edited but not submitted";
        input.dispatchEvent(new w.Event("input", { bubbles: true }));
        count = calls.length;
        pending(); await settle();
        assert.strictEqual(w.document.querySelector(".search-results").children.length, 0,
            "A nonempty edited query also retires the previous query's ownership");
        assert.strictEqual(calls.length, count);
        mode = "complete";
        hubs = [{ type: "actor", title: "Empty actor hub", Directory: [] }];
        search("Empty"); await settle();
        assert(!w.document.querySelector(".people-results"));
        assert(w.document.querySelector(".empty-state").textContent.includes("No matching"));
        var clients = {};
        var opened = [];
        ["alpha", "beta"].forEach(function (id) {
            var copy = Object.assign({}, playlist, { title: "Synthetic copy " + id });
            clients[id] = {
                cancelRequests: function () {},
                search: function () { return Promise.resolve({ Hub: [{ type: "playlist", title: "Copies", Metadata: [copy] }] }); },
                getVideoPlaylist: function (key) { assert.strictEqual(key, "7"); opened.push(id); return Promise.resolve(copy); }
            };
        });
        w.__servers = [{ id: "alpha", name: "Synthetic Alpha" }, { id: "beta", name: "Synthetic Beta" }];
        w.PlexApi.selectServer = function (server, options) {
            assert(options.onClient(clients[server.id]));
            return Promise.resolve({ client: clients[server.id] });
        };
        w.__multiSearch(); await settle();
        result = Array.from(w.document.querySelectorAll(".media-card")).find(function (node) { return node.textContent.includes("copy beta"); });
        assert(result);
        result.focus();
        w.document.dispatchEvent(new w.KeyboardEvent("keydown", { keyCode: 13, bubbles: true }));
        w.document.dispatchEvent(new w.KeyboardEvent("keyup", { keyCode: 13, bubbles: true }));
        await settle();
        assert.deepStrictEqual(opened, ["beta"], "Equal rating keys on different servers are not interchangeable");
        w.document.dispatchEvent(new w.KeyboardEvent("keydown", { keyCode: 10009, bubbles: true }));
        w.document.dispatchEvent(new w.KeyboardEvent("keyup", { keyCode: 10009, bubbles: true }));
        await settle();
        assert(w.document.activeElement.textContent.includes("copy beta"), "Back restores source server as well as rating key");
    } finally { dom.window.close(); }
    console.log("Search actual UI: clip/video-playlist kinds, correct detail identity and cleared-query ownership passed");
}
run().catch(function (error) { console.error(error.stack || error); process.exitCode = 1; });
