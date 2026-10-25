"use strict";
var assert = require("assert");
var fs = require("fs");
var path = require("path");
var JSDOM = require("jsdom").JSDOM;
var app = path.resolve(__dirname, "../../samsung/Vemm");

async function check(type, action, readback, expected) {
    var dom = new JSDOM(fs.readFileSync(path.join(app, "index.html"), "utf8"), {
        url: "https://app.synthetic.invalid", runScripts: "outside-only"
    });
    var window = dom.window;
    var writes = 0;
    window.fetch = function () { assert.fail("Watch-state fixtures never use the network"); };
    window.__client = {
        setWatched: function (id, watched) {
            assert.strictEqual(id, "100");
            assert.strictEqual(watched, action === "watched");
            writes += 1;
            return Promise.resolve();
        },
        getMetadata: function () {
            return Promise.resolve(Object.assign({ ratingKey: "100", type: type, title: "Synthetic", leafCount: 3 }, readback));
        }
    };
    var source = fs.readFileSync(path.join(app, "main.js"), "utf8");
    source = source.slice(0, source.lastIndexOf('    addConnectForm("");')) +
        '    confirmWatchAction({ratingKey:"100", title:"Synthetic", type:' + JSON.stringify(type) +
        '}, window.__client, ' + JSON.stringify(action) + '); }());';
    window.eval(source);
    try {
        var confirm = window.document.querySelector(".screen-confirmation button") ||
            window.document.getElementById("screen").querySelector("button");
        confirm.focus();
        window.document.dispatchEvent(new window.KeyboardEvent("keydown", { keyCode: 13, bubbles: true }));
        window.document.dispatchEvent(new window.KeyboardEvent("keydown", { keyCode: 13, repeat: true, bubbles: true }));
        for (var i = 0; i < 40; i += 1) { await Promise.resolve(); }
        assert.strictEqual(writes, 1, "Repeated OK cannot duplicate the profile mutation");
        var status = window.document.getElementById("status");
        assert.strictEqual(status.classList.contains("status-error"), !expected,
            type + " " + action + ": " + status.textContent);
        if (!expected) {
            assert(/not yet confirmed/.test(status.textContent),
                "An unchanged read-back must explicitly withhold success: " + status.textContent);
        }
    } finally { window.close(); }
}
async function returnToRetainedView(kind, watched) {
    var dom = new JSDOM(fs.readFileSync(path.join(app, "index.html"), "utf8"), {
        url: "https://app.synthetic.invalid", runScripts: "outside-only"
    });
    var window = dom.window;
    var document = window.document;
    var saved = false;
    var reads = [];
    var item = { ratingKey: "100", type: "movie", title: "Synthetic",
        viewCount: watched ? 0 : 1, viewOffset: watched ? 5000 : 0, duration: 100000 };
    function metadata() {
        return Object.assign({}, item, saved ? { viewCount: watched ? 1 : 0, viewOffset: 0 } : {});
    }
    function page(offset) {
        reads.push(offset);
        return Promise.resolve({ Metadata: [metadata()], items: [metadata()], offset: offset, totalSize: 101 });
    }
    window.fetch = function () { assert.fail("Retained-view watch fixtures never use the network"); };
    window.__client = {
        cancelRequests: function () {},
        getMetadata: function () { return Promise.resolve(metadata()); },
        setWatched: function (id, value) {
            assert.strictEqual(id, "100");
            assert.strictEqual(value, watched);
            saved = true;
            return Promise.resolve();
        },
        getSectionItems: function (id, offset, count, filters) {
            assert.strictEqual(id, "1");
            assert.strictEqual(count, 50);
            assert.strictEqual(filters.sort, "titleSort:asc");
            return page(offset);
        }
    };
    window.__item = item;
    window.__loader = page;
    ["js/preferences.js", "js/i18n.js"].forEach(function (file) {
        window.eval(fs.readFileSync(path.join(app, file), "utf8"));
    });
    var source = fs.readFileSync(path.join(app, "main.js"), "utf8");
    var boot = kind === "library" ?
        'homeSections = [{key:"1",type:"movie",title:"Movies"}];' +
        'openSection(homeSections[0], {items:[window.__item],offset:101,filters:{sort:"titleSort:asc"}});' :
        'openListing("Synthetic collection", window.__loader, currentClient, 100, [],' +
        '{Metadata:[window.__item],offset:100,totalSize:101});';
    source = source.slice(0, source.lastIndexOf('    addConnectForm("");')) +
        'currentClient = window.__client; currentServerId = "synthetic-server"; ' + boot + '}());';
    window.eval(source);
    function key(code) {
        document.dispatchEvent(new window.KeyboardEvent("keydown", { keyCode: code, bubbles: true }));
        document.dispatchEvent(new window.KeyboardEvent("keyup", { keyCode: code, bubbles: true }));
    }
    async function settle() { for (var i = 0; i < 60; i += 1) { await Promise.resolve(); } }
    function press(label) {
        var target = Array.from(document.querySelectorAll("button")).find(function (node) {
            return node.textContent === label && !node.closest("[hidden]");
        });
        assert(target, "Missing remote watch control: " + label + " / " + document.getElementById("screen").textContent +
            " / " + document.getElementById("status").textContent);
        for (var i = 0; i < 100 && document.activeElement !== target; i += 1) {
            var nodes = Array.from(document.querySelectorAll("button")).filter(function (node) {
                return !node.disabled && !node.closest("[hidden]");
            });
            key(nodes.indexOf(document.activeElement) > nodes.indexOf(target) ? 38 : 40);
        }
        assert.strictEqual(document.activeElement, target, "D-pad cannot reach " + label);
        key(13);
    }
    try {
        await settle();
        if (kind === "library") { key(40); }
        assert(document.activeElement.classList.contains("media-card"));
        key(13);
        await settle();
        press(watched ? "Mark watched" : "Mark unwatched");
        press(watched ? "Confirm mark watched" : "Confirm mark unwatched");
        await settle();
        assert(!document.getElementById("status").classList.contains("status-error"));
        key(10009);
        await settle();
        var card = document.querySelector(".media-card");
        assert(card, "Back restores the original retained browse view");
        assert.strictEqual(!!card.querySelector(".card-watched"), watched,
            "Confirmed watched state must refresh the retained " + kind + " card on Back");
        assert.strictEqual(card.querySelector(".card-progress"), null, "Confirmed cleared resume cannot remain on a retained card");
        assert.strictEqual(document.activeElement, card, "Back retains the media-card focus after reloading");
        assert.deepStrictEqual(reads, [100], "Reload preserves the original page cursor and does not repeat the mutation");
    } finally { window.close(); }
}
async function run() {
    for (var kind of ["library", "listing"]) {
        await returnToRetainedView(kind, true);
        await returnToRetainedView(kind, false);
    }
    await check("movie", "watched", { viewCount: 0 }, false);
    await check("movie", "watched", { viewCount: 1 }, true);
    await check("episode", "unwatched", { viewCount: 0, viewOffset: 5000 }, false);
    await check("episode", "unwatched", { viewCount: 0, viewOffset: 0 }, true);
    await check("show", "watched", { viewedLeafCount: 2 }, false);
    await check("show", "watched", { viewedLeafCount: 3 }, true);
    await check("season", "unwatched", { viewedLeafCount: 1 }, false);
    await check("season", "unwatched", { viewedLeafCount: 0 }, true);
    console.log("Tizen explicit watched-state write/read-back: passed (synthetic profile only)");
}
run().catch(function (error) { console.error(error.stack || error); process.exitCode = 1; });
