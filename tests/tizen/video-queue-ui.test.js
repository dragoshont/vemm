"use strict";
var assert = require("assert");
var fs = require("fs");
var path = require("path");
var JSDOM = require("jsdom").JSDOM;
var app = path.resolve(__dirname, "../../samsung/Vemm");
var playlist = { type: "playlist", playlistType: "video", ratingKey: "3000", title: "Synthetic video playlist" };
var rows = Array.from({ length: 241 }, function (_, index) {
    return { ratingKey: String(index % 7 + 1), type: "episode", title: "Synthetic episode " + (index % 7 + 1),
        playQueueItemID: "9007199254741" + String(index).padStart(3, "0"), playlistItemID: "8007199254741" + String(index).padStart(3, "0"),
        duration: 90000, Marker: [{ type: "intro", startTimeOffset: 1000, endTimeOffset: 9000 },
            { type: "credits", startTimeOffset: 80000, endTimeOffset: 90000, final: 1 }],
        Chapter: [{ tag: "Synthetic chapter", startTimeOffset: 1000 }],
        Media: [{ container: "mp4", videoCodec: "h264", audioCodec: "aac", width: 1920, height: 1080,
            Part: [{ id: "10", key: "/library/parts/10/file.mp4", Stream: [{ streamType: 1, codec: "h264" }] }] }] };
});
async function run() {
    var dom = new JSDOM(fs.readFileSync(path.join(app, "index.html"), "utf8"), {
        url: "https://app.synthetic.invalid", runScripts: "outside-only", pretendToBeVisual: true
    });
    var w = dom.window;
    var calls = [];
    var order = rows.slice();
    var selected = 0;
    var version = 1;
    var shuffled = false;
    var number = 0;
    var cleared = [];
    var state = "NONE";
    var listener;
    var failMetadata = false;
    var wrongMetadata = false;
    var incompleteMetadata = false;
    var failCreate = false;
    var failClear = false;
    var staleMove = false;
    var heldPage = null;
    var completePage;
    var holdCreate = false;
    var completeCreate;
    var holdMetadata = false;
    var completeMetadata;
    function response(container) {
        return { ok: true, status: 200, json: function () { return Promise.resolve({ MediaContainer: container }); } };
    }
    function projection(items) {
        return { playQueueID: String(number), playQueueSelectedItemID: order[selected].playQueueItemID,
            playQueueSelectedItemOffset: selected, playQueueTotalCount: order.length,
            playQueueVersion: version, playQueueShuffled: shuffled, Metadata: items || order.slice(0, 50) };
    }
    w.TextDecoder = TextDecoder;
    w.webapis = { avplay: {
        getState: function () { return state; }, open: function () { state = "IDLE"; }, close: function () { state = "NONE"; },
        stop: function () { state = "IDLE"; }, setDisplayRect: function () {}, setDisplayMethod: function () {},
        setListener: function (value) { listener = value; }, prepareAsync: function (success) { state = "READY"; success(); },
        getDuration: function () { return 90000; }, getCurrentTime: function () { return 0; },
        play: function () { state = "PLAYING"; }, pause: function () { state = "PAUSED"; },
        seekTo: function (_, success) { success(); }
    } };
    w.fetch = function (target, options) {
        var u = new URL(target);
        calls.push({ path: u.pathname, method: options.method, query: u.searchParams });
        if (u.pathname === "/api/v2/home/users") {
            return Promise.resolve({ ok: true, status: 200, json: function () {
                return Promise.resolve({ users: [{ uuid: "synthetic-owner", title: "Synthetic owner", admin: true }] });
            } });
        }
        if (u.pathname === "/api/v2/resources") {
            return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve([{
                clientIdentifier: "synthetic-server", name: "Synthetic PMS", provides: "server", owned: true,
                accessToken: "synthetic-server-token", connections: [{ uri: "https://pms.synthetic.invalid" }]
            }]); } });
        }
        var container;
        if (u.pathname === "/identity") { container = { machineIdentifier: "synthetic-server" }; }
        else if (u.pathname === "/library/sections") { container = { Directory: [{ key: "1", type: "show", title: "TV" }] }; }
        else if (u.pathname === "/hubs/promoted") { container = { Hub: [] }; }
        else if (u.pathname === "/playlists") { container = { Metadata: [playlist], totalSize: 1 }; }
        else if (u.pathname === "/playlists/3000") { container = { Metadata: [playlist] }; }
        else if (u.pathname === "/playlists/3000/items") {
            var offset = Number(u.searchParams.get("X-Plex-Container-Start"));
            container = { Metadata: rows.slice(offset, offset + 50), totalSize: rows.length, offset: offset };
        } else if (/\/playlists\/3000\/items\/\d+\/move$/.test(u.pathname)) {
            assert.strictEqual(options.method, "PUT");
            if (!staleMove) {
                var index = rows.findIndex(function (row) { return row.playlistItemID === u.pathname.split("/")[4]; });
                rows.unshift(rows.splice(index, 1)[0]);
            }
            return Promise.resolve({ ok: true, status: 204 });
        } else if (/^\/library\/metadata\/\d+$/.test(u.pathname)) {
            if (failMetadata) { failMetadata = false; return Promise.resolve({ ok: false, status: 503 }); }
            assert.strictEqual(u.searchParams.get("includeMarkers"), "1");
            assert.strictEqual(u.searchParams.get("includeChapters"), "1");
            container = { Metadata: [rows.find(function (row) { return row.ratingKey === u.pathname.split("/").pop(); })] };
            if (wrongMetadata) {
                wrongMetadata = false;
                container.Metadata = [Object.assign({}, container.Metadata[0], { ratingKey: "999" })];
            }
            if (incompleteMetadata) {
                incompleteMetadata = false;
                container.Metadata = [Object.assign({}, container.Metadata[0], { Media: [] })];
            }
            if (holdMetadata) {
                holdMetadata = false;
                return new Promise(function (resolve) { completeMetadata = function () { resolve(response(container)); }; });
            }
        } else if (u.pathname === "/playQueues") {
            if (failCreate) { failCreate = false; return Promise.resolve({ ok: false, status: 503 }); }
            assert.strictEqual(u.searchParams.get("type"), "video");
            assert.strictEqual(u.searchParams.get("playlistID"), "3000");
            number += 1; order = rows.slice(); selected = 0; version = 1; shuffled = false;
            container = projection();
            if (holdCreate) {
                holdCreate = false;
                return new Promise(function (resolve) { completeCreate = function () { resolve(response(container)); }; });
            }
        } else if (u.pathname.startsWith("/playQueues/")) {
            if (options.method === "DELETE") {
                if (failClear) { failClear = false; return Promise.resolve({ ok: false, status: 503 }); }
                cleared.push(u.pathname.split("/")[2]);
                return Promise.resolve({ ok: true, status: 204 });
            }
            if (/\/(unshuffle|shuffle)$/.test(u.pathname)) {
                var current = order[selected];
                shuffled = u.pathname.endsWith("/shuffle");
                order = rows.slice(); if (shuffled) { order.reverse(); }
                selected = order.indexOf(current); version += 1;
                container = projection([current]);
            } else {
                var center = order.findIndex(function (row) { return row.playQueueItemID === u.searchParams.get("center"); });
                assert(center >= 0);
                var forward = u.searchParams.get("includeAfter") === "1";
                var page = [];
                for (var i = 1; i <= 50; i += 1) { page.push(order[(center + (forward ? i : -i) + order.length) % order.length]); }
                if (!forward) { page.reverse(); }
                container = projection(page);
                if (heldPage) {
                    heldPage = false;
                    return new Promise(function (resolve) { completePage = function () { resolve(response(container)); }; });
                }
            }
        } else if (u.pathname === "/:/timeline") {
            assert.strictEqual(u.searchParams.get("playQueueID"), String(number));
            selected = order.findIndex(function (row) { return row.playQueueItemID === u.searchParams.get("playQueueItemID"); });
            assert(selected >= 0, "Timeline correlates exact duplicate queue entry");
            container = {};
        } else if (u.pathname === "/video/:/transcode/universal/decision") { container = { generalDecisionCode: 1001 }; }
        else if (u.pathname === "/video/:/transcode/universal/stop") { container = {}; }
        else { return Promise.resolve({ ok: false, status: 404 }); }
        return Promise.resolve(response(container));
    };
    w.localStorage.setItem("vemm-tizen-account", JSON.stringify({ version: 2, storage: "unencrypted", token: "synthetic-token" }));
    for (var script of w.document.querySelectorAll("script[src]")) {
        if (!script.src.includes("$WEBAPIS")) { w.eval(fs.readFileSync(path.join(app, script.getAttribute("src")), "utf8")); }
    }
    async function settle() { await new Promise(function (resolve) { setTimeout(resolve, 0); }); await new Promise(function (resolve) { setTimeout(resolve, 0); }); }
    function press(label, scope) {
        var node = Array.from((scope || w.document).querySelectorAll("button")).find(function (control) {
            return control.textContent.trim() === label;
        });
        assert(node, "Missing video control: " + label + " in " + w.document.querySelector(".screen").textContent);
        node.focus();
        w.document.dispatchEvent(new w.KeyboardEvent("keydown", { keyCode: 13, bubbles: true }));
        w.document.dispatchEvent(new w.KeyboardEvent("keyup", { keyCode: 13, bubbles: true }));
    }
    async function next() { press("More"); press("Next video"); await settle(); }
    try {
        await settle(); press("Use linked account"); await settle(); press("Synthetic PMS (owned)"); await settle();
        press("Start watching"); await settle(); press("Video playlists"); await settle(); press(playlist.title); await settle();
        failCreate = true; press("Play playlist"); await settle();
        assert(w.document.querySelector('#video-queue-panel[role="alertdialog"]'), "Queue failure is explicit");
        press("Retry"); await settle();
        assert.strictEqual(state, "PLAYING", w.document.querySelector(".screen").textContent + " / " + w.document.getElementById("status").textContent);
        failMetadata = true; await next();
        assert.strictEqual(selected, 0, "Failed metadata cannot advance queue");
        press("Retry"); await settle(); assert.strictEqual(selected, 1);
        wrongMetadata = true; await next();
        assert.strictEqual(selected, 1, "Mismatched metadata must not commit a queue transition");
        press("Cancel", w.document.getElementById("video-queue-panel"));
        incompleteMetadata = true; await next();
        assert.strictEqual(state, "PLAYING", "Incomplete next-item metadata must preserve the current video");
        press("Cancel", w.document.getElementById("video-queue-panel"));
        heldPage = true; await next();
        w.document.activeElement.dispatchEvent(new w.KeyboardEvent("keydown", { keyCode: 10009, bubbles: true }));
        completePage(); await settle(); assert.strictEqual(selected, 1, "Back cancels late page");
        for (var i = 2; i <= 205; i += 1) { await next(); assert.strictEqual(selected, i); }
        assert.strictEqual(number, 1, "Transitions must reuse the existing video queue");
        listener.oncurrentplaytime(80000); await settle();
        holdMetadata = true;
        press("Next Episode", w.document.getElementById("up-next")); await settle();
        assert(completeMetadata, "Automatic transition is awaiting actual successor metadata");
        press("Pause / Play"); await settle();
        completeMetadata(); await settle();
        assert.strictEqual(state, "PAUSED", "Pausing during automatic successor metadata must survive transition commit");
        await next(); assert.strictEqual(state, "PAUSED", "Manual navigation also retains pause");
        press("More"); press("Shuffle / On or off"); await settle();
        assert.strictEqual(state, "PAUSED");
        press("Repeat / Off, one, all");
        listener.onstreamcompleted(); await settle();
        assert.strictEqual(state, "PLAYING", "Completion repeat-one restarts only the current entry");
        press("More"); failClear = true; press("Stop and return to details"); await settle();
        assert(w.document.querySelector('#video-queue-panel[role="alertdialog"]'));
        press("Cancel", w.document.getElementById("video-queue-panel"));
        press("Play"); await settle();
        assert.strictEqual(number, 1, "Unreconciled cleanup cannot accumulate new owned queues");
        press("Retry", w.document.getElementById("video-queue-panel")); await settle();
        assert(cleared.includes("1"), w.document.querySelector(".screen").textContent + " / " + JSON.stringify(calls.slice(-6).map(function (call) { return [call.path, call.method]; })));
        press("Back"); await settle();
        press(playlist.title); await settle();
        press("Playlist items"); await settle();
        for (i = 0; i < 4; i += 1) { press("Next page"); await settle(); }
        assert(w.document.querySelector(".screen").textContent.includes("201"));
        var target = rows[201];
        press("Move to beginning", w.document.querySelectorAll(".playlist-entry")[1]);
        staleMove = true; press("Confirm"); await settle();
        assert(w.document.getElementById("status").textContent.match(/not confirm/i), "HTTP success with unchanged order is not success");
        staleMove = false; press("Reload playlist"); await settle();
        var mutations = calls.filter(function (call) { return /\/move$/.test(call.path); }).length;
        press("Move to beginning", w.document.querySelectorAll(".playlist-entry")[1]);
        var swap = rows[200]; rows[200] = rows[201]; rows[201] = swap;
        press("Confirm"); await settle();
        assert(w.document.getElementById("status").textContent.includes("changed on Plex"), "Stale displayed order requires reload");
        assert.strictEqual(calls.filter(function (call) { return /\/move$/.test(call.path); }).length, mutations,
            "A stale confirmation cannot issue a mutation");
        swap = rows[200]; rows[200] = rows[201]; rows[201] = swap;
        press("Reload playlist"); await settle();
        press("Move to beginning", w.document.querySelectorAll(".playlist-entry")[1]);
        press("Confirm"); await settle();
        assert.strictEqual(rows[0], target, "Move identifies the playlist entry, not its duplicate library key");
        assert(w.document.getElementById("status").textContent.match(/confirmed/i));
        press("Back"); await settle();
        holdCreate = true;
        press("Play playlist"); await settle();
        press("Cancel", w.document.getElementById("video-queue-panel"));
        completeCreate(); await settle();
        assert(cleared.includes("2"), "Late creation is cleared after cancellation");
        assert.strictEqual(state, "NONE", "Cancelled creation cannot start playback");
        press("Play playlist"); await settle();
        await next();
        var successorTitle = order[selected + 1].title;
        heldPage = true;
        listener.oncurrentplaytime(85000); await settle();
        listener.onstreamcompleted(); await settle();
        completePage(); await settle();
        assert(!w.document.querySelector('#video-queue-panel[role="alertdialog"]'), "Completion must supersede an in-flight Up Next preview");
        press("Up Next: " + successorTitle); await settle();
        assert.strictEqual(number, 3, "Credits/Up Next preserves the owned queue");
        press("More"); press("Markers"); await settle();
        assert(w.document.querySelector("#player-menu").textContent.includes("Skip Intro"), "Queue transitions refetch marker metadata");
        press("Close menu"); await settle();
        assert(!Array.from(w.document.querySelectorAll(".screen button")).some(function (control) {
            return control.textContent === "Chapters" || control.textContent === "Info";
        }), "Queue transitions cannot restore removed player controls");
        version += 1;
        await next();
        assert(w.document.getElementById("status").textContent.includes("changed on Plex"), "A stale queue cannot advance");
        press("Cancel", w.document.getElementById("video-queue-panel")); version -= 1;
        heldPage = true; await next();
        Object.defineProperty(w.document, "hidden", { configurable: true, value: true });
        w.document.dispatchEvent(new w.Event("visibilitychange"));
        completePage(); await settle();
        assert.strictEqual(state, "NONE", "Hidden teardown wins over a late page");
        assert(cleared.includes("3"), "Background stop clears only its owned queue");
        Object.defineProperty(w.document, "hidden", { configurable: true, value: false });
        w.document.dispatchEvent(new w.Event("visibilitychange")); await settle();
        assert.strictEqual(state, "NONE", "Foreground recovery never autoplays");
        console.log("Video actual UI: >200 duplicate entries, metadata/retry, Back, pause, shuffle/repeat, single owned queue and confirmed playlist editing passed");
    } finally { dom.window.close(); }
}
run().catch(function (error) { console.error(error.stack || error); process.exitCode = 1; });
