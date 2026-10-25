"use strict";
var assert = require("assert");
var createClient = require("../../samsung/Vemm/js/plex-api").createClient;

function fixture(options) {
    options = options || {};
    var rows = Array.from({ length: options.count === undefined ? 105 : options.count }, function (_, i) {
        return { playlistItemID: String(9000 + i), ratingKey: String(i % 3 + 1), type: "episode" };
    });
    var calls = [];
    var release;
    function response(container) {
        return { ok: true, status: 200, json: function () { return Promise.resolve({ MediaContainer: container }); } };
    }
    var client = createClient({ baseUrl: "https://pms.synthetic.invalid", token: "synthetic-only-token",
        fetch: function (target, request) {
            var url = new URL(target);
            assert.strictEqual(url.origin, "https://pms.synthetic.invalid");
            assert.strictEqual(request.headers["X-Plex-Token"], "synthetic-only-token");
            assert.strictEqual(request.redirect, "error");
            assert(!url.searchParams.has("X-Plex-Token"));
            calls.push({ path: url.pathname, method: request.method });
            if (url.pathname === "/identity") {
                return Promise.resolve(response({ machineIdentifier: options.wrongIdentity ? 123 : "actual-selected-server" }));
            }
            if (url.pathname === "/library/metadata/2") {
                return Promise.resolve(response({ Metadata: [{ ratingKey: "2", type: options.wrongType ? "track" : "episode" }] }));
            }
            if (url.pathname === "/playlists/7") {
                return Promise.resolve(response({ Metadata: [{ ratingKey: "7", type: "playlist",
                    playlistType: "video", smart: options.smart || "0" }] }));
            }
            if (request.method !== "GET") {
                if (options.denied) { return Promise.resolve({ ok: false, status: 403 }); }
                if (request.method === "PUT") {
                    assert.strictEqual(url.pathname, "/playlists/7/items");
                    assert.strictEqual(url.searchParams.get("uri"),
                        "server://actual-selected-server/com.plexapp.plugins.library/library/metadata/2");
                    if (!options.unchanged) {
                        rows.push({ playlistItemID: "100000", ratingKey: options.wrongAppend ? "3" : "2", type: "episode" });
                    }
                } else {
                    assert.strictEqual(request.method, "DELETE");
                    assert.strictEqual(url.pathname, "/playlists/7/items/9001");
                    if (!options.unchanged) { rows.splice(1, 1); }
                    if (options.concurrent) { rows.reverse(); }
                }
                if (options.holdWrite) {
                    return new Promise(function (resolve) { release = function () { resolve({ ok: true, status: 204 }); }; });
                }
                return Promise.resolve({ ok: true, status: 204 });
            }
            assert.strictEqual(url.pathname, "/playlists/7/items");
            var start = Number(url.searchParams.get("X-Plex-Container-Start"));
            if (options.onPage) { options.onPage(start); }
            assert.strictEqual(url.searchParams.get("X-Plex-Container-Size"), "50");
            var page = { offset: start, totalSize: rows.length, Metadata: rows.slice(start, start + 50) };
            if (!rows.length) { page = { size: 0 }; }
            if (options.duplicate && start === 50) { page.Metadata[0] = rows[0]; }
            if (options.incomplete && start === 50) { page.Metadata = []; }
            if (options.hold && !release) {
                return new Promise(function (resolve) { release = function () { resolve(response(page)); }; });
            }
            return Promise.resolve(response(page));
        } });
    return { client: client, rows: rows, calls: calls, release: function () { release(); },
        mutations: function () { return calls.filter(function (call) { return call.method !== "GET"; }); } };
}

