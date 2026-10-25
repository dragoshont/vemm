"use strict";
var assert = require("assert");
var television = require("../../samsung/Vemm/js/television");
var spec = require("../../docs/plex-openapi.json");

function fixture(options) {
    options = options || {};
    var rows = [{ key: "1", title: "Synthetic first" }, { key: "2", title: "Synthetic selected" }, { key: "3", title: "Synthetic last" }];
    var calls = [];
    var resolve;
    var client = { request: function (path, method, query) {
        method = method || "GET";
        calls.push({ path: path, method: method, query: query });
        if (method === "PUT") {
            assert.strictEqual(path, "/media/subscriptions/2/move");
            assert(!query || !Object.prototype.hasOwnProperty.call(query, "after"));
            if (options.denied) {
                var error = new Error("Synthetic forbidden"); error.status = 403;
                return Promise.reject(error);
            }
            if (!options.unchanged) { rows = [rows[1], rows[0], rows[2]]; }
            if (options.concurrent) { rows.pop(); }
            if (options.holdWrite) { return new Promise(function (done) { resolve = done; }); }
            return Promise.resolve({});
        }
        assert.strictEqual(path, "/media/subscriptions");
        if (options.onRead) { options.onRead(); }
        var result = { MediaSubscription: rows.slice() };
        if (options.partial) { result.totalSize = rows.length + 1; }
        if (options.duplicate) { result.MediaSubscription.push(rows[0]); }
        if (options.oversized) { result.MediaSubscription = Array.from({ length: 201 }, function (_, i) {
            return { key: String(i + 1), title: "Synthetic " + i };
        }); }
        if (options.hold) { options.hold = false; return new Promise(function (done) { resolve = function () { done(result); }; }); }
        return Promise.resolve(result);
    } };
    return { api: television.create(client), again: function () { return television.create(client); },
        calls: calls, release: function () { resolve({}); },
        writes: function () { return calls.filter(function (call) { return call.method === "PUT"; }); } };
}

async function run() {
    var selected = { key: "2", title: "Synthetic selected" };
    var ids = ["1", "2", "3"];
    var current = function () { return true; };
    var normal = fixture();
    await normal.api.prioritize(selected, ids, current);
    assert.strictEqual(normal.writes().length, 1);
    assert.strictEqual(normal.calls.filter(function (call) { return call.method === "GET"; }).length, 2);
    for (var mode of ["unchanged", "concurrent", "denied"]) {
        var options = {}; options[mode] = true;
        var bad = fixture(options);
        await assert.rejects(bad.api.prioritize(selected, ids, current));
        assert.strictEqual(bad.writes().length, 1, "Uncertain priority edits never replay");
    }
    for (var preflight of [{ duplicate: true }, { oversized: true }, { partial: true }]) {
        var invalid = fixture(preflight);
        await assert.rejects(invalid.api.prioritize(selected, ids, current));
        assert.strictEqual(invalid.writes().length, 0);
    }
    var stale = fixture();
    await assert.rejects(stale.api.prioritize(selected, ["1", "3", "2"], current), /changed/i);
    await assert.rejects(stale.api.prioritize({ key: "2", title: "Another recording" }, ids, current), /changed/i);
    assert.strictEqual(stale.writes().length, 0);
    var now = Date.now;
    var clock = now();
    Date.now = function () { return clock; };
    try {
        var expired = fixture({ onRead: function () { clock += 60001; } });
        await assert.rejects(expired.api.prioritize(selected, ids, current), /timed out/i);
        assert.strictEqual(expired.writes().length, 0);
    } finally { Date.now = now; }
    var active = true;
    var cancelled = fixture({ hold: true });
    var pending = cancelled.api.prioritize(selected, ids, function () { return active; });
    while (!cancelled.calls.length) { await Promise.resolve(); }
    active = false; cancelled.release();
    await assert.rejects(pending, /cancel/i);
    assert.strictEqual(cancelled.writes().length, 0);
    var inFlight = fixture({ holdWrite: true });
    active = true;
    var sent = inFlight.api.prioritize(selected, ids, function () { return active; });
    while (!inFlight.writes().length) { await Promise.resolve(); }
    await assert.rejects(inFlight.again().prioritize(selected, ids, current), /previous|finish/i);
    active = false; inFlight.release();
    await assert.rejects(sent, /cancel/i);
    assert.strictEqual(inFlight.calls.filter(function (call) { return call.method === "GET"; }).length, 1,
        "Leaving an already-sent change suppresses read-back but cannot undo it");
    assert(spec.paths["/media/subscriptions/{subscriptionId}/move"].put.description.includes("priority"));
    console.log("DVR priority: complete order, named preflight, read-back, errors, limits, cancellation and no replay passed");
}
run().catch(function (error) { console.error(error.stack || error); process.exitCode = 1; });
