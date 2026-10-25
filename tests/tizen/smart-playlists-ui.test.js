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
    var content = "server://source-server/com.plexapp.plugins.library/library/sections/1/all?type=1&year%3E=1990";
    var calls = [];
    var unchanged = false;
    var hold = false;
    var release;
    function playlist() {
        return { ratingKey: "7", type: "playlist", playlistType: "video", smart: "1",
            title: "Synthetic smart playlist", content: content };
    }
    function response(container) {
        return { ok: true, status: 200, json: function () { return Promise.resolve({ MediaContainer: container }); } };
    }
    w.TextDecoder = TextDecoder;
    w.fetch = function (target, request) {
        var url = new URL(target);
        assert.strictEqual(url.origin, "https://pms.synthetic.invalid");
        calls.push({ path: url.pathname, method: request.method });
        if (request.method === "PUT") {
            assert.strictEqual(url.pathname, "/playlists/7/items");
            if (!unchanged) { content = url.searchParams.get("uri"); }
            return Promise.resolve({ ok: true, status: 204 });
        }
        if (url.pathname === "/identity") {
            if (hold) {
                return new Promise(function (resolve) { release = function () { resolve(response({ machineIdentifier: "source-server" })); }; });
            }
            return Promise.resolve(response({ machineIdentifier: "source-server" }));
        }
        if (url.pathname === "/library/sections/1/all") {
            return Promise.resolve(response({ Meta: {
                Type: [{ type: "movie", Field: [{ key: "year", type: "integer", title: "Year" },
                    { key: "title", type: "string", title: "Title" }],
                Sort: [{ key: "titleSort", title: "Title" }, { key: "addedAt", title: "Date added" }] }],
                FieldType: [{ type: "integer", Operator: [{ key: ">=", title: "is greater than" }, { key: "=", title: "is" }] },
                    { type: "string", Operator: [{ key: "=", title: "contains" }] }]
            } }));
        }
        assert.strictEqual(url.pathname, "/playlists/7");
        return Promise.resolve(response({ Metadata: [playlist()] }));
    };
    for (var script of w.document.querySelectorAll("script[src]")) {
        var name = script.getAttribute("src");
        if (name !== "main.js" && name.indexOf("$WEBAPIS") < 0) { w.eval(fs.readFileSync(path.join(root, name), "utf8")); }
    }
    w.__client = w.PlexApi.createClient({ baseUrl: "https://pms.synthetic.invalid", token: "synthetic-token", fetch: w.fetch });
    w.__playlist = playlist();
    var source = fs.readFileSync(path.join(root, "main.js"), "utf8");
    var boundary = source.lastIndexOf('    addConnectForm("");');
    w.eval(source.slice(0, boundary) +
        '    currentClient = { cancelRequests: function () {} }; currentServerId = "different-primary"; renderDetail(window.__playlist, window.__client); }());');
    function control(label) {
        return Array.from(w.document.querySelectorAll("button")).find(function (node) { return node.textContent.trim() === label; });
    }
    function press(label) {
        var node = control(label);
        assert(node, "Missing smart-rule control: " + label + "; " + w.document.querySelector(".screen").textContent);
        assert(!node.closest("[hidden]"), "Smart-rule controls must be visible");
        node.focus();
        w.document.dispatchEvent(new w.KeyboardEvent("keydown", { keyCode: 13, bubbles: true }));
        w.document.dispatchEvent(new w.KeyboardEvent("keyup", { keyCode: 13, bubbles: true }));
    }
    async function settle() {
        for (var i = 0; i < 8; i += 1) { await new Promise(function (resolve) { setTimeout(resolve, 0); }); }
    }
    function writes() { return calls.filter(function (call) { return call.method !== "GET"; }).length; }
    try {
        press("More"); press("Edit smart rules"); await settle();
        assert(control("Year is greater than 1990"), "Existing content rules, not artwork, are shown");
        assert(!control("Remove from playlist"), "Smart rules never use manual-entry deletion");
        press("Year is greater than 1990"); press("Year"); press("is greater than");
        var input = w.document.querySelector("input");
        assert(input.labels.length === 1, "The remote value input is explicitly labelled");
        input.value = "invalid"; press("Use condition"); await settle();
        assert.strictEqual(writes(), 0);
        assert(w.document.getElementById("status").textContent.includes("safely"));
        input.value = "2000"; press("Use condition"); await settle();
        assert(control("Year is greater than 2000"));
        press("Add condition"); press("Title"); press("contains");
        w.document.querySelector("input").value = "Synthetic & title";
        press("Use condition"); await settle();
        press("Match all conditions");
        assert(control("Match any condition"));
        press("Add condition group"); press("Add condition"); press("Year"); press("is");
        w.document.querySelector("input").value = "2020";
        press("Use condition"); await settle();
        press("Back"); await settle();
        assert(control("Edit group 3"));
        press("Edit group 3"); press("Add condition"); press("Title"); press("contains");
        w.document.querySelector("input").value = "Nested title";
        press("Use condition"); await settle();
        press("Match all conditions"); press("Back"); await settle();
        press("Sort"); press("Title / Descending"); press("Back"); await settle();
        press("Result limit");
        w.document.querySelector("input").value = "25";
        press("Use limit"); await settle();
        press("Review rule changes"); await settle();
        assert(w.document.querySelector(".page-title").textContent.includes("Synthetic smart playlist"));
        assert(w.document.querySelector(".screen").textContent.includes("Synthetic & title"));
        assert.strictEqual(writes(), 0);
        press("Cancel"); await settle();
        assert.strictEqual(w.document.activeElement.textContent, "Review rule changes");
        assert(control("Year is greater than 2000") && control("Match any condition"), "Cancel preserves the complete draft");
        press("Review rule changes"); press("Confirm"); press("Confirm"); await settle();
        assert.strictEqual(writes(), 1);
        assert(w.document.getElementById("status").textContent.includes("accepted"));
        var rules = w.VemmSmartPlaylists.parse(content, "source-server");
        assert.strictEqual(rules.root.match, "or");
        assert.strictEqual(rules.root.rules[1].value, "Synthetic & title");
        assert.strictEqual(rules.root.rules[2].match, "or");
        assert.strictEqual(rules.root.rules[2].rules[1].value, "Nested title");
        assert.strictEqual(rules.sort[0], "titleSort:desc");
        assert.strictEqual(rules.limit, "25");
        press("Refresh"); await settle();
        press("More"); press("Edit smart rules"); await settle();
        press("Add condition"); press("Title"); press("contains");
        w.document.querySelector("input").value = "Another title"; press("Use condition"); await settle();
        unchanged = true;
        press("Review rule changes"); press("Confirm"); await settle();
        assert.strictEqual(writes(), 2);
        assert(w.document.getElementById("status").textContent.includes("did not confirm"));
        assert(control("Confirm").disabled, "Uncertain writes cannot be replayed");
        press("Cancel"); await settle();
        hold = true;
        press("Review rule changes"); press("Confirm");
        while (!release) { await new Promise(function (resolve) { setTimeout(resolve, 0); }); }
        w.document.dispatchEvent(new w.KeyboardEvent("keydown", { keyCode: 10009, bubbles: true }));
        w.document.dispatchEvent(new w.KeyboardEvent("keyup", { keyCode: 10009, bubbles: true }));
        release(); await settle();
        assert.strictEqual(writes(), 2, "Leaving a secondary-client preflight cannot later send the write");
        assert(control("Review rule changes"));
    } finally { dom.window.close(); }
    console.log("Smart playlist actual UI: advertised remote forms, draft/Cancel/focus, encoded rules, no replay and secondary-client cancellation passed");
}
run().catch(function (error) { console.error(error.stack || error); process.exitCode = 1; });
