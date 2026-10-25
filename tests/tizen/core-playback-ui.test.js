"use strict";
var assert = require("assert");
var fs = require("fs");
var path = require("path");
var JSDOM = require("jsdom").JSDOM;
var app = path.resolve(__dirname, "../../samsung/Vemm");

function media() {
    return { ratingKey: "10", type: "episode", title: "Synthetic episode", duration: 100000,
        Marker: [{ type: "credits", startTimeOffset: 90000, endTimeOffset: 100000, final: true }],
        Media: [{ container: "mp4", videoCodec: "h264", audioCodec: "aac", width: 1280, height: 720,
            Part: [{ id: 20, key: "/media/20.mp4", Stream: [
                { id: 1, streamType: 1, codec: "h264" },
                { id: 31, streamType: 2, languageCode: "eng", language: "English", displayTitle: "English", codec: "aac" },
                { id: 32, streamType: 2, languageCode: "fra", language: "French", displayTitle: "French", codec: "aac" }
            ] }] }] };
}

function fixture(options) {
    options = options || {};
    var item = options.item || media();
    var dom = new JSDOM(fs.readFileSync(path.join(app, "index.html"), "utf8"), {
        url: "https://qa.synthetic.invalid", runScripts: "outside-only"
    });
    var w = dom.window, d = w.document;
    Object.defineProperty(d, "hidden", { value: false });
    var timers = [], opens = [], selections = [], timelines = [], listener;
    var state = "NONE", position = 0, audio = "English", stops = 0;
    function timer(callback, delay, interval) {
        timers.push({ callback: callback, delay: delay, interval: interval });
        return timers.length;
    }
    w.setTimeout = function (callback, delay) { return timer(callback, delay, false); };
    w.setInterval = function (callback, delay) { return timer(callback, delay, true); };
    w.clearTimeout = w.clearInterval = function (id) { if (timers[id - 1]) { timers[id - 1].callback = null; } };
    w.fetch = function () { assert.fail("No real account, server or media request"); };
    w.webapis = { avplay: {
        getState: function () { return state; },
        open: function (url) {
            opens.push(url); state = "IDLE"; audio = new URL(url).searchParams.get("audioStreamID") === "32" ? "French" : "English";
        },
        close: function () { state = "NONE"; }, stop: function () { stops += 1; state = "IDLE"; },
        setDisplayRect: function () {}, setDisplayMethod: function () {},
        setListener: function (value) { listener = value; },
        prepareAsync: function (success, failure) {
            if (options.failFirstPrepare && opens.length === 1) { failure(); }
            else { state = "READY"; success(); }
        },
        getDuration: function () { return item.duration; }, getCurrentTime: function () { return position; },
        play: function () { state = "PLAYING"; }, pause: function () { state = "PAUSED"; },
        seekTo: function (target, success) { position = target; success(); },
        getTotalTrackInfo: function () { return [
            { type: "AUDIO", index: 0, extra_info: '{"language":"eng"}' },
            { type: "AUDIO", index: 1, extra_info: '{"language":"fra"}' }
        ]; },
        setSelectTrack: function (type, index) { if (type === "AUDIO") { audio = index === 1 ? "French" : "English"; } }
    } };
    Array.from(d.querySelectorAll("script[src]")).forEach(function (script) {
        var name = script.getAttribute("src");
        if (name !== "main.js" && name.indexOf("$WEBAPIS") === -1) {
            w.eval(fs.readFileSync(path.join(app, name), "utf8"));
        }
    });
    w.VemmCapabilities = { detect: function () { return { evidence: "synthetic",
        containers: ["mp4"], video: ["h264"], audio: ["aac"], maxWidth: 1920, maxHeight: 1080 }; } };
    w.VemmPreferences.load = function () { return { quality: "original", directPlay: options.force ? "force" : "auto",
        language: "en", skipInterval: 10, nextEpisode: "countdown", subtitleDelayMs: 0 }; };
    w.VemmPreferences.save = function () {};
    w.__item = item;
    w.__tracks = options.tracks;
    w.__client = {
        location: "lan", cancelRequests: function () {},
        request: function (_, method, query) {
            var part = item.Media[query.mediaIndex || 0].Part[0];
            return Promise.resolve({ generalDecisionCode: 1001, Metadata: [{ Media: [{ Part: [
                { decision: query.directPlay ? "directplay" : "transcode", Stream: part.Stream }
            ] }] }] });
        },
        streamUrl: function (route, query) {
            return "https://media.synthetic.invalid" + route + "?" + new URLSearchParams(query || {});
        },
        selectStreams: function (partId, audioId, subtitleId) {
            var part = item.Media.map(function (entry) { return entry.Part[0]; }).find(function (entry) {
                return String(entry.id) === String(partId);
            });
            [audioId, subtitleId].forEach(function (id, index) {
                assert(!id || part.Stream.some(function (stream) {
                    return Number(stream.streamType) === index + 2 && Number(stream.id) === Number(id);
                }), "A stream choice must belong to its destination Part");
            });
            selections.push({ part: partId, audio: audioId, subtitle: subtitleId });
            return Promise.resolve();
        },
        timeline: function (_, __, phase) { timelines.push(phase); return Promise.resolve(); },
        stopTranscode: function () { return Promise.resolve(); },
        getMetadata: function () { return Promise.resolve(item); },
        nextEpisode: function () { return Promise.resolve(item); }
    };
    var source = fs.readFileSync(path.join(app, "main.js"), "utf8");
    var boundary = source.lastIndexOf('    addConnectForm("");');
    assert(boundary > 0);
    w.eval(source.slice(0, boundary) +
        "window.__stop=function(){stopPlayer();};window.__settings=function(){return playerSettings;};" +
        "startPlayer(window.__item,window.__client,5000,0,window.__tracks); }());");
    function click(label) {
        var control = Array.from(d.querySelectorAll("button")).find(function (node) { return node.textContent === label; });
        assert(control, "Missing " + label + ": " + d.getElementById("status").textContent);
        control.click();
    }
    async function settle() { for (var i = 0; i < 15; i += 1) { await new Promise(function (resolve) { setImmediate(resolve); }); } }
    return { w: w, d: d, item: item, opens: opens, selections: selections, timelines: timelines, timers: timers,
        click: click, settle: settle, state: function () { return state; }, audio: function () { return audio; },
        stops: function () { return stops; }, event: function (name, value) { listener[name](value); },
        close: async function () { w.__stop(); await settle(); dom.window.close(); } };
}

