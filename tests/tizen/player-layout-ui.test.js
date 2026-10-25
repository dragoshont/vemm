"use strict";
// LG-parity player interactions against a synthetic item and a mocked player. No Plex request,
// AVPlay session, timeline update or household account is used.
var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var JSDOM = require("jsdom").JSDOM;
var root = path.resolve(__dirname, "../..");
var item = {
    ratingKey: "10",
    type: "episode",
    title: "A Synthetic Journey",
    grandparentTitle: "Synthetic Show",
    grandparentThumb: "/library/metadata/show/thumb",
    parentTitle: "Season 2",
    parentIndex: 2,
    index: 4,
    summary: "A synthetic episode used only by this test.",
    year: 2025,
    contentRating: "TV-PG",
    duration: 60000,
    viewOffset: 45000,
    Chapter: [
        { id: 1, index: 0, tag: "Arrival", startTimeOffset: 0, thumb: "/chapter/arrival" },
        { id: 2, index: 1, tag: "Discovery", startTimeOffset: 20000, thumb: "/chapter/discovery" },
        { id: 3, index: 2, tag: "Return", startTimeOffset: 40000, thumb: "/chapter/return" }
    ],
    Marker: [{ id: 9, type: "credits", startTimeOffset: 54000, endTimeOffset: 60000, final: "1" }],
    Media: [{
        container: "mp4", videoCodec: "h264", audioCodec: "aac", width: 1920, height: 1080,
        Part: [{ id: 1, key: "/library/parts/synthetic/file", Stream: [
            { id: 11, streamType: 2, language: "English", languageCode: "eng", displayTitle: "English — Stereo", codec: "aac" },
            { id: 12, streamType: 2, language: "English", languageCode: "eng", displayTitle: "English — Commentary", codec: "aac" },
            { id: 13, streamType: 2, language: "French", languageCode: "fra", displayTitle: "French", codec: "aac" },
            { id: 21, streamType: 3, language: "English", languageCode: "eng", displayTitle: "English", codec: "srt" }
        ] }]
    }]
};

