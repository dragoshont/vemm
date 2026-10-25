"use strict";
var assert = require("assert");
var api = require("../../samsung/Vemm/js/plex-api");
var queues = require("../../samsung/Vemm/js/queue");
var rows = Array.from({ length: 321 }, function (_, index) {
    return { type: "track", ratingKey: String(index % 11 + 1), playQueueItemID: "9007199254741" + String(index).padStart(3, "0") };
});
var calls = [];
var version = 1;
var shuffled = false;
var selected = 0;
var fail = false;
var defer = null;
var cleanupFailures = 0;
function projection(items) {
    return { playQueueID: "9007199254740993", playQueueSelectedItemID: rows[selected].playQueueItemID,
        playQueueSelectedItemOffset: selected, playQueueTotalCount: rows.length, playQueueVersion: version,
        playQueueShuffled: shuffled, Metadata: items || rows.slice(0, 50) };
}
var client = api.createClient({ baseUrl: "https://pms.synthetic.invalid", token: "synthetic-token",
    fetch: function (target, options) {
        var url = new URL(target);
        calls.push({ url: url, method: options.method });
        assert.strictEqual(options.redirect, "error");
        assert.strictEqual(options.headers["X-Plex-Token"], "synthetic-token");
        assert(!url.searchParams.has("X-Plex-Token"));
        if (fail) { fail = false; return Promise.reject(new Error("Synthetic outage")); }
        if (defer) { var hold = defer; defer = null; return new Promise(hold); }
        var result;
        if (url.pathname === "/playQueues") {
            assert.strictEqual(url.searchParams.get("type"), "audio");
            assert.strictEqual(url.searchParams.get("repeat"), "1", "PMS supplies wraparound windows; client owns repeat policy");
            result = projection();
        } else if (/\/(unshuffle|shuffle)$/.test(url.pathname)) {
            shuffled = !url.pathname.endsWith("/unshuffle"); version += 1;
            result = projection(rows.slice(Math.max(0, selected - 20), selected + 21));
        } else if (url.pathname.endsWith("/items")) {
            if (cleanupFailures) { cleanupFailures -= 1; return Promise.resolve({ ok: false, status: 503 }); }
            return Promise.resolve({ ok: true, status: 204 });
        } else {
            assert.strictEqual(options.method, "GET");
            assert.strictEqual(url.searchParams.get("window"), "50");
            var center = rows.findIndex(function (row) { return row.playQueueItemID === url.searchParams.get("center"); });
            assert(center >= 0, "Paging uses the string queue entry, not ratingKey");
            var after = url.searchParams.get("includeAfter") === "1";
            var page = [];
            for (var i = 1; i <= 50; i += 1) {
                page.push(rows[(center + (after ? i : -i) + rows.length) % rows.length]);
            }
            if (!after) { page.reverse(); }
            result = projection(page);
        }
        return Promise.resolve({ ok: true, status: 200, json: function () {
            return Promise.resolve({ MediaContainer: result });
        } });
    }
});
async function run() {
    var malformedCalls = [];
    var malformedContainer = { playQueueID: "77" };
    var malformedClient = api.createClient({ baseUrl: "https://pms.synthetic.invalid",
        fetch: function (target, options) {
            malformedCalls.push({ path: new URL(target).pathname, method: options.method });
            return Promise.resolve(options.method === "POST" ? {
                ok: true, status: 200, json: function () {
                    return Promise.resolve({ MediaContainer: malformedContainer });
                }
            } : { ok: false, status: 503 });
        }
    });
    await assert.rejects(malformedClient.createMusicPlayQueue("synthetic-server", "30", false), function (error) {
        assert.strictEqual(error.musicQueueCleanupId, "77", "Malformed projection cleanup failure must retain the known owner");
        return /503/.test(error.message);
    });
    assert.deepStrictEqual(malformedCalls, [
        { path: "/playQueues", method: "POST" }, { path: "/playQueues/77/items", method: "DELETE" }
    ], "A malformed creation is not automatically replayed");
    for (var field of ["playQueueVersion", "playQueueSelectedItemOffset", "playQueueShuffled"]) {
        malformedContainer = projection();
        malformedContainer.playQueueID = "77";
        delete malformedContainer[field];
        await assert.rejects(malformedClient.createMusicPlayQueue("synthetic-server", "30", false), function (error) {
            return error.musicQueueCleanupId === "77" && /503/.test(error.message);
        }, "Required revision/offset/shuffle fields must remain strict when preserving cleanup ownership");
    }
    var queue = queues.createServer(client, await client.createMusicPlayQueue("synthetic-server", "30", false));
    for (var i = 1; i <= 320; i += 1) {
        var next = await queue.peek(1, false);
        queue.select(next);
        selected = i;
        assert.strictEqual(queue.current().playQueueItemID, rows[i].playQueueItemID);
        assert(queue.items().length <= 200, "Long queues retain only a bounded page");
    }
    assert.strictEqual(await queue.peek(1, false), null);
    queue.repeat("one");
    assert.strictEqual((await queue.peek(1, true)).item, queue.current());
    assert.strictEqual(await queue.peek(1, false), null, "Manual next ignores repeat-one");
    queue.repeat("all");
    queue.select(await queue.peek(1, false)); selected = 0;
    assert.strictEqual(queue.position(), 0);
    queue.select(await queue.peek(-1, false)); selected = 320;
    assert.strictEqual(queue.position(), 320);
    assert.strictEqual(await queue.shuffle(true), true);
    assert.strictEqual(queue.snapshot().version, 2);
    assert.strictEqual(await queue.shuffle(false), false);
    assert.strictEqual(queue.snapshot().version, 3);
    var original = queue.current();
    fail = true;
    await assert.rejects(queue.peek(-1), /unreachable/);
    assert.strictEqual(queue.current(), original, "Failed paging cannot advance selection");
    var candidate = await queue.peek(-1);
    queue.cancel();
    assert.throws(function () { queue.select(candidate); }, /out of date/);
    version += 1;
    await assert.rejects(queue.peek(-1), /changed on Plex/);
    version -= 1;
    var complete;
    defer = function (resolve) { complete = resolve; };
    var pending = queue.peek(-1);
    for (var tick = 0; tick < 10 && !complete; tick += 1) { await Promise.resolve(); }
    assert(complete);
    queue.cancel();
    await assert.rejects(pending, /cancelled/);
    complete({ ok: true, status: 200, json: function () { return Promise.resolve({ MediaContainer: projection() }); } });
    cleanupFailures = 1;
    await assert.rejects(queue.close(), /503/);
    await queue.close();
    await queue.close();
    assert.strictEqual(calls.filter(function (call) { return call.method === "DELETE"; }).length, 2,
        "Cleanup is retryable after a failure and idempotent after success");
    assert.throws(function () { queue.peek(1); }, /closed/);
    assert.throws(function () { client.getMusicPlayQueue(9007199254740992, "1", 1); }, /identifier/);
    var completeOther;
    defer = function (resolve) { completeOther = resolve; };
    var otherRead = client.getMusicPlayQueue("77", rows[0].playQueueItemID, 1);
    for (tick = 0; tick < 10 && !completeOther; tick += 1) { await Promise.resolve(); }
    assert(completeOther);
    client.cancelMusicQueueRequests("9007199254740993");
    var otherProjection = projection();
    otherProjection.playQueueID = "77";
    completeOther({ ok: true, status: 200, json: function () {
        return Promise.resolve({ MediaContainer: otherProjection });
    } });
    assert.strictEqual((await otherRead).id, "77", "Retiring another queue must not cancel this queue's page");
    var finishShuffle;
    var events = [];
    var mutationQueue = queues.createServer({
        shuffleMusicPlayQueue: function () {
            return new Promise(function (resolve) { finishShuffle = resolve; });
        },
        cancelMusicQueueRequests: function () { events.push("cancel"); },
        clearMusicPlayQueue: function () { events.push("clear"); return Promise.resolve(); }
    }, { id: "81", itemId: rows[0].playQueueItemID, version: 1, offset: 0, total: rows.length,
        shuffled: false, items: [rows[0]] });
    var shuffle = mutationQueue.shuffle(true);
    var closing = mutationQueue.close();
    assert.deepStrictEqual(events, ["cancel"], "A pending mutation must finish before clear");
    finishShuffle({ id: "81", itemId: rows[0].playQueueItemID, version: 2, offset: 0, total: rows.length,
        shuffled: true, items: [rows[0]] });
    await assert.rejects(shuffle, /cancelled/);
    await closing;
    assert.deepStrictEqual(events, ["cancel", "clear"]);
    console.log("Tizen server music queue: 321 entries, string IDs, version/order, repeat/shuffle, bounded paging, cancellation and cleanup passed");
}
run().catch(function (error) { console.error(error.stack || error); process.exitCode = 1; });