async function audioSelection() {
    for (var force of [false, true]) {
        var ui = fixture({ force: force });
        try {
            await ui.settle();
            ui.click("Audio"); ui.click("Other languages"); ui.click("French"); ui.click("French");
            await ui.settle();
            if (force) {
                assert.strictEqual(ui.opens.length, 1, "Force refuses an unverified audio replacement before stopping the original");
                assert.strictEqual(ui.selections.length, 0, "A refused replacement cannot change PMS track preferences");
                assert.strictEqual(ui.stops(), 0, "A refused replacement leaves the decoder running");
                assert(ui.d.querySelector(".playback-error"), "Force must explain why the audio choice cannot be applied");
                assert.strictEqual(ui.state(), "PLAYING");
            } else {
                assert.strictEqual(ui.audio(), "French", "A French menu choice must change the actual decoded source, not only PMS metadata");
                assert(ui.opens[1].includes("/start.m3u8"), "Unmapped multi-audio selection uses a negotiated selected-audio stream");
                assert.strictEqual(new URL(ui.opens[1]).searchParams.get("audioStreamID"), "32");
            }
        } finally { await ui.close(); }
    }
    var selected = media();
    selected.Media[0].Part[0].Stream[2].selected = true;
    var defaults = fixture({ item: selected });
    try {
        await defaults.settle();
        assert.strictEqual(defaults.audio(), "French", "Advertised audio selection must also reach the negotiated output");
        assert.strictEqual(defaults.selections.length, 0, "Default selection does not issue an unsolicited preferences PUT");
    } finally { await defaults.close(); }
}

async function retryPauseIntent() {
    for (var failureDuringPrepare of [false, true]) {
        var ui = fixture({ failFirstPrepare: failureDuringPrepare, force: failureDuringPrepare,
            tracks: failureDuringPrepare ? { paused: true } : undefined });
        try {
            await ui.settle();
            if (!failureDuringPrepare) {
                ui.click("Pause / Play"); await ui.settle();
                assert.strictEqual(ui.state(), "PAUSED");
                ui.event("onerror");
            }
            assert(ui.d.querySelector(".playback-error"));
            ui.click("Retry playback"); await ui.settle();
            assert.strictEqual(ui.state(), "PAUSED", "Terminal decoder/prepare errors cannot discard paused intent on Retry");
            assert.strictEqual(ui.timelines[ui.timelines.length - 1], "paused");
        } finally { await ui.close(); }
    }
}