function playerFixture(trackOptions, mediaItem) {
    var dom = new JSDOM(fs.readFileSync(path.join(root, "samsung/Vemm/index.html"), "utf8"), {
        url: "https://player.synthetic.invalid", runScripts: "outside-only"
    });
    var window = dom.window;
    Object.defineProperty(window.document, "hidden", { value: false, configurable: true });
    var callbacks = {};
    var adapters = 0;
    var seeks = [];
    var starts = 0;
    var plays = 0;
    var playerSettings = [];
    var clock = 100000;
    var timers = [];
    var timersNext = 1;
    window.fetch = function () { assert.fail("The player preview must not use the network"); };
    var i18nContext = {};
    vm.runInNewContext(fs.readFileSync(path.join(root, "samsung/Vemm/js/i18n.js"), "utf8"), i18nContext);
    window.VemmI18n = i18nContext.VemmI18n;
    window.VemmPreferences = {
        load: function () { return { quality: "original", nextEpisode: "countdown",
            language: trackOptions && trackOptions.language || "en",
            skipInterval: 10, subtitleDelayMs: trackOptions && trackOptions.initialDelay || 0,
            subtitleSize: "medium", subtitlePosition: "low",
            subtitleColor: "white", subtitleBackground: "off", directPlay: "auto",
            adaptiveQuality: !!(trackOptions && trackOptions.adaptiveQuality) }; },
        save: function () {}
    };
    window.VemmSkipMarkers = require("../../samsung/Vemm/js/skip-markers.js");
    window.VemmFileInfo = require("../../samsung/Vemm/js/file-info.js");
    window.VemmSubtitles = require("../../samsung/Vemm/js/subtitles.js");
    window.VemmSubtitleSearch = require("../../samsung/Vemm/js/subtitle-search.js");
    window.VemmAvplay = { create: function (options) { adapters += 1; callbacks.avplay = options; return {}; } };
    window.VemmPlayback = {
        plan: require("../../samsung/Vemm/js/playback.js").plan,
        adaptivePolicy: require("../../samsung/Vemm/js/playback.js").adaptivePolicy,
        create: function (options) {
            playerSettings.push(options.settings);
            var state = "idle";
            var events = callbacks.avplay;
            return {
                start: function () {
                    starts += 1;
                    if (trackOptions && trackOptions.failFirstStart && starts === 1) {
                        return Promise.reject(new Error("Synthetic stream negotiation failure"));
                    }
                    state = options.settings.paused ? "paused" : "playing";
                    events.onEvent({ type: "state", state: state });
                    return Promise.resolve();
                },
                snapshot: function () { return { state: state, position: 45000, duration: item.duration }; },
                pause: function () { state = "paused"; events.onEvent({ type: "state", state: state }); return Promise.resolve(); },
                play: function () { plays += 1; state = "playing"; events.onEvent({ type: "state", state: state }); return Promise.resolve(); },
                seek: function (position) { seeks.push(position); return Promise.resolve(position); },
                stop: function () { state = "idle"; return Promise.resolve(item); },
                selection: function () { return trackOptions && trackOptions.selectedTracks || { audioId: 11, subtitleId: 21 }; },
                part: function () { return (mediaItem || item).Media[0].Part[0]; },
                quality: function () { return trackOptions && trackOptions.qualityFacts ||
                    { source: item.Media[0], stream: item.Media[0], mode: "direct", limit: "original" }; },
                tracks: function () { return []; },
                setSubtitleOffset: function (offset) { callbacks.subtitleOffset = offset; }
            };
        }
    };
    var client = {
        location: trackOptions && trackOptions.remote ? "wan" : "lan",
        cancelRequests: function () {},
        nextEpisode: function () {
            return Promise.resolve({ ratingKey: "synthetic-next", type: "episode", title: "Next Synthetic Episode",
                grandparentTitle: "Synthetic Show", parentIndex: 2, index: 5,
                thumb: "/library/metadata/next/thumb" });
        },
        getMetadata: function () { return Promise.resolve({ ratingKey: "synthetic-next", type: "episode", title: "Next Synthetic Episode" }); },
        image: function () { return Promise.reject(new Error("No image request is permitted in this fixture")); }
    };
    var source = fs.readFileSync(path.join(root, "samsung/Vemm/main.js"), "utf8");
    var boot = source.lastIndexOf('    addConnectForm("");');
    assert(boot !== -1, "The app boot boundary remains available to isolated UI tests");
    source = source.slice(0, boot) +
        '    startPlayer(' + JSON.stringify(mediaItem || item) + ', window.__syntheticClient, 45000, 0, ' +
        JSON.stringify(trackOptions || null) + '); }());';
    window.__syntheticClient = client;
    vm.runInNewContext(source, {
        document: window.document,
        window: window,
        navigator: window.navigator,
        console: console,
        Promise: Promise,
        URL: window.URL,
        Blob: window.Blob,
        Date: trackOptions && trackOptions.adaptiveQuality ? { now: function () { return clock; } } : Date,
        setTimeout: function (callback, delay) {
            var id = timersNext++;
            timers.push({ id: id, callback: callback, delay: delay, interval: false });
            return id;
        },
        clearTimeout: function (id) { timers.forEach(function (timer) { if (timer.id === id) { timer.callback = null; } }); },
        setInterval: function (callback, delay) {
            var id = timersNext++;
            timers.push({ id: id, callback: callback, delay: delay, interval: true });
            return id;
        },
        clearInterval: function (id) { timers.forEach(function (timer) { if (timer.id === id) { timer.callback = null; } }); }
    });
    function findButton(label, scope) {
        return Array.prototype.slice.call((scope || window.document).querySelectorAll("button")).filter(function (button) {
            return button.textContent.trim() === label;
        })[0] || null;
    }
    function click(label, scope) {
        var control = findButton(label, scope);
        assert(control, "Missing button: " + label);
        control.click();
        return control;
    }
    function key(code, repeat) {
        var event = new window.KeyboardEvent("keydown", { bubbles: true, cancelable: true, repeat: !!repeat });
        Object.defineProperty(event, "keyCode", { value: code });
        window.document.dispatchEvent(event);
    }
    async function settle() { for (var i = 0; i < 8; i += 1) { await Promise.resolve(); } }
    return {
        dom: dom, window: window, document: window.document, callbacks: callbacks, seeks: seeks,
        starts: function () { return starts; }, plays: function () { return plays; },
        adapters: function () { return adapters; },
        playerSettings: playerSettings, timers: timers,
        advance: function (milliseconds) { clock += milliseconds; },
        findButton: findButton, click: click, key: key, settle: settle
    };
}

