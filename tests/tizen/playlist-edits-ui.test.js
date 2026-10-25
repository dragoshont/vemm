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
    var playlist = { ratingKey: "7", title: "Synthetic saved playlist", type: "playlist", playlistType: "video", smart: "0" };
    var item = { ratingKey: "2", title: "Synthetic episode", type: "episode" };
    var rows = Array.from({ length: 105 }, function (_, i) {
        return { playlistItemID: String(9000 + i), ratingKey: String(i % 3 + 1), type: "episode", title: "Synthetic video " + i };
    });
    var writes = [];
    var unchanged = false;
    var hold = false;
    var release;
    function response(container) {
        return { ok: true, status: 200, json: function () { return Promise.resolve({ MediaContainer: container }); } };
    }
    w.TextDecoder = TextDecoder;
    w.fetch = function (target, options) {
        var url = new URL(target);
        assert.strictEqual(url.origin, "https://pms.synthetic.invalid");
        assert.strictEqual(options.headers["X-Plex-Token"], "synthetic-token");
        var start = Number(url.searchParams.get("X-Plex-Container-Start"));
        if (options.method !== "GET") {
            writes.push({ path: url.pathname, method: options.method });
            if (options.method === "PUT") {
                assert.strictEqual(url.searchParams.get("uri"),
                    "server://selected-client/com.plexapp.plugins.library/library/metadata/2");
                if (!unchanged) { rows.push({ playlistItemID: "100000", ratingKey: "2", type: "episode", title: item.title }); }
            } else {
                assert.strictEqual(options.method, "DELETE");
                if (!unchanged) { rows.splice(rows.findIndex(function (row) { return row.playlistItemID === url.pathname.split("/").pop(); }), 1); }
            }
            return Promise.resolve({ ok: true, status: 204 });
        }
        if (url.pathname === "/identity") { return Promise.resolve(response({ machineIdentifier: "selected-client" })); }
        if (url.pathname === "/library/metadata/2") { return Promise.resolve(response({ Metadata: [item] })); }
        if (url.pathname === "/playlists/7") { return Promise.resolve(response({ Metadata: [playlist] })); }
        if (url.pathname === "/playlists") {
            return Promise.resolve(response({ totalSize: 51, offset: start, Metadata: start === 50 ? [playlist] :
                Array.from({ length: 50 }, function (_, i) {
                    return { ratingKey: String(100 + i), title: "Synthetic smart playlist", type: "playlist", playlistType: "video", smart: "1" };
                }) }));
        }
        assert.strictEqual(url.pathname, "/playlists/7/items");
        var page = { offset: start, totalSize: rows.length, Metadata: rows.slice(start, start + 50) };
        if (hold) {
            hold = false;
            return new Promise(function (resolve) { release = function () { resolve(response(page)); }; });
        }
        return Promise.resolve(response(page));
    };
    for (var script of w.document.querySelectorAll("script[src]")) {
        var name = script.getAttribute("src");
        if (name !== "main.js" && name.indexOf("$WEBAPIS") < 0) { w.eval(fs.readFileSync(path.join(root, name), "utf8")); }
    }
    w.__client = w.PlexApi.createClient({ baseUrl: "https://pms.synthetic.invalid", token: "synthetic-token", fetch: w.fetch });
    w.__primaryClient = w.PlexApi.createClient({ baseUrl: "https://primary.synthetic.invalid", token: "synthetic-primary-token",
        fetch: function () { throw new Error("Playlist edits must not contact the primary server."); } });
    w.__item = item;
    var source = fs.readFileSync(path.join(root, "main.js"), "utf8");
    var boundary = source.lastIndexOf('    addConnectForm("");');
    assert(boundary > 0);
    w.eval(source.slice(0, boundary) +
        '    currentClient = window.__primaryClient; currentServerId = "wrong-global-server"; renderDetail(window.__item, window.__client); }());');
    function control(label, parent) {
        return Array.from((parent || w.document).querySelectorAll("button")).find(function (node) {
            return node.textContent.trim() === label;
        });
    }
    function press(label, parent) {
        var node = control(label, parent);
        assert(node, "Missing playlist action: " + label);
        assert(!node.closest("[hidden]"), "Playlist action must be visible: " + label);
        node.focus();
        w.document.dispatchEvent(new w.KeyboardEvent("keydown", { keyCode: 13, bubbles: true }));
        w.document.dispatchEvent(new w.KeyboardEvent("keyup", { keyCode: 13, bubbles: true }));
    }
    async function settle() {
        for (var i = 0; i < 5; i += 1) { await new Promise(function (resolve) { setTimeout(resolve, 0); }); }
    }
    try {
        press("More");
        press("Add to playlist");
        await settle();
        assert.strictEqual(writes.length, 0, "Inspecting destinations never changes a playlist or starts playback");
        assert(!control(playlist.title));
        press("Next page"); await settle();
        press(playlist.title); await settle();
        assert(w.document.querySelector(".page-title").textContent.includes(item.title));
        assert(w.document.querySelector(".page-title").textContent.includes(playlist.title));
        press("Cancel"); await settle();
        assert.strictEqual(w.document.activeElement.textContent, playlist.title, "Cancel restores the selected destination");
        assert.strictEqual(writes.length, 0);
        press(playlist.title); press("Confirm"); press("Confirm"); await settle();
        assert.strictEqual(writes.length, 1, "Repeated Confirm adds once");
        assert(w.document.getElementById("status").textContent.includes("accepted"));
        press("Refresh"); await settle();
        var row = w.document.querySelectorAll(".playlist-entry")[1];
        press("Remove from playlist", row); await settle();
        press("Cancel"); await settle();
        assert.strictEqual(w.document.activeElement.textContent, "Remove from playlist");
        assert.strictEqual(writes.length, 1);
        row = w.document.querySelectorAll(".playlist-entry")[1];
        press("Remove from playlist", row); press("Confirm"); press("Confirm"); await settle();
        assert.deepStrictEqual(writes[1], { path: "/playlists/7/items/9001", method: "DELETE" });
        assert.strictEqual(writes.length, 2);
        assert(!rows.some(function (entry) { return entry.playlistItemID === "9001"; }));
        assert(rows.some(function (entry) { return entry.ratingKey === "2"; }));
        press("Refresh"); await settle();
        unchanged = true;
        press("Remove from playlist", w.document.querySelector(".playlist-entry"));
        press("Confirm"); await settle();
        assert(w.document.getElementById("status").textContent.includes("not confirmed"));
        assert.strictEqual(writes.length, 3, "Unchanged HTTP success is not replayed");
        press("Cancel"); await settle();
        unchanged = false;
        hold = true;
        press("Remove from playlist", w.document.querySelector(".playlist-entry"));
        press("Confirm"); await settle();
        assert(release);
        press("Cancel");
        release(); await settle();
        assert.strictEqual(writes.length, 3, "Leaving a secondary-client removal prevents a late write");
        press("Back"); await settle();
        assert.strictEqual(w.document.activeElement.textContent, "Add to playlist");
        press("Add to playlist"); await settle();
        press("Next page"); await settle();
        press(playlist.title); await settle();
        press("Confirm"); press("Cancel"); await settle();
        assert.strictEqual(writes.length, 3, "Synchronous exit before the confirmation job prevents even preflight");
        press(playlist.title); await settle();
        hold = true;
        press("Confirm"); await settle();
        assert(release, "The production client is awaiting playlist preflight");
        press("Cancel");
        release(); await settle();
        assert.strictEqual(writes.length, 3, "Leaving a pending confirmation prevents a late write");
        assert(w.document.querySelector(".screen-playlist-picker"));
        console.log("Saved playlist actual UI: paged picker, exact duplicate removal, confirmation, cancellation and uncertainty passed");
    } finally { dom.window.close(); }
}
run().catch(function (error) { console.error(error.stack || error); process.exitCode = 1; });
