"use strict";
var assert = require("assert");
var api = require("../../samsung/Vemm/js/plex-api");
var queues = require("../../samsung/Vemm/js/queue");
var rows = Array.from({ length: 321 }, function (_, index) {
    return { type: "episode", ratingKey: String(index % 7 + 1),
        playQueueItemID: "9007199254741" + String(index).padStart(3, "0") };
});
var version = 1;
var selected = 0;
var shuffled = false;
var calls = [];
var client = api.createClient({ baseUrl: "https://pms.synthetic.invalid", token: "synthetic-token",
    fetch: function (target, options) {
        var url = new URL(target);
        calls.push({ url: url, method: options.method });
        var items = rows.slice(0, 50);
        if (url.pathname === "/playQueues") {
            assert.strictEqual(url.searchParams.get("type"), "video");
        } else if (/\/(unshuffle|shuffle)$/.test(url.pathname)) {
            shuffled = url.pathname.endsWith("/shuffle");
            version += 1;
            items = [rows[selected]];
        } else if (options.method === "DELETE") {
            return Promise.resolve({ ok: true, status: 204 });
        } else {
            var center = rows.findIndex(function (row) { return row.playQueueItemID === url.searchParams.get("center"); });
            assert(center >= 0, "Paging is centered on the queue entry, not its duplicate library key");
            assert.strictEqual(url.searchParams.get("window"), "50");
            var direction = url.searchParams.get("includeAfter") === "1" ? 1 : -1;
            items = [];
            for (var i = 1; i <= 50; i += 1) { items.push(rows[(center + direction * i + rows.length) % rows.length]); }
            if (direction < 0) { items.reverse(); }
        }
        return Promise.resolve({ ok: true, status: 200, json: function () {
            return Promise.resolve({ MediaContainer: { playQueueID: "9007199254740993",
                playQueueSelectedItemID: rows[selected].playQueueItemID, playQueueSelectedItemOffset: selected,
                playQueueVersion: version, playQueueTotalCount: rows.length, playQueueShuffled: shuffled, Metadata: items } });
        } });
    }
});
async function run() {
    var projection = await client.createVideoPlayQueue("synthetic-server", "1");
    assert.strictEqual(projection.version, 1, "Video queues must retain PMS revision, count and selected offset");
    assert.strictEqual(projection.total, 321);
    assert.strictEqual(calls[0].url.searchParams.get("repeat"), "1");
    var queue = queues.createServer(client, projection, "video");
    for (var i = 1; i <= 320; i += 1) {
        queue.select(await queue.peek(1));
        selected = i;
        assert.strictEqual(queue.current().playQueueItemID, rows[i].playQueueItemID);
        assert(queue.items().length <= 200);
    }
    assert.strictEqual(await queue.peek(1), null);
    queue.repeat("all");
    queue.select(await queue.peek(1)); selected = 0;
    assert.strictEqual(queue.current().playQueueItemID, rows[0].playQueueItemID);
    queue.repeat("one");
    assert.strictEqual((await queue.peek(1, true)).item, queue.current());
    queue.select(await queue.peek(1, false)); selected = 1;
    await queue.shuffle(true);
    assert.strictEqual(queue.snapshot().version, 2);
    assert.strictEqual(queue.current().playQueueItemID, rows[1].playQueueItemID);
    version += 1;
    await assert.rejects(queue.peek(1), /changed on Plex/);
    version -= 1;
    var candidate = await queue.peek(1);
    queue.cancel();
    assert.throws(function () { queue.select(candidate); }, /out of date/);
    await queue.close();
    assert.strictEqual(calls.filter(function (call) { return call.method === "DELETE"; }).length, 1);
    console.log("Video server queue: string entry identity, 321 entries, revision, bounded pages, repeat/shuffle and cleanup passed");
}
run().catch(function (error) { console.error(error.stack || error); process.exitCode = 1; });
