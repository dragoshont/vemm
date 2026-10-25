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
async function run() {
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