async function bufferingCountdown() {
    var ui = fixture();
    try {
        await ui.settle();
        ui.event("oncurrentplaytime", 92000); await ui.settle();
        var tick = ui.timers.find(function (entry) { return entry.callback && entry.interval && entry.delay === 1000; });
        assert(tick);
        var remaining = ui.d.querySelector(".up-next-countdown").textContent;
        ui.event("onbufferingstart");
        for (var i = 0; i < 12; i += 1) { if (tick.callback) { tick.callback(); } }
        await ui.settle();
        assert.strictEqual(ui.opens.length, 1, "Owned buffering cannot consume the final-credits countdown");
        assert.strictEqual(ui.d.querySelector(".up-next-countdown").textContent, remaining);
        ui.event("onbufferingcomplete");
        for (i = 0; i < 10; i += 1) { if (tick.callback) { tick.callback(); } }
        await ui.settle();
        assert.strictEqual(ui.opens.length, 2, "Countdown resumes after buffering completes");
    } finally { await ui.close(); }
}

async function versionSelection() {
    var item = media();
    item.Media[0].Part[0].Stream.push(
        { id: 12, streamType: 2, languageCode: "eng", language: "English", displayTitle: "English commentary", codec: "aac" },
        { id: 21, streamType: 3, languageCode: "eng", language: "English", codec: "srt" });
    item.Media.push({ container: "mp4", videoCodec: "h264", audioCodec: "aac", width: 1920, height: 1080,
        Part: [{ id: 30, key: "/media/30.mp4", Stream: [
            { id: 110, streamType: 1, codec: "h264" },
            { id: 111, streamType: 2, languageCode: "eng", language: "English", displayTitle: "English", codec: "aac", default: true },
            { id: 112, streamType: 2, languageCode: "eng", language: "English", displayTitle: "Commentary", codec: "aac" },
            { id: 113, streamType: 2, languageCode: "fra", language: "French", codec: "aac" },
            { id: 121, streamType: 3, languageCode: "eng", language: "English", codec: "srt" }
        ] }] });
    for (var scenario of ["replacement", "invalid", "off", "same"]) {
    var candidate = JSON.parse(JSON.stringify(item));
    if (scenario === "invalid") { delete candidate.Media[1].Part[0].key; }
    var ui = fixture({ item: candidate, tracks: { audioId: 12, subtitleId: scenario === "off" ? 0 : 21, paused: true,
        cues: scenario === "off" ? undefined : [{ start: 0, end: 10000, text: "Only this cut" }] } });
    try {
        await ui.settle();
        ui.click("More"); ui.click("Quality and version");
        var version = Array.from(ui.d.querySelectorAll("#player-menu button")).find(function (node) {
            return node.textContent.includes(scenario === "same" ? "720p" : "Version 2");
        });
        assert(version); version.click(); await ui.settle();
        if (scenario === "invalid") {
            assert.strictEqual(ui.opens.length, 1, "An invalid destination never replaces the working source");
            assert.strictEqual(ui.stops(), 0);
            assert.strictEqual(ui.selections.length, 1, "Invalid replacement cannot issue another selection PUT");
            assert(ui.d.querySelector(".playback-error"));
            assert.strictEqual(ui.state(), "PAUSED");
            continue;
        }
        var choice = ui.selections[ui.selections.length - 1];
        assert.strictEqual(choice.part, scenario === "same" ? 20 : 30, "A valid replacement reaches the intended Part");
        assert.strictEqual(choice.audio, scenario === "same" ? 12 : 111,
            "Ambiguous English variants use destination defaults; the same Part retains its selected variant");
        assert.strictEqual(choice.subtitle, scenario === "off" ? 0 : scenario === "same" ? 21 : 121);
        assert.strictEqual(ui.w.__settings().overlaySubtitle, scenario === "same",
            "Only the same cut can inherit external cue timing");
        assert.strictEqual(ui.state(), "PAUSED");
    } finally { await ui.close(); }
    }
}

var cases = { audio: audioSelection, retry: retryPauseIntent, buffering: bufferingCountdown, version: versionSelection };
async function run() {
    for (var name of process.argv[2] ? [process.argv[2]] : Object.keys(cases)) {
        assert(cases[name], "Unknown core regression selector");
        await cases[name]();
    }
    console.log("Core playback actual main/controller/adapter regressions passed");
}
run().catch(function (error) { console.error(error.stack || error); process.exitCode = 1; });