async function hudAndPanels() {
    var markerItem = JSON.parse(JSON.stringify(item));
    markerItem.Marker = [{ id: 10, type: "intro", startTimeOffset: 45000, endTimeOffset: 48000 }];
    var markerApp = playerFixture(null, markerItem);
    try {
        await markerApp.settle();
        markerApp.callbacks.avplay.onEvent({ type: "time", position: 46000, duration: markerItem.duration });
        var markerControl = markerApp.findButton("Skip Intro");
        assert(markerControl, "Interval-button removal preserves metadata-driven Intro actions");
        markerControl.focus();
        markerApp.key(38);
        assert.strictEqual(markerApp.document.activeElement.id, "playback-progress");
        markerApp.callbacks.avplay.onEvent({ type: "time", position: 49000, duration: markerItem.duration });
        assert(!markerApp.findButton("Skip Intro"), "The originating marker action can expire while scrubbing");
        markerApp.key(40);
        assert.strictEqual(markerApp.document.activeElement, markerApp.findButton("Pause / Play"),
            "An expired scrub opener returns to Pause / Play, not the old second-button index");
    } finally { markerApp.dom.window.close(); }
    var app = playerFixture();
    try {
        var controls = Array.prototype.slice.call(app.document.querySelectorAll(".playback-controls button"))
            .map(function (button) { return button.textContent.trim(); });
        assert.deepStrictEqual(controls, ["Pause / Play", "Subtitles", "Audio", "More"],
            "The player removes redundant interval buttons, not marker actions or remote seeking");
        await app.settle();
        assert.strictEqual(app.document.activeElement, app.findButton("Pause / Play"),
            "The reduced transport initially focuses Pause / Play");
        ["Subtitles", "Audio", "More"].forEach(function (name) {
            assert(controls.indexOf(name) !== -1, "The transport exposes " + name + " directly");
        });
        assert(app.findButton("Info"), "The HUD includes an Info tab");
        assert(app.findButton("Chapters"), "An item with chapter metadata includes a Chapters tab");
        assert(app.document.querySelector(".playback-remaining"), "The HUD shows a negative time-left clock");
        assert(app.document.querySelector(".playback-context").textContent.indexOf("Synthetic Show") !== -1,
            "The episode HUD identifies its show");

        app.click("Info");
        var info = app.document.querySelector("#player-info");
        assert(info && info.textContent.indexOf("Synthetic Show") !== -1, "Info shows playing-item context");
        assert(info.querySelector(".info-artwork"), "Info uses the item's artwork");
        assert(info.textContent.indexOf("TV-PG") !== -1, "Info includes its rating");
        app.callbacks.avplay.onEvent({ type: "time", position: 50000, duration: item.duration });
        assert(info.querySelector(".player-info-position").textContent.indexOf("0:50") !== -1,
            "The Info playback facts follow the live playback position");

        app.click("Chapters");
        var cards = app.document.querySelectorAll("#chapter-strip .chapter-card");
        assert.strictEqual(cards.length, 3, "The chapter strip renders the chapter list");
        assert.strictEqual(cards[1].querySelector("img").getAttribute("data-artwork-source"), "/chapter/discovery",
            "Chapter cards use Plex Chapter.thumb");
        assert(cards[2].textContent.indexOf("00:40") !== -1, "Chapter cards show their timestamps");
    } finally { app.dom.window.close(); }
}

async function upNextAndTracks() {
    var app = playerFixture();
    try {
        app.callbacks.avplay.onEvent({ type: "time", position: 56000, duration: item.duration });
        await app.settle();
        assert(app.document.querySelector(".up-next-card"), "Final credits reveal the Up Next card");
        assert(app.findButton("Watch Credits"), "The viewer can choose to watch credits");
        assert(app.findButton("Next Episode"), "The next-episode action is explicit");
        assert(app.document.querySelector(".up-next-countdown"), "Up Next shows its countdown");

        app.click("Audio");
        assert(app.findButton("English"), "Tracks open on a language-selection step");
        assert(app.findButton("Other languages"), "Other languages remain discoverable");
        assert(app.findButton("Subtitles off"), "Subtitles off is available from the menu");
        app.click("English");
        assert(app.findButton("English — Stereo"), "A language step lists tracks within that language");
        assert(app.findButton("Back to languages"), "The track language step has an explicit return");
        app.click("Back to languages");
        app.click("Other languages");
        assert(app.findButton("French"), "Other languages opens the remaining language choices");
        app.click("French");
        assert(app.findButton("French"), "The selected language step lists its matching track");
    } finally { app.dom.window.close(); }
}

