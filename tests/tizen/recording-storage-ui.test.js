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
    var mode = "none";
    var writes = [];
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
        if (options.method === "POST") {
            assert.strictEqual(url.pathname, "/media/subscriptions");
            writes.push(url.searchParams);
            return Promise.resolve(response({}));
        }
        var container;
        if (url.pathname === "/media/providers") {
            container = { MediaProvider: [{ identifier: "tv.plex.providers.epg.synthetic:1", title: "Synthetic provider",
                Feature: [{ type: "subscribe", flavor: "record" }] }] };
        } else if (url.pathname.endsWith("/hubs/discover")) {
            container = { Hub: [{ Metadata: [{ guid: "plex://episode/synthetic", title: "Synthetic program" }] }] };
        } else if (url.pathname === "/media/subscriptions/template") {
            container = { SubscriptionTemplate: [{ MediaSubscription: [
                { title: "This episode", type: 4, parameters: "hints%5Bguid%5D=plex%3A%2F%2Fepisode%2Fsynthetic" }
            ] }] };
        } else if (url.pathname === "/library/sections") {
            var library = { key: "2", type: "show", title: "Synthetic library" };
            if (mode === "invalid") { library.Location = { id: "6" }; }
            if (mode === "duplicate") { library.Location = [{ id: 6 }, { id: 6 }]; }
            if (mode === "oversized") { library.Location = Array.from({ length: 51 }, function (_, i) { return { id: i }; }); }
            if (mode === "valid") { library.Location = [{ id: 6, path: "/synthetic/recordings" }]; }
            container = { Directory: [library] };
            if (hold) {
                hold = false;
                return new Promise(function (resolve) { release = function () { resolve(response(container)); }; });
            }
        } else { assert.fail("Unexpected synthetic DVR route: " + url.pathname); }
        return Promise.resolve(response(container));
    };
    for (var script of w.document.querySelectorAll("script[src]")) {
        var name = script.getAttribute("src");
        if (name !== "main.js" && name.indexOf("$WEBAPIS") < 0) { w.eval(fs.readFileSync(path.join(root, name), "utf8")); }
    }
    w.__client = w.PlexApi.createClient({ baseUrl: "https://pms.synthetic.invalid", token: "synthetic-token", fetch: w.fetch });
    var source = fs.readFileSync(path.join(root, "main.js"), "utf8");
    var boundary = source.lastIndexOf('    addConnectForm("");');
    w.eval(source.slice(0, boundary) + "    currentClient = window.__client; openTelevision(); }());");
    function control(label) {
        return Array.from(w.document.querySelectorAll("button")).find(function (node) { return node.textContent.trim() === label; });
    }
    function press(label) {
        var node = control(label);
        assert(node && !node.closest("[hidden]"), "Missing visible storage control: " + label);
        node.focus();
        w.document.dispatchEvent(new w.KeyboardEvent("keydown", { keyCode: 13, bubbles: true }));
        w.document.dispatchEvent(new w.KeyboardEvent("keyup", { keyCode: 13, bubbles: true }));
    }
    async function settle() {
        for (var i = 0; i < 5; i += 1) { await new Promise(function (resolve) { setTimeout(resolve, 0); }); }
    }
    try {
        await settle();
        press("Synthetic provider"); await settle();
        press("Synthetic program"); await settle();
        press("Record / This episode"); await settle();
        press("Synthetic library"); await settle();
        assert(w.document.getElementById("status").textContent.includes("did not advertise"));
        assert.strictEqual(writes.length, 0, "Missing locations never silently choose a default or schedule");
        press("Use Plex default storage"); await settle();
        assert(w.document.querySelector(".screen").textContent.includes("Plex default storage"));
        press("Confirm"); press("Confirm"); await settle();
        assert.strictEqual(writes.length, 1);
        assert.strictEqual(writes[0].get("targetLibrarySectionID"), "2");
        assert(!writes[0].has("targetSectionLocationID"), "Only explicit default omits the location field");
        press("Cancel"); await settle();
        for (var invalid of ["invalid", "duplicate", "oversized"]) {
            mode = invalid;
            press("Choose another library"); await settle();
            press("Synthetic library"); await settle();
            assert(w.document.getElementById("status").textContent.includes("invalid recording storage"));
            assert(!control("Confirm") && !control("Use Plex default storage"),
                "Malformed storage is an error, not a default-location fallback");
            assert.strictEqual(writes.length, 1);
        }
        mode = "valid";
        press("Choose another library"); await settle();
        hold = true;
        press("Synthetic library"); await settle();
        assert(release);
        w.document.dispatchEvent(new w.KeyboardEvent("keydown", { keyCode: 10009, bubbles: true }));
        w.document.dispatchEvent(new w.KeyboardEvent("keyup", { keyCode: 10009, bubbles: true }));
        release(); await settle();
        assert(w.document.querySelector(".screen-program"));
        assert(!control("/synthetic/recordings"));
        assert.strictEqual(writes.length, 1, "Leaving a delayed location lookup never schedules");
        console.log("DVR storage actual UI: explicit default, invalid/duplicate/over-limit locations and stale Back passed");
    } finally { dom.window.close(); }
}
run().catch(function (error) { console.error(error.stack || error); process.exitCode = 1; });
