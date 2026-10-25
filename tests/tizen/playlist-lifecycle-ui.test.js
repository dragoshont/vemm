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
    var item = { ratingKey: "2", type: "movie", title: "Synthetic source movie" };
    var playlist = null;
    var seeded = false;
    var calls = [];
    var unchanged = false;
    function response(container) {
        return { ok: true, status: 200, json: function () { return Promise.resolve({ MediaContainer: container }); } };
    }
    w.TextDecoder = TextDecoder;
    w.fetch = function (target, options) {
        var url = new URL(target);
        assert.strictEqual(url.origin, "https://pms.synthetic.invalid");
        assert.strictEqual(options.headers["X-Plex-Token"], "synthetic-token");
        calls.push({ method: options.method, path: url.pathname });
        if (options.method === "POST") {
            assert.strictEqual(url.pathname, "/playlists");
            seeded = url.searchParams.has("uri");
            if (seeded) { assert.strictEqual(url.searchParams.get("uri"),
                "server://selected-server/com.plexapp.plugins.library/library/metadata/2"); }
            playlist = { ratingKey: "7", type: "playlist", playlistType: "video", smart: "0", title: url.searchParams.get("title") };
            return Promise.resolve(response({ Metadata: [playlist] }));
        }
        if (options.method === "PUT") {
            assert.strictEqual(url.pathname, "/playlists/7");
            if (!unchanged) { playlist = Object.assign({}, playlist, { title: url.searchParams.get("title.value") }); }
            return Promise.resolve({ ok: true, status: 204 });
        }
        if (options.method === "DELETE") {
            assert.strictEqual(url.pathname, "/playlists/7");
            playlist = null;
            return Promise.resolve({ ok: true, status: 204 });
        }
        if (url.pathname === "/identity") { return Promise.resolve(response({ machineIdentifier: "selected-server" })); }
        if (url.pathname === "/library/metadata/2") { return Promise.resolve(response({ Metadata: [item] })); }
        if (url.pathname === "/playlists/7") {
            return Promise.resolve(playlist ? response({ Metadata: [playlist] }) : { ok: false, status: 404 });
        }
        if (url.pathname === "/playlists/7/items") {
            return Promise.resolve(response({ totalSize: seeded ? 1 : 0, offset: 0,
                Metadata: seeded ? [Object.assign({}, item, { playlistItemID: "9007199254740993" })] : [] }));
        }
        assert.strictEqual(url.pathname, "/playlists");
        return Promise.resolve(response({ totalSize: playlist ? 1 : 0, Metadata: playlist ? [playlist] : [] }));
    };
    for (var script of w.document.querySelectorAll("script[src]")) {
        var name = script.getAttribute("src");
        if (name !== "main.js" && name.indexOf("$WEBAPIS") < 0) { w.eval(fs.readFileSync(path.join(root, name), "utf8")); }
    }
    w.__client = w.PlexApi.createClient({ baseUrl: "https://pms.synthetic.invalid", token: "synthetic-token", fetch: w.fetch });
    w.__item = item;
    var source = fs.readFileSync(path.join(root, "main.js"), "utf8");
    var boundary = source.lastIndexOf('    addConnectForm("");');
    w.eval(source.slice(0, boundary) +
        '    currentClient = { cancelRequests: function () {} }; currentServerId = "wrong-primary-server"; renderDetail(window.__item, window.__client); }());');
    function control(label) {
        return Array.from(w.document.querySelectorAll("button")).find(function (node) { return node.textContent.trim() === label; });
    }
    function press(label) {
        var node = control(label);
        assert(node, "Missing lifecycle control: " + label + "; " + w.document.querySelector(".screen").textContent);
        assert(!node.closest("[hidden]"), "Lifecycle action must be visible: " + label);
        node.focus();
        w.document.dispatchEvent(new w.KeyboardEvent("keydown", { keyCode: 13, bubbles: true }));
        w.document.dispatchEvent(new w.KeyboardEvent("keyup", { keyCode: 13, bubbles: true }));
    }
    async function settle() {
        for (var i = 0; i < 5; i += 1) { await new Promise(function (resolve) { setTimeout(resolve, 0); }); }
    }
    function mutations() { return calls.filter(function (call) { return call.method !== "GET"; }); }
    try {
        press("More"); press("Add to playlist"); await settle();
        press("Create playlist"); await settle();
        var input = w.document.querySelector('input[type="text"]');
        assert(input && input.labels.length === 1, "The remote name field has an explicit visible label");
        input.value = " ";
        press("Continue"); await settle();
        assert(w.document.getElementById("status").textContent.includes("name"));
        assert.strictEqual(mutations().length, 0);
        input.value = "Synthetic new playlist";
        press("Continue"); await settle();
        assert(w.document.querySelector(".page-title").textContent.includes(item.title));
        assert(w.document.querySelector(".page-title").textContent.includes(input.value));
        press("Cancel"); await settle();
        assert.strictEqual(w.document.activeElement.textContent, "Continue");
        assert.strictEqual(w.document.querySelector("input").value, "Synthetic new playlist");
        assert.strictEqual(mutations().length, 0);
        press("Continue"); press("Confirm"); press("Confirm"); await settle();
        assert.strictEqual(mutations().length, 1);
        press("Refresh"); await settle();
        assert(w.document.querySelector(".detail-title").textContent.includes("Synthetic new playlist"));
        press("More"); press("Rename playlist"); await settle();
        w.document.querySelector("input").value = "Synthetic renamed playlist";
        press("Continue"); press("Confirm"); await settle();
        assert.strictEqual(mutations().length, 2);
        press("Refresh"); await settle();
        assert(w.document.querySelector(".detail-title").textContent.includes("Synthetic renamed playlist"));
        press("More"); press("Rename playlist"); await settle();
        w.document.querySelector("input").value = "Synthetic uncertain rename";
        press("Continue"); unchanged = true; press("Confirm"); await settle();
        assert(w.document.getElementById("status").textContent.includes("not confirmed"));
        assert.strictEqual(mutations().length, 3);
        press("Refresh"); await settle();
        assert(w.document.querySelector(".detail-title").textContent.includes("Synthetic renamed playlist"));
        unchanged = false;
        press("More"); press("Delete playlist"); await settle();
        assert(w.document.querySelector(".page-title").textContent.includes("Synthetic renamed playlist"));
        assert(w.document.querySelector(".screen").textContent.includes("not the media"));
        press("Cancel"); await settle();
        assert.strictEqual(w.document.activeElement.textContent, "Delete playlist");
        assert.strictEqual(mutations().length, 3);
        press("Delete playlist"); press("Confirm"); press("Confirm"); await settle();
        assert.strictEqual(mutations().length, 4);
        press("Refresh"); await settle();
        assert(w.document.querySelector(".page-title").textContent.includes("Video playlists"));
        assert.strictEqual(w.document.querySelectorAll(".media-card").length, 0);
        press("Create playlist"); await settle();
        assert(w.document.querySelector(".screen").textContent.includes("starts empty"));
        w.document.querySelector("input").value = "Synthetic empty playlist";
        press("Continue"); press("Confirm"); await settle();
        assert.strictEqual(mutations().length, 5);
        assert.strictEqual(seeded, false);
        press("Refresh"); await settle();
        assert(w.document.querySelector(".detail-title").textContent.includes("Synthetic empty playlist"));
        w.document.dispatchEvent(new w.KeyboardEvent("keydown", { keyCode: 10009, bubbles: true }));
        w.document.dispatchEvent(new w.KeyboardEvent("keyup", { keyCode: 10009, bubbles: true }));
        await settle();
        assert(w.document.querySelector(".page-title").textContent.includes("Video playlists"));
        assert(w.document.querySelector(".media-card").textContent.includes("Synthetic empty playlist"),
            "Back refreshes the formerly empty retained playlist list after creation");
        assert(!w.document.getElementById("status").textContent.includes("no longer available"),
            "Deletion does not leave the deleted detail as the next Back destination");
        console.log("Saved playlist lifecycle actual UI: named create/rename/delete, explicit confirmation, focus, read-back and Back passed");
    } finally { dom.window.close(); }
}
run().catch(function (error) { console.error(error.stack || error); process.exitCode = 1; });
