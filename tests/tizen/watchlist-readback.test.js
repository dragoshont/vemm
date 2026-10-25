"use strict";
var assert = require("assert");
var plex = require("../../samsung/Vemm/js/plex-api.js");
var guid = "plex://movie/5d776b59ad5437001f79c6f8";
function rig(rows, mutate, options) {
    options = options || {};
    var calls = [];
    var completeWrite;
    var client = plex.createAccountClient({
        token: "synthetic-watchlist-token",
        fetch: function (target, request) {
            var url = new URL(target);
            calls.push([request.method, url.pathname, url.searchParams.get("X-Plex-Container-Start")]);
            assert.strictEqual(request.headers["X-Plex-Token"], "synthetic-watchlist-token");
            assert.strictEqual(request.redirect, "error");
            if (request.method === "PUT") {
                if (options.holdWrite) {
                    return new Promise(function (resolve) { completeWrite = function () { resolve({ ok: true, status: 204 }); }; });
                }
                mutate(rows);
                return Promise.resolve({ ok: true, status: 204 });
            }
            assert.strictEqual(url.pathname, "/library/sections/watchlist/all");
            var start = Number(url.searchParams.get("X-Plex-Container-Start"));
            var body = options.malformed ? {} : { Metadata: rows.slice(start, start + 50), offset: start, totalSize: rows.length };
            return Promise.resolve({ ok: !options.denied, status: options.denied ? 403 : 200,
                json: function () { return Promise.resolve({ MediaContainer: body }); } });
        }
    });
    return { client: client, calls: calls, release: function () { completeWrite(); } };
}
function others(count) {
    return Array.from({ length: count }, function (_, index) {
        return { guid: "plex://movie/" + index.toString(16).padStart(24, "0") };
    });
}
async function run() {
    var test = rig([], function () {});
    await assert.rejects(test.client.setWatchlist(guid, true), /not confirm/i,
        "HTTP success without the requested Watchlist membership must not look successful");
    assert.strictEqual(test.calls.filter(function (call) { return call[0] === "PUT"; }).length, 1);
    test = rig([{ guid: guid }], function () {});
    await assert.rejects(test.client.setWatchlist(guid, false), /not confirm/i);
    test = rig(others(68), function (rows) { rows.push({ guid: guid }); });
    await test.client.setWatchlist(guid, true);
    assert.deepStrictEqual(test.calls.filter(function (call) { return call[0] === "GET"; }).map(function (call) { return call[2]; }), ["0", "50"]);
    test = rig(others(68).concat({ guid: guid }), function (rows) { rows.pop(); });
    await test.client.setWatchlist(guid, false);
    assert.strictEqual(test.calls.length, 3, "Removal is confirmed only after reading every bounded page");
    test = rig(others(250), function () {});
    await assert.rejects(test.client.setWatchlist(guid, false), /not confirm/i,
        "The bounded verification limit must be inconclusive, never proof of absence");
    assert.strictEqual(test.calls.filter(function (call) { return call[0] === "GET"; }).length, 4);
    test = rig([], function () {}, { malformed: true });
    await assert.rejects(test.client.setWatchlist(guid, false), /not confirm/i);
    test = rig([], function () {}, { denied: true });
    await assert.rejects(test.client.setWatchlist(guid, false), /HTTP 403/);
    test = rig([], function () {}, { holdWrite: true });
    var pending = test.client.setWatchlist(guid, true);
    await Promise.resolve(); await Promise.resolve();
    test.client.cancelRequests();
    test.release();
    await assert.rejects(pending, /cancelled/i);
    assert.strictEqual(test.calls.length, 1, "A late mutation response cannot read under a new view/profile scope");
    console.log("Tizen Watchlist mutation identity read-back, bounded paging, uncertainty and cancelled-scope contracts: passed");
}
run().catch(function (error) { console.error(error); process.exitCode = 1; });