async function preferredTrackLanguage() {
    for (var example of [{ locale: "es", code: "spa", name: "Español" },
            { locale: "be", code: "bel", name: "Беларуская" }]) {
        var media = JSON.parse(JSON.stringify(item));
        media.Media[0].Part[0].Stream = [
            { id: 13, streamType: 2, language: "French", languageCode: "fra", codec: "aac" },
            { id: 11, streamType: 2, language: example.name, languageCode: example.code, codec: "aac" },
            { id: 23, streamType: 3, language: "French", languageCode: "fra", codec: "srt" },
            { id: 21, streamType: 3, language: example.name, languageCode: example.code, codec: "srt" }
        ];
        var app = playerFixture({ language: example.locale }, media);
        try {
            for (var type of ["Audio", "Subtitles"]) {
                app.click(app.window.VemmI18n.text(type));
                assert.strictEqual(app.document.activeElement.textContent, example.name,
                    "The track language step promotes the matching ISO 639-2 language, not the first server row");
                var menu = app.document.getElementById("player-menu");
                assert(!app.findButton("French", menu), "Other languages stay in their explicit destination");
                app.click(app.window.VemmI18n.text("Other languages"));
                assert(app.findButton("French"), "Nonpreferred tracks remain reachable");
            }
            assert.strictEqual(app.starts(), 1, "Browsing language groups cannot restart playback");
        } finally { app.dom.window.close(); }
    }
}

async function creditsCountdownPreservesPause() {
    var app = playerFixture();
    try {
        await app.settle();
        app.callbacks.avplay.onEvent({ type: "time", position: 56000, duration: item.duration });
        await app.settle();
        var tick = app.timers.find(function (timer) {
            return timer.callback && timer.interval && timer.delay === 1000;
        });
        assert(tick, "Final credits start the owned countdown");
        tick.callback();
        tick.callback();
        var remaining = app.document.querySelector(".up-next-countdown").textContent;
        app.click("Pause / Play");
        for (var i = 0; i < 15; i += 1) { if (tick.callback) { tick.callback(); } }
        await app.settle();
        assert.strictEqual(app.starts(), 1, "A paused credits countdown cannot start another episode");
        var pausedCountdown = app.document.querySelector(".up-next-countdown");
        assert(pausedCountdown, "A paused credits countdown must remain owned by the current episode");
        assert.strictEqual(pausedCountdown.textContent, remaining,
            "Paused wall-clock time cannot consume the remaining countdown");
        app.click("Pause / Play");
        for (i = 0; i < 8; i += 1) { if (tick.callback) { tick.callback(); } }
        for (i = 0; i < 20 && app.starts() !== 2; i += 1) { await app.settle(); }
        assert.strictEqual(app.starts(), 2, "Resuming consumes only the remaining playing-time ticks");
    } finally { app.dom.window.close(); }
    app = playerFixture();
    try {
        await app.settle();
        app.callbacks.avplay.onEvent({ type: "time", position: 56000, duration: item.duration });
        await app.settle();
        app.click("Pause / Play");
        app.click("Next Episode", app.document.getElementById("up-next"));
        for (var attempt = 0; attempt < 20 && app.starts() !== 2; attempt += 1) { await app.settle(); }
        assert.strictEqual(app.starts(), 2, "The explicit next action selects the fallback successor");
        assert.strictEqual(app.playerSettings[1].paused, true,
            "A no-queue successor also receives the viewer's paused intent");
    } finally { app.dom.window.close(); }
}

