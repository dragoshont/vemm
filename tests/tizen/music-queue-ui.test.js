"use strict";
var assert = require("assert");
var fs = require("fs");
var path = require("path");
var JSDOM = require("jsdom").JSDOM;
var app = path.resolve(__dirname, "../../samsung/Vemm");
var album = { ratingKey: "3000", type: "album", title: "Synthetic long album" };
var tracks = Array.from({ length: 241 }, function (_, index) {
    return { ratingKey: String(index + 1), type: "track", title: "Synthetic track " + (index + 1), duration: 180000,
        playQueueItemID: "9007199254741" + String(index).padStart(3, "0"),
        Media: [{ container: "flac", audioCodec: "flac", Part: [{ id: String(index + 1),
            key: "/library/parts/" + (index + 1) + "/file.flac", Stream: [{ streamType: 2, codec: "flac" }] }] }] };
});
async function run() {
    var dom = new JSDOM(fs.readFileSync(path.join(app, "index.html"), "utf8"), {
        url: "https://app.synthetic.invalid", runScripts: "outside-only", pretendToBeVisual: true
    });
    var window = dom.window;
    var calls = [];
    var state = "NONE";
    var opens = 0;
    var listener;
    var queues = {};
    var queueNumber = 0;
    var failCreate = true;
    var failMetadata = false;
    var metadataFault = null;
    var failClear = false;
    var delayCreate = false;
    var delayPage = false;
    var delayClear = false;
    var malformedProjection = false;
    var completeCreate;
    var completePage;
    var completeClear;
    function response(container) {
        return { ok: true, status: 200, json: function () { return Promise.resolve({ MediaContainer: container }); } };
    }
    function projection(queue, items) {
        return { playQueueID: queue.id, playQueueSelectedItemID: queue.order[queue.selected].playQueueItemID,
            playQueueSelectedItemOffset: queue.selected, playQueueTotalCount: queue.order.length,
            playQueueVersion: queue.version, playQueueShuffled: queue.shuffled, Metadata: items || queue.order.slice(0, 50) };
    }
    window.TextDecoder = TextDecoder;
    window.webapis = { avplay: {
        getState: function () { return state; }, open: function () { opens += 1; state = "IDLE"; },
        close: function () { state = "NONE"; }, stop: function () { state = "IDLE"; },
        setDisplayRect: function () {}, setDisplayMethod: function () {}, setListener: function (value) { listener = value; },
        prepareAsync: function (success) { state = "READY"; success(); }, getDuration: function () { return 180000; },
        getCurrentTime: function () { return 0; }, play: function () { state = "PLAYING"; },
        pause: function () { state = "PAUSED"; }, seekTo: function (_, success) { success(); }
    } };
    window.fetch = function (target, options) {
        var url = new URL(target);
        calls.push({ path: url.pathname, method: options.method, query: url.searchParams });
        var container;
        if (url.pathname === "/api/v2/home/users") {
            return Promise.resolve({ ok: true, status: 200, json: function () {
                return Promise.resolve({ users: [{ uuid: "synthetic-owner", title: "Synthetic owner", admin: true }] });
            } });
        }
        if (url.pathname === "/api/v2/resources") {
            return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve([{
                clientIdentifier: "synthetic-server", name: "Synthetic PMS", provides: "server", owned: true,
                accessToken: "synthetic-server-token", connections: [{ uri: "https://pms.synthetic.invalid" }]
            }]); } });
        }
        if (url.pathname === "/identity") { container = { machineIdentifier: "synthetic-server" }; }
        else if (url.pathname === "/library/sections") {
            container = { Directory: [{ key: "3", type: "artist", title: "Music" }] };
        } else if (url.pathname === "/hubs/promoted") { container = { Hub: [] }; }
        else if (url.pathname === "/library/sections/3/all") { container = { Metadata: [album], totalSize: 1 }; }
        else if (url.pathname === "/library/metadata/3000") { container = { Metadata: [album] }; }
        else if (/^\/library\/metadata\/\d+$/.test(url.pathname)) {
            if (failMetadata) { failMetadata = false; return Promise.resolve({ ok: false, status: 503 }); }
            var metadata = tracks[Number(url.pathname.split("/").pop()) - 1];
            if (metadataFault) {
                metadata = metadataFault(JSON.parse(JSON.stringify(metadata)));
                metadataFault = null;
            }
            container = { Metadata: [metadata] };
        } else if (url.pathname === "/playQueues") {
            assert.strictEqual(url.searchParams.get("type"), "audio");
            if (failCreate) { failCreate = false; return Promise.resolve({ ok: false, status: 503 }); }
            var id = "900719925474099" + (++queueNumber);
            var queue = { id: id, order: tracks.slice(), selected: 0, version: 1, shuffled: false };
            queues[id] = queue;
            container = projection(queue);
            if (malformedProjection) { delete container.playQueueVersion; malformedProjection = false; }
            if (delayCreate) {
                delayCreate = false;
                return new Promise(function (resolve) { completeCreate = function () { resolve(response(container)); }; });
            }
        } else if (url.pathname.indexOf("/playQueues/") === 0) {
            var parts = url.pathname.split("/");
            var active = queues[parts[2]];
            assert(active);
            if (parts[3] === "items") {
                if (failClear) { failClear = false; return Promise.resolve({ ok: false, status: 503 }); }
                if (delayClear) {
                    delayClear = false;
                    return new Promise(function (resolve) {
                        completeClear = function () { active.cleared = true; resolve({ ok: true, status: 204 }); };
                    });
                }
                active.cleared = true;
                return Promise.resolve({ ok: true, status: 204 });
            }
            if (parts[3] === "shuffle" || parts[3] === "unshuffle") {
                var playing = active.order[active.selected];
                active.shuffled = parts[3] === "shuffle";
                active.order = tracks.slice();
                if (active.shuffled) { active.order.reverse(); }
                active.selected = active.order.indexOf(playing);
                active.version += 1;
                container = projection(active, active.order.slice(Math.max(0, active.selected - 20), active.selected + 21));
            } else {
                assert.strictEqual(url.searchParams.get("window"), "50");
                var center = active.order.findIndex(function (row) { return row.playQueueItemID === url.searchParams.get("center"); });
                assert(center >= 0);
                var forward = url.searchParams.get("includeAfter") === "1";
                var page = [];
                for (var i = 1; i <= 50; i += 1) { page.push(active.order[(center + (forward ? i : -i) + 241) % 241]); }
                if (!forward) { page.reverse(); }
                container = projection(active, page);
                if (delayPage) {
                    delayPage = false;
                    return new Promise(function (resolve) { completePage = function () { resolve(response(container)); }; });
                }
            }
        } else if (url.pathname === "/:/timeline") {
            var timelineQueue = queues[url.searchParams.get("playQueueID")];
            assert(timelineQueue, "Every music timeline carries PMS queue identity");
            var itemId = url.searchParams.get("playQueueItemID");
            assert.strictEqual(typeof itemId, "string");
            timelineQueue.selected = timelineQueue.order.findIndex(function (row) { return row.playQueueItemID === itemId; });
            assert(timelineQueue.selected >= 0);
            container = {};
        } else if (url.pathname === "/music/:/transcode/universal/decision") { container = { generalDecisionCode: 1001 }; }
        else if (url.pathname === "/music/:/transcode/universal/stop") { container = {}; }
        else { return Promise.resolve({ ok: false, status: 404 }); }
        return Promise.resolve(response(container));
    };
    window.localStorage.setItem("vemm-tizen-account", JSON.stringify({
        version: 2, storage: "unencrypted", token: "synthetic-account-token"
    }));
    for (var script of window.document.querySelectorAll("script[src]")) {
        var src = script.getAttribute("src");
        if (src.indexOf("$WEBAPIS") !== 0) { window.eval(fs.readFileSync(path.join(app, src), "utf8")); }
    }
    async function settle() {
        await new Promise(function (resolve) { setTimeout(resolve, 0); });
        await new Promise(function (resolve) { setTimeout(resolve, 0); });
    }
    function press(label, scope) {
        var control = Array.from((scope || window.document).querySelectorAll("button")).find(function (node) {
            return node.textContent.trim() === label;
        });
        assert(control, "Missing music control " + label + ": " + window.document.querySelector(".screen").textContent);
        control.focus();
        window.document.dispatchEvent(new window.KeyboardEvent("keydown", { keyCode: 13, bubbles: true }));
        window.document.dispatchEvent(new window.KeyboardEvent("keyup", { keyCode: 13, bubbles: true }));
    }
    function title() { return window.document.querySelector(".player-hud h2").textContent; }
    async function next() { press("More"); press("Next track"); await settle(); }
    try {
        await settle(); press("Use linked account"); await settle(); press("Synthetic PMS (owned)"); await settle();
        press("Start watching"); await settle();
        press("Music"); await settle(); press(album.title); await settle();
        press("Play album"); await settle();
        assert(window.document.querySelector('#music-queue-panel[role="alertdialog"]'));
        assert.strictEqual(opens, 0, "Queue creation failure cannot silently fall back to a local queue");
        delayCreate = true;
        press("Retry playback"); await settle();
        press("Cancel", window.document.getElementById("music-queue-panel"));
        var beforeCancelledCreate = queueNumber;
        press("Play album"); await settle();
        assert.strictEqual(queueNumber, beforeCancelledCreate, "Cancel must not permit a second create before the first response arrives");
        delayClear = true;
        completeCreate(); await settle();
        press("Play album"); await settle();
        assert.strictEqual(queueNumber, beforeCancelledCreate, "Late cancelled creation must retire before a replacement is created");
        completeClear(); await settle();
        assert(queues["9007199254740991"].cleared, "Cancelled creation clears its eventual owned queue");
        assert.strictEqual(opens, 0, "Late queue creation cannot start playback");
        press("Cancel", window.document.getElementById("music-queue-panel"));
        press("Play album"); await settle();
        assert.strictEqual(title(), tracks[0].title);
        var badMetadata = [
            function (track) { track.ratingKey = "9000"; return track; },
            function (track) { track.type = "movie"; return track; },
            function (track) { delete track.Media; return track; },
            function (track) { track.Media[0].Part = []; return track; },
            function (track) { delete track.Media[0].Part[0].key; return track; },
            function (track) { track.Media[0].Part[0].Stream = [{ streamType: 1, codec: "h264" }]; return track; }
        ];
        press("Pause / Play"); await settle();
        for (var fault of badMetadata) {
            var beforeInvalid = calls.length;
            var beforeOpens = opens;
            metadataFault = fault;
            await next();
            assert.strictEqual(title(), tracks[0].title, "Invalid next metadata must preserve current item and queue selection");
            assert.strictEqual(state, "PAUSED", "Validation failure cannot discard pause intent");
            assert.strictEqual(opens, beforeOpens);
            assert(!calls.slice(beforeInvalid).some(function (call) {
                return call.path === "/music/:/transcode/universal/stop" ||
                    call.path === "/:/timeline" && call.query.get("state") === "stopped";
            }), "Reject wrong identity/type/unplayable metadata before stopping current audio");
            assert(window.document.querySelector('#music-queue-panel[role="alertdialog"]'));
            press("Cancel", window.document.getElementById("music-queue-panel"));
        }
        metadataFault = badMetadata[0];
        await next();
        press("Retry playback"); await settle();
        assert.strictEqual(title(), tracks[1].title, "Identity validation Retry must retry the same uncommitted next entry");
        assert.strictEqual(state, "PAUSED", "Successful validation Retry preserves the original pause intent");
        press("More"); press("Previous track"); await settle();
        assert.strictEqual(title(), tracks[0].title);
        press("Pause / Play"); await settle();
        failMetadata = true;
        await next();
        assert.strictEqual(title(), tracks[0].title, "Metadata outage preserves the current queue entry");
        assert.strictEqual(state, "PLAYING", "Do not stop the current audio before the next track is available");
        press("Retry playback"); await settle();
        assert.strictEqual(title(), tracks[1].title, "Retry repeats the failed transition, not the following track");
        delayPage = true;
        await next();
        window.document.activeElement.dispatchEvent(new window.KeyboardEvent("keydown", { keyCode: 10009, bubbles: true }));
        completePage(); await settle();
        assert.strictEqual(title(), tracks[1].title, "Cancelled page cannot replace current audio");
        for (var index = 2; index <= 201; index += 1) {
            await next();
            assert.strictEqual(title(), tracks[index].title, "Long album order at track " + (index + 1));
        }
        press("More"); press("Previous track"); await settle();
        assert.strictEqual(title(), tracks[200].title);
        press("More"); press("Shuffle / On or off"); await settle();
        assert.strictEqual(title(), tracks[200].title, "Server shuffle preserves the current entry");
        press("Shuffle / On or off"); await settle();
        press("Repeat / Off, one, all");
        listener.onstreamcompleted(); await settle();
        assert.strictEqual(title(), tracks[200].title, "Automatic repeat-one uses the same entry");
        await next();
        assert.strictEqual(title(), tracks[201].title, "Manual next bypasses repeat-one");
        press("Pause / Play"); await settle();
        await next();
        assert.strictEqual(title(), tracks[202].title);
        assert.strictEqual(state, "PAUSED", "Manual transition preserves pause intent");
        press("Pause / Play"); await settle();
        press("More"); press("Repeat / Off, one, all"); press("Shuffle / On or off");
        listener.onstreamcompleted(); await settle();
        assert.strictEqual(title(), tracks[201].title, "Completion during a shuffle request advances in the confirmed order");
        failClear = true;
        press("More"); press("Stop and return to details"); await settle();
        assert(window.document.querySelector('#music-queue-panel[role="alertdialog"]'), "Cleanup failure is visible and retryable");
        press("Retry playback"); await settle();
        assert(queues["9007199254740992"].cleared);
        assert(!calls.some(function (call) { return call.path === "/library/metadata/3000/children"; }),
            "Long albums must not load/truncate all children into the old 200-track local queue");
        assert(calls.filter(function (call) { return /^\/playQueues\/[^/]+$/.test(call.path); }).length >= 200);
        press("Play"); await settle();
        delayPage = true;
        await next();
        var beforeHide = opens;
        Object.defineProperty(window.document, "hidden", { configurable: true, value: true });
        window.document.dispatchEvent(new window.Event("visibilitychange"));
        completePage(); await settle();
        assert.strictEqual(opens, beforeHide, "A late page cannot start music after backgrounding");
        assert.strictEqual(state, "NONE");
        assert(queues["9007199254740993"].cleared, "Background stop clears the owned queue");
        Object.defineProperty(window.document, "hidden", { configurable: true, value: false });
        window.document.dispatchEvent(new window.Event("visibilitychange")); await settle();
        assert.strictEqual(opens, beforeHide, "Foreground recovery must not autoplay music");
        for (fault of badMetadata) {
            beforeOpens = opens;
            metadataFault = fault;
            press("Play"); await settle();
            assert.strictEqual(opens, beforeOpens, "Invalid initial metadata cannot open an AVPlay session");
            assert(queues["900719925474099" + queueNumber].cleared, "Invalid initial metadata retires its created queue");
            assert(window.document.querySelector('#music-queue-panel[role="alertdialog"]'));
            press("Cancel", window.document.getElementById("music-queue-panel"));
        }
        malformedProjection = true; failClear = true;
        press("Play"); await settle();
        var malformedId = "900719925474099" + queueNumber;
        assert(!queues[malformedId].cleared);
        assert(window.document.querySelector('#music-queue-panel[role="alertdialog"]'));
        var beforeRetirement = queueNumber;
        press("Cancel", window.document.getElementById("music-queue-panel"));
        press("Play"); await settle();
        assert.strictEqual(queueNumber, beforeRetirement, "Known malformed queue cleanup blocks replacement creation");
        assert(!queues[malformedId].cleared, "Blocked create must not silently retry the failed cleanup write");
        delayClear = true;
        press("Retry playback"); await settle();
        assert(completeClear, "Cleanup retry retains the original malformed queue owner");
        press("Play"); await settle();
        assert.strictEqual(queueNumber, beforeRetirement, "Pending retirement blocks new creates until the response drains");
        var beforeCleanupRetry = calls.filter(function (call) { return call.method === "DELETE"; }).length;
        press("Retry playback"); await settle();
        assert.strictEqual(calls.filter(function (call) { return call.method === "DELETE"; }).length, beforeCleanupRetry,
            "Repeated explicit cleanup controls join the existing retirement instead of replaying its write");
        press("Play"); await settle();
        completeClear(); await settle();
        assert(queues[malformedId].cleared);
        press("Cancel", window.document.getElementById("music-queue-panel"));
        press("Play"); await settle();
        assert.strictEqual(state, "PLAYING", "Music restarts after known retirement has actually completed");
        delayClear = true;
        press("More"); press("Stop and return to details"); await settle();
        beforeRetirement = queueNumber;
        press("Play"); await settle();
        assert.strictEqual(queueNumber, beforeRetirement, "Normal stop retirement also interlocks replacement creation");
        completeClear(); await settle();
        press("Cancel", window.document.getElementById("music-queue-panel"));
        press("Play"); await settle();
        assert.strictEqual(state, "PLAYING");
        press("More"); press("Stop and return to details"); await settle();
        console.log("Tizen actual music UI: >200 tracks, server order/shuffle, repeat/manual skip, pause, failure/retry, cancellation and cleanup passed");
    } finally { dom.window.close(); }
}
run().catch(function (error) { console.error(error.stack || error); process.exitCode = 1; });