async function run() {
    var add = fixture();
    await add.client.addVideoPlaylistItem("7", "2");
    assert.strictEqual(add.rows.length, 106);
    assert.strictEqual(add.mutations().length, 1);
    assert(add.calls.filter(function (call) { return call.path.endsWith("/items") && call.method === "GET"; }).length >= 6,
        "Read-back examines all pages, not only the first matching duplicate library key");
    var remove = fixture();
    await remove.client.removeVideoPlaylistItem("7", "9001", "2");
    assert.strictEqual(remove.rows.length, 104);
    assert(remove.rows.some(function (row) { return row.ratingKey === "2"; }), "Other duplicate media entries remain");
    assert(!remove.rows.some(function (row) { return row.playlistItemID === "9001"; }));
    assert.strictEqual(remove.mutations().length, 1);
    var empty = fixture({ count: 0 });
    await empty.client.addVideoPlaylistItem("7", "2");
    assert.strictEqual(empty.rows.length, 1, "An explicitly empty PMS container can receive its first item");
    var maximum = fixture({ count: 1000 });
    await maximum.client.removeVideoPlaylistItem("7", "9001", "2");
    assert.strictEqual(maximum.rows.length, 999, "The documented verification ceiling is inclusive");
    var full = fixture({ count: 1000 });
    await assert.rejects(full.client.addVideoPlaylistItem("7", "2"), /1000/);
    assert.strictEqual(full.mutations().length, 0);
    for (var mode of ["unchanged", "wrongAppend", "wrongType", "wrongIdentity", "denied"]) {
        var settings = {}; settings[mode] = true;
        var bad = fixture(settings);
        await assert.rejects(bad.client.addVideoPlaylistItem("7", "2"));
        assert.strictEqual(bad.mutations().length, ["wrongType", "wrongIdentity"].includes(mode) ? 0 : 1);
    }
    for (var removalMode of ["unchanged", "concurrent"]) {
        var removalOptions = {}; removalOptions[removalMode] = true;
        var uncertain = fixture(removalOptions);
        await assert.rejects(uncertain.client.removeVideoPlaylistItem("7", "9001", "2"), /confirm|changed/i);
        assert.strictEqual(uncertain.mutations().length, 1, "Uncertain success never replays the write");
    }
    for (var preflight of [{ smart: "1" }, { count: 1001 }, { duplicate: true }, { incomplete: true }]) {
        var blocked = fixture(preflight);
        await assert.rejects(blocked.client.removeVideoPlaylistItem("7", "9001", "2"));
        assert.strictEqual(blocked.mutations().length, 0);
    }
    var stale = fixture();
    await assert.rejects(stale.client.removeVideoPlaylistItem("7", "9001", "2", {
        offset: 0, totalSize: 105, Metadata: [{ playlistItemID: "9001", ratingKey: "2" }]
    }), /changed/i);
    assert.strictEqual(stale.mutations().length, 0);
    var now = Date.now;
    var clock = now();
    Date.now = function () { return clock; };
    try {
        var expired = fixture({ onPage: function () { clock += 60001; } });
        await assert.rejects(expired.client.addVideoPlaylistItem("7", "2"), /timed out/i);
        assert.strictEqual(expired.mutations().length, 0, "The phase deadline prevents any later mutation");
    } finally { Date.now = now; }
    var cancelled = fixture({ hold: true });
    var pending = cancelled.client.addVideoPlaylistItem("7", "2");
    while (!cancelled.calls.some(function (call) { return call.path === "/playlists/7/items"; })) {
        await new Promise(function (resolve) { setTimeout(resolve, 0); });
    }
    await assert.rejects(cancelled.client.addVideoPlaylistItem("7", "2"), /previous|finish/i);
    await assert.rejects(cancelled.client.moveVideoPlaylistItem("7", "9001"), /previous|finish/i);
    cancelled.client.cancelRequests();
    cancelled.release();
    await assert.rejects(pending, /cancel/i);
    assert.strictEqual(cancelled.mutations().length, 0);
    var inFlight = fixture({ holdWrite: true });
    var sent = inFlight.client.addVideoPlaylistItem("7", "2");
    while (!inFlight.mutations().length) { await new Promise(function (resolve) { setTimeout(resolve, 0); }); }
    inFlight.client.cancelRequests();
    await assert.rejects(inFlight.client.addVideoPlaylistItem("7", "2"), /previous|finish/i);
    inFlight.release();
    await assert.rejects(sent, /cancel/i);
    assert.strictEqual(inFlight.mutations().length, 1, "Cancellation cannot undo or replay an already-sent write");
    console.log("Saved video playlist edits: exact duplicate entry, complete read-back, limits, failures and cancellation passed");
}
run().catch(function (error) { console.error(error.stack || error); process.exitCode = 1; });