async function rankedTrackVariants() {
    var media = JSON.parse(JSON.stringify(item));
    media.Media[0].Part[0].Stream = [
        { id: 31, streamType: 3, language: "English", languageCode: "eng", displayTitle: "English", codec: "pgs", forced: 1 },
        { id: 32, streamType: 3, language: "English", languageCode: "eng", displayTitle: "English", codec: "pgs", hearingImpaired: 1 },
        { id: 33, streamType: 3, language: "English", languageCode: "eng", displayTitle: "English", codec: "pgs", default: 1 },
        { id: 34, streamType: "3", language: "English", languageCode: "eng", displayTitle: "English", codec: "pgs", hearingImpaired: "0" },
        { id: 35, streamType: 3, language: "English", languageCode: "eng", displayTitle: "English", codec: "pgs" },
        { id: 11, streamType: "2", language: "English", languageCode: "eng", displayTitle: "English audio", codec: "aac" }
    ];
    var app = playerFixture({ selectedTracks: { audioId: 11, subtitleId: 34 } }, media);
    try {
        await app.settle();
        app.click("Subtitles");
        app.click("English", app.document.getElementById("player-menu"));
        var choices = Array.from(app.document.querySelectorAll('#player-menu button[aria-pressed]'))
            .filter(function (node) { return node.textContent !== "Subtitles off"; });
        assert.strictEqual(choices.length, 5, "Numeric-string stream types remain available as PMS tracks");
        assert.strictEqual(choices[0].getAttribute("aria-pressed"), "true", "The actual selected track ranks first");
        assert(!choices[0].textContent.includes("SDH"), "A false string flag cannot mislabel ordinary subtitles as SDH");
        assert(choices[1].textContent.includes("Default"), "The PMS default ranks next without selecting it");
        assert(choices[2].textContent.includes("Forced"), "Forced variants remain explicitly identified");
        assert(choices[3].textContent.includes("SDH"), "Hearing-impaired variants remain explicitly identified");
        assert.strictEqual(new Set(choices.map(function (node) { return node.textContent; })).size, choices.length,
            "Otherwise identical track titles require distinct remote labels");
        assert.strictEqual(app.starts(), 1, "Ranking and inspecting variants cannot restart or select playback");
        app.click("Close menu");
        app.click("Audio");
        app.click("English", app.document.getElementById("player-menu"));
        assert(app.findButton("English audio"), "Numeric-string audio types remain reachable");
        assert.strictEqual(app.starts(), 1);
        app.click("Close menu");
        app.click("Pause / Play");
        app.click("Subtitles");
        app.click("English", app.document.getElementById("player-menu"));
        var repeated = Array.from(app.document.querySelectorAll('#player-menu button[aria-pressed]'))
            .filter(function (node) { return node.textContent !== "Subtitles off"; });
        assert.deepStrictEqual(repeated.map(function (node) { return node.textContent; }),
            choices.map(function (node) { return node.textContent; }), "Reopening preserves exact variant ordering and duplicate labels");
        app.click(repeated[2].textContent, app.document.getElementById("player-menu"));
        for (var i = 0; i < 20 && app.starts() !== 2; i += 1) { await app.settle(); }
        assert.strictEqual(app.playerSettings[1].subtitleId, 31, "Explicit selection keeps the exact forced variant identity");
        assert.strictEqual(app.playerSettings[1].audioId, 11);
        assert.strictEqual(app.playerSettings[1].paused, true, "A ranked track change cannot autoplay a paused session");
    } finally { app.dom.window.close(); }
}

async function timingStatsAndErrors() {
    var app = playerFixture({ cues: [
        { start: 44000, end: 44999, text: "Earlier cue" },
        { start: 45000, end: 46000, text: "Current cue" }
    ] });
    try {
        app.callbacks.avplay.onEvent({ type: "time", position: 45000, duration: item.duration });
        assert.strictEqual(app.document.getElementById("subtitle-text").textContent, "Current cue");
        app.click("Subtitles");
        app.click("Subtitle timing");
        var timing = app.document.querySelector(".subtitle-timing");
        assert(timing, "Subtitle timing opens a live on-screen capsule");
        var before = timing.textContent;
        app.key(39);
        assert.notStrictEqual(timing.textContent, before, "RIGHT changes the subtitle offset live");
        assert.strictEqual(timing.querySelector(".subtitle-timing-value").textContent, "+0.1 s",
            "A fresh LG timing key advances exactly 100 ms");
        assert.strictEqual(app.document.getElementById("subtitle-text").textContent, "Earlier cue",
            "The live delay immediately changes the rendered text subtitle");
        for (var repeat = 0; repeat < 8; repeat += 1) { app.key(39, true); }
        assert.strictEqual(timing.querySelector(".subtitle-timing-value").textContent, "+1.3 s",
            "The eighth held repeat advances by the LG 500 ms fast step");
        app.key(13);
        assert(!app.document.querySelector(".subtitle-timing"), "OK closes subtitle timing");

        app.click("More");
        app.click("Stats for nerds");
        assert(app.document.querySelector(".playback-stats"), "Stats for nerds opens a playback overlay");
        app.callbacks.avplay.onEvent({ type: "time", position: 51000, duration: item.duration });
        assert(app.document.querySelector(".playback-stats-position").textContent.indexOf("0:51") !== -1,
            "Stats follow the live playback position");

        app.callbacks.avplay.onEvent({ type: "error", detail: "Synthetic decoder failure" });
        var error = app.document.querySelector(".playback-error");
        assert(error, "A playback error owns a recovery panel");
        assert(error.querySelectorAll("button").length > 0, "The recovery panel offers actionable controls");
        assert(Array.prototype.some.call(error.querySelectorAll("button"), function (button) {
            return /back/i.test(button.textContent);
        }), "The recovery panel always offers Back");
    } finally { app.dom.window.close(); }
}

