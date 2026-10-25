"use strict";
// Independently authored protocol fixtures, compared with public Plex Web 4.163.0 observations.
// No proprietary implementation, live account, server or household viewing state is used.
var assert = require("assert");
var api = require("../../samsung/Vemm/js/plex-api.js");
var playback = require("../../samsung/Vemm/js/playback.js");
var skip = require("../../samsung/Vemm/js/skip-markers.js");
var calls = [];
var item = { ratingKey: "100", type: "episode", duration: 90000,
    Marker: [
        { id: 1, type: "credits", startTimeOffset: 80000, endTimeOffset: 90000, final: true },
        { id: 1, type: "intro", startTimeOffset: 10000, endTimeOffset: 20000 }
    ],
    Media: [{ container: "mp4", videoCodec: "h264", audioCodec: "aac", height: 1080, width: 1920,
        Part: [{ id: "200", key: "/library/parts/200/file.mp4", Stream: [{ streamType: 1, codec: "h264" }] }] }]
};
var client = api.createClient({
    baseUrl: "https://pms.synthetic.invalid", token: "synthetic-only-token", location: "wan",
    fetch: function (target, options) {
        var url = new URL(target);
        calls.push({ url: url, options: options });
        assert.strictEqual(url.origin, "https://pms.synthetic.invalid");
        assert.strictEqual(options.headers["X-Plex-Token"], "synthetic-only-token");
        assert(!url.searchParams.has("X-Plex-Token"));
        assert.strictEqual(options.redirect, "error");
        var container;
        if (url.pathname === "/library/metadata/100") {
            assert.strictEqual(url.searchParams.get("includeMarkers"), "1");
            assert.strictEqual(url.searchParams.get("includeChapters"), "1");
            assert.strictEqual(url.searchParams.get("includeOnDeck"), "1");
            container = { Metadata: [item] };
        } else if (url.pathname === "/playQueues") {
            assert.strictEqual(options.method, "POST");
            container = { playQueueID: "9007199254740993", playQueueSelectedItemID: "9007199254740995",
                playQueueVersion: 3, Metadata: [
                    { ratingKey: "100", playQueueItemID: "9007199254740994" },
                    { ratingKey: "100", playQueueItemID: "9007199254740995" },
                    { ratingKey: "101", playQueueItemID: "9007199254740996" }
                ] };
        } else if (url.pathname === "/:/timeline") {
            assert.strictEqual(url.searchParams.get("playQueueID"), "9007199254740993");
            assert.strictEqual(url.searchParams.get("playQueueItemID"), "9007199254740995");
            return Promise.resolve({ ok: true, status: 204 });
        } else { assert.fail("Unexpected fixture route: " + url.pathname); }
        return Promise.resolve({ ok: true, status: 200, json: function () {
            return Promise.resolve({ MediaContainer: container });
        } });
    }
});
async function run() {
    var metadata = await client.getMetadata("100");
    assert.strictEqual(skip.markerAt(metadata.Marker, 10000).type, "intro", "Unsorted markers keep millisecond boundaries");
    assert.strictEqual(skip.markerAt(metadata.Marker, 20000), null);
    assert.strictEqual(skip.prompt(skip.markerAt(metadata.Marker, 90000)).action, "finish");
    var queue = await client.createVideoPlayQueue("synthetic-server", "100");
    assert.strictEqual(queue.itemId, "9007199254740995", "Queue identity is a string, not a library key or JS number");
    await client.timeline(metadata, 15000, "playing", "synthetic-session", queue);
    var fixed = playback.plan(item, { quality: "1080", location: client.location });
    assert.strictEqual(fixed.query.autoAdjustQuality, undefined, "Observed Web default is opt-out, not unconditional ABR");
    var adaptive = playback.plan(item, { quality: "720", location: client.location, adaptiveQuality: true });
    assert.strictEqual(adaptive.query.autoAdjustQuality, 1);
    assert.strictEqual(adaptive.query.location, "wan");
    assert.strictEqual(adaptive.query.videoBitrate, 4000, "Auto retains a truthful quality ceiling");
    var forced = playback.plan(item, { directPlay: "force", quality: "original", adaptiveQuality: true,
        profile: { containers: ["mp4"], video: ["h264"], audio: ["aac"] } });
    assert.strictEqual(forced.query.autoAdjustQuality, undefined, "Force must not request ABR conversion");
    assert.strictEqual(calls.length, 3);
    console.log("Tizen Plex Web comparison: marker inclusion, string queue identity and opt-in ABR contracts passed");
}
run().catch(function (error) { console.error(error.stack || error); process.exitCode = 1; });