async function subtitleTimingUsesTrackBounds() {
    var sidecar = playerFixture({ cues: [], subtitleSidecar: true, initialDelay: 60000 });
    try {
        sidecar.click("Subtitles");
        sidecar.click("Subtitle timing");
        sidecar.key(39);
        assert.strictEqual(sidecar.document.querySelector(".subtitle-timing-value").textContent, "+60.0 s",
            "Sidecar timing clamps at the LG +60 s bound");
        sidecar.key(37);
        assert.strictEqual(sidecar.document.querySelector(".subtitle-timing-value").textContent, "+59.9 s",
            "Sidecar timing can move earlier by one 100 ms step");
    } finally { sidecar.dom.window.close(); }

    var sidecarMinimum = playerFixture({ cues: [], subtitleSidecar: true, initialDelay: -60000 });
    try {
        sidecarMinimum.click("Subtitles");
        sidecarMinimum.click("Subtitle timing");
        sidecarMinimum.key(37);
        assert.strictEqual(sidecarMinimum.document.querySelector(".subtitle-timing-value").textContent, "-60.0 s",
            "Sidecar timing clamps at the LG -60 s bound");
        sidecarMinimum.key(39);
        assert.strictEqual(sidecarMinimum.document.querySelector(".subtitle-timing-value").textContent, "-59.9 s",
            "Sidecar timing can move later by one 100 ms step");
    } finally { sidecarMinimum.dom.window.close(); }

    var embedded = playerFixture({ cues: [], subtitleSidecar: false, initialDelay: 0 });
    try {
        embedded.click("Subtitles");
        embedded.click("Subtitle timing");
        embedded.key(37);
        assert.strictEqual(embedded.document.querySelector(".subtitle-timing-value").textContent, "0.0 s",
            "Embedded text subtitles cannot advance before their not-yet-read cues");
    } finally { embedded.dom.window.close(); }
}

async function subtitleTimingZeroDetentAndTrackAvailability() {
    var sidecar = playerFixture({ cues: [], subtitleSidecar: true, initialDelay: 100 });
    try {
        sidecar.click("Subtitles");
        sidecar.click("Subtitle timing");
        for (var repeat = 0; repeat < 8; repeat += 1) { sidecar.key(37, true); }
        assert.strictEqual(sidecar.document.querySelector(".subtitle-timing-value").textContent, "0.0 s",
            "The held-key sweep detents at zero rather than crossing immediately");
        sidecar.key(37);
        assert.strictEqual(sidecar.document.querySelector(".subtitle-timing-value").textContent, "-0.1 s",
            "A fresh press passes through the zero detent");
    } finally { sidecar.dom.window.close(); }

    var native = playerFixture({ cues: null, subtitleId: 21 });
    try {
        native.click("Subtitles");
        assert.strictEqual(native.findButton("Subtitle timing"), null,
            "Device-native subtitles are not offered a live app-overlay timing control");
        native.click("More");
        assert.strictEqual(native.findButton("Subtitle timing"), null,
            "Device-native subtitle timing is also absent from the More menu");
    } finally { native.dom.window.close(); }
}

async function failedPlayerRecoveryRestartsThePipeline() {
    var app = playerFixture({ cues: [], subtitleSidecar: true, audioId: 11, subtitleId: 21, failFirstStart: true });
    try {
        await app.settle();
        assert(app.document.querySelector(".playback-error"), "A failed startup offers recovery");
        app.click("Retry playback");
        await app.settle();
        assert.strictEqual(app.starts(), 2, "Retry creates and starts a fresh player pipeline");
        assert.strictEqual(app.plays(), 0, "Retry does not call play on the failed AVPlay instance");
        assert.strictEqual(app.playerSettings[1].audioId, 11, "Retry preserves the selected audio stream");
        assert.strictEqual(app.playerSettings[1].subtitleId, 21, "Retry preserves the selected subtitle stream");
        assert.strictEqual(app.playerSettings[1].offset, 45000, "Retry preserves the failed session position");
        assert.strictEqual(app.adapters(), 2, "Retry allocates a fresh AVPlay adapter");
        assert.strictEqual(app.playerSettings[1].subtitleSidecar, true, "Retry preserves sidecar identity");
        app.callbacks.avplay.onEvent({ type: "error", detail: "Synthetic decoder failure" });
        app.click("Restart");
        await app.settle();
        assert.strictEqual(app.starts(), 3, "Restart also resolves and starts a fresh pipeline");
        assert.strictEqual(app.playerSettings[2].offset, 0, "Restart starts the fresh pipeline at zero");
        assert.strictEqual(app.playerSettings[2].audioId, 11, "Restart preserves explicit audio selection");
        assert.strictEqual(app.playerSettings[2].subtitleId, 21, "Restart preserves explicit subtitle selection");
        assert.strictEqual(app.adapters(), 3, "Restart allocates another fresh AVPlay adapter");
    } finally { app.dom.window.close(); }
}

async function introRemainsVisibleAndRemoteActionIsSingleShot() {
    var episode = Object.assign({}, item, {
        Marker: [{ id: 8, type: "intro", startTimeOffset: 10000, endTimeOffset: 30000 }]
    });
    var app = playerFixture(null, episode);
    try {
        await app.settle();
        app.callbacks.avplay.onEvent({ type: "time", position: 10000, duration: item.duration });
        var prompt = app.findButton("Skip Intro");
        assert(prompt, "Metadata markers create a visible Intro action at the segment boundary");
        assert.strictEqual(app.document.activeElement, prompt, "One remote OK is sufficient to skip");
        app.timers.filter(function (timer) {
            return timer.callback && !timer.interval && timer.delay === 5000;
        }).forEach(function (timer) { timer.callback(); });
        assert.strictEqual(app.document.querySelector(".player-hud").hidden, false,
            "A skippable segment must not lose its prompt to the five-second transport timeout");
        app.key(13);
        app.key(13, true);
        await app.settle();
        assert.deepStrictEqual(app.seeks, [30000], "A held OK seeks to the marker end exactly once");
        app.callbacks.avplay.onEvent({ type: "time", position: 29900, duration: item.duration });
        assert.strictEqual(app.findButton("Skip Intro"), null, "Keyframe landing does not repeat the action");
    } finally { app.dom.window.close(); }
}

async function adaptiveRecoveryPreservesTheSession() {
    var app = playerFixture({ adaptiveQuality: true, remote: true, audioId: 11, subtitleId: 21,
        subtitleSidecar: true, cues: [] });
    try {
        await app.settle();
        assert.strictEqual(app.playerSettings[0].quality, "1080", "Remote Auto negotiates an honest initial cap");
        assert.strictEqual(app.playerSettings[0].adaptiveQuality, true);
        var stale = app.callbacks.avplay;
        app.advance(31000);
        app.callbacks.avplay.onEvent({ type: "buffering", detail: true });
        app.advance(9000);
        app.callbacks.avplay.onEvent({ type: "buffering", detail: false });
        await app.settle();
        assert.strictEqual(app.starts(), 2, "A sustained post-start rebuffer creates one recovery pipeline");
        assert.strictEqual(app.playerSettings[1].quality, "720");
        assert.strictEqual(app.playerSettings[1].offset, 45000);
        assert.strictEqual(app.playerSettings[1].audioId, 11);
        assert.strictEqual(app.playerSettings[1].subtitleId, 21);
        assert.strictEqual(app.playerSettings[1].subtitleSidecar, true);
        stale.onEvent({ type: "buffering", detail: false });
        await app.settle();
        assert.strictEqual(app.starts(), 2, "A replaced adapter cannot trigger another adaptation");
        app.click("Pause / Play");
        await app.settle();
        app.advance(90000);
        app.callbacks.avplay.onEvent({ type: "buffering", detail: true });
        app.advance(9000);
        app.callbacks.avplay.onEvent({ type: "buffering", detail: false });
        await app.settle();
        assert.strictEqual(app.starts(), 2, "Paused buffering never restarts playback");
    } finally { app.dom.window.close(); }
}

async function run() {
    await hostileSupportRecordPreview();
    await supportRecordRemotePreview();
    await adaptiveRecoveryPreservesTheSession();
    await introRemainsVisibleAndRemoteActionIsSingleShot();
    await hudAndPanels();
    await upNextAndTracks();
    await preferredTrackLanguage();
    await creditsCountdownPreservesPause();
    await rankedTrackVariants();
    await timingStatsAndErrors();
    await subtitleTimingUsesTrackBounds();
    await subtitleTimingZeroDetentAndTrackAvailability();
    await failedPlayerRecoveryRestartsThePipeline();
    console.log("Tizen LG-style player HUD, panels, Up Next, tracks, timing, stats and recovery: passed (synthetic player)");
}

async function hostileSupportRecordPreview() {
    for (var mode of ["direct", "directstream", "transcode"]) {
        var secret = "PRIVATE_TOKEN_DUID_SERVER_TITLE_PATH_PROFILE_QUEUE";
        var app = playerFixture({ qualityFacts: {
            mode: mode, limit: secret, source: { videoCodec: secret, audioCodec: secret, height: secret },
            stream: { videoCodec: secret, videoResolution: secret, bitrate: secret, model: secret },
            explanation: { reason: secret, fallback: secret, capability: { status: secret, source: secret } }
        } });
        try {
            await app.settle();
            app.click("More");
            app.click("Support record");
            var preview = app.document.querySelector("#support-record");
            assert(!preview.textContent.includes(secret), "Optional metadata must not leak through the real preview: " + mode);
            assert(!preview.textContent.includes("1080p"), "Missing output is not the default ceiling");
            assert(preview.textContent.includes("Not reported by server"));
            assert.strictEqual(JSON.parse(preview.querySelector("pre").textContent).mode, mode);
            app.click("Scroll record down");
            var output = preview.querySelector("pre");
            assert.strictEqual(output.scrollTop, 160);
            app.click("Scroll record up");
            assert.strictEqual(output.scrollTop, 0);
            app.click("Close");
            assert.strictEqual(app.document.activeElement.textContent, "Support record");
        } finally { app.dom.window.close(); }
    }
}

async function supportRecordRemotePreview() {
    var app = playerFixture({ qualityFacts: {
        source: { height: 2160, videoCodec: "hevc", bitrate: 30000, title: "PRIVATE_TITLE" },
        stream: { height: 720, videoCodec: "h264", audioCodec: "aac", bitrate: 3000 },
        mode: "transcode", limit: "1080",
        explanation: { reason: "quality", capability: { status: "documented", measured: true,
            model: "PRIVATE_MODEL", source: "https://private.invalid" }, fallback: "none" }
    } });
    try {
        await app.settle();
        app.click("Pause / Play");
        await app.settle();
        app.click("More");
        var opener = app.findButton("Support record");
        assert(opener, "Playback options must expose a previewable redacted support record");
        opener.focus();
        app.key(13);
        var preview = app.document.querySelector("#support-record");
        assert(preview, "Remote Enter opens the actual main.js support preview");
        var record = JSON.parse(preview.querySelector("pre").textContent);
        assert.strictEqual(record.requestedCeiling, "1080");
        assert.strictEqual(record.serverReportedOutput.height, 720);
        assert.strictEqual(record.source.height, 2160);
        assert.strictEqual(record.nativeOutput, "not-measured");
        assert(preview.textContent.includes("Quality and version"), "Offer a useful non-mutating next action");
        assert(!preview.textContent.includes("PRIVATE_"));
        assert(!preview.textContent.includes("private.invalid"));
        assert.strictEqual(app.document.activeElement.textContent, "Copy support record");
        app.key(13);
        assert(preview.textContent.includes("Copy is unavailable"), "An absent clipboard API is not success");
        app.document.execCommand = function () { return false; };
        app.key(13);
        assert(preview.textContent.includes("Copy failed"), "A denied copy is not success");
        app.document.execCommand = function () {};
        app.key(13);
        assert(preview.textContent.includes("Copy failed"), "A no-op clipboard stub is not success");
        app.document.execCommand = function () { throw new Error("PRIVATE_CLIPBOARD_ERROR"); };
        app.key(13);
        assert(preview.textContent.includes("Copy failed"));
        assert(!preview.textContent.includes("PRIVATE_CLIPBOARD_ERROR"));
        var copied = "";
        app.document.execCommand = function (command) {
            assert.strictEqual(command, "copy");
            copied = String(app.window.getSelection());
            return true;
        };
        app.key(13);
        assert.deepStrictEqual(JSON.parse(copied), record);
        assert(preview.textContent.includes("Support record copied."));
        app.key(10009);
        assert(!app.document.querySelector("#support-record"));
        assert.strictEqual(app.document.activeElement.textContent, "Support record",
            "Back restores the owned playback action");
        assert.strictEqual(app.starts(), 1);
        assert.strictEqual(app.plays(), 0);
        assert.strictEqual(app.adapters(), 1);
        assert.deepStrictEqual(app.seeks, []);
        assert.strictEqual(app.document.querySelector(".playback-progress").getAttribute("aria-valuenow"), "45000");
        app.key(10009);
        app.click("More");
        app.click("Stats for nerds");
        assert(app.document.querySelector("#playback-stats").textContent.includes("Native output"),
            "Stats must distinguish PMS output from unmeasured native output");
    } finally { app.dom.window.close(); }
}
run().catch(function (error) { console.error(error.stack || error); process.exitCode = 1; });
