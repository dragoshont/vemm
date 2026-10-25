"use strict";
var assert = require("assert");
var fs = require("fs");
var path = require("path");
var JSDOM = require("jsdom").JSDOM;
var app = path.resolve(__dirname, "../../samsung/Vemm");

async function run() {
    var dom = new JSDOM(fs.readFileSync(path.join(app, "index.html"), "utf8"), {
        url: "https://app.synthetic.invalid", runScripts: "outside-only"
    });
    var window = dom.window;
    var pages = [], live = new Set(), peak = 0, sequence = 100000, photoRequests = 0, failure = false;
    var directPhotos = false, libraryPages = [];
    var timers = new Map();
    var set = window.setTimeout.bind(window), clear = window.clearTimeout.bind(window);
    window.setTimeout = function (callback, delay) {
        if (delay === 5000 || delay === 15000) { var id = ++sequence; timers.set(id, { callback: callback, delay: delay }); return id; }
        return set(callback, delay);
    };
    window.clearTimeout = function (id) { if (!timers.delete(id)) { clear(id); } };
    window.URL.createObjectURL = function () {
        var url = "blob:synthetic-" + (++sequence);
        live.add(url); peak = Math.max(peak, live.size); return url;
    };
    window.URL.revokeObjectURL = function (url) { assert(live.delete(url), "Each Blob URL is released exactly once"); };
    var album = { ratingKey: "40", title: "Synthetic album", type: "photoalbum" };
    function photos(start) {
        return Array.from({ length: Math.min(50, 1001 - start) }, function (_, i) {
            return { ratingKey: String(100 + start + i), title: "Photo " + (start + i), type: "photo",
                Media: [{ Part: [{ key: "/library/parts/" + (100 + start + i) + "/file.png" }] }] };
        });
    }
    window.fetch = function (target, options) {
        var url = new URL(target), container;
        assert.strictEqual(url.origin, "https://pms.synthetic.invalid");
        assert.strictEqual(options.method || "GET", "GET", "Photo journeys never mutate Plex viewing state");
        if (url.pathname === "/library/sections/4/all") {
            var libraryStart = Number(url.searchParams.get("X-Plex-Container-Start"));
            libraryPages.push(libraryStart);
            container = { offset: libraryStart, totalSize: directPhotos ? 1001 : 1,
                Metadata: directPhotos ? photos(libraryStart) : [album] };
        } else if (url.pathname === "/library/metadata/40") {
            container = { Metadata: [album] };
        } else if (url.pathname === "/library/metadata/40/children") {
            var start = Number(url.searchParams.get("X-Plex-Container-Start"));
            assert.strictEqual(url.searchParams.get("X-Plex-Container-Size"), "50");
            pages.push(start);
            container = { offset: start, totalSize: 1001, Metadata: photos(start) };
        } else if (url.pathname === "/photo/:/transcode") {
            photoRequests += 1;
            return Promise.resolve({ ok: !failure, status: failure ? 415 : 200,
                headers: { get: function (name) { return name === "Content-Type" ? "image/jpeg" : null; } },
                body: new ReadableStream({ start: function (controller) {
                    controller.enqueue(new Uint8Array([255, 216, 255, 192, 0, 8, 8, 4, 56, 7, 128, 1])); controller.close();
                } }) });
        } else { throw new Error("Unexpected synthetic endpoint: " + url.pathname); }
        return Promise.resolve({ ok: true, status: 200, json: function () {
            return Promise.resolve({ MediaContainer: container });
        } });
    };
    ["plex-api", "photos", "home-hero", "item-menu", "preferences", "i18n"].forEach(function (name) {
        window.eval(fs.readFileSync(path.join(app, "js", name + ".js"), "utf8"));
    });
    window.__client = window.PlexApi.createClient({ baseUrl: "https://pms.synthetic.invalid", fetch: window.fetch });
    var source = fs.readFileSync(path.join(app, "main.js"), "utf8");
    var boot = source.lastIndexOf('    addConnectForm("");');
    assert(boot > 0);
    window.eval(source.slice(0, boot) + '    currentClient = window.__client; renderHome(' +
        '[{ key: "4", type: "photo", title: "Photos" }], []); }());');
    function key(code) {
        window.document.dispatchEvent(new window.KeyboardEvent("keydown", { keyCode: code, bubbles: true }));
        window.document.dispatchEvent(new window.KeyboardEvent("keyup", { keyCode: code, bubbles: true }));
    }
    function control(label) {
        var node = Array.from(window.document.querySelectorAll("button")).find(function (button) { return button.textContent === label; });
        assert(node, "Missing remote control: " + label); return node;
    }
    function press(label) { control(label).focus(); key(13); }
    async function settle() {
        for (var i = 0; i < 80; i += 1) { await Promise.resolve(); }
        await new Promise(function (resolve) { set(resolve, 0); });
        await new Promise(function (resolve) { set(resolve, 0); });
    }
    function decode() {
        var image = window.document.querySelector(".photo-display");
        assert(image && image.onload, window.document.getElementById("status").textContent);
        Object.defineProperty(image, "naturalWidth", { configurable: true, value: 1920 });
        Object.defineProperty(image, "naturalHeight", { configurable: true, value: 1080 });
        image.onload();
        assert.strictEqual(window.document.querySelectorAll(".photo-display").length, 1);
        assert.strictEqual(live.size, 0, "A decoded image releases its encoded Blob");
    }
    try {
        press("Photos"); await settle();
        window.document.querySelector(".media-card").focus(); key(13); await settle();
        press("Photos"); await settle();
        var original = window.document.querySelector(".media-card");
        original.focus(); key(13); await settle(); decode();
        press("Previous photo"); await settle(); decode();
        assert.strictEqual(window.document.querySelector(".photo-title").textContent, "Photo 1000");
        assert(window.document.getElementById("status").textContent.startsWith("1001 / 1001"));
        press("Next photo"); await settle(); decode();
        assert.strictEqual(window.document.querySelector(".photo-title").textContent, "Photo 0");
        for (var i = 0; i < 251; i += 1) { press("Next photo"); await settle(); decode(); }
        assert.strictEqual(window.document.querySelector(".photo-title").textContent, "Photo 251");
        assert.deepStrictEqual(pages, [0, 1000, 0, 50, 100, 150, 200, 250]);
        control("Next photo").focus(); key(39);
        assert.strictEqual(window.document.activeElement.textContent, "Rotate photo");
        key(13);
        assert(window.document.querySelector(".photo-display").style.transform.includes("rotate(90deg)"));
        var before = photoRequests;
        press("Slideshow / Pause");
        assert.strictEqual(photoRequests, before, "Starting a slideshow does not download the decoded photo again");
        assert.strictEqual(control("Slideshow / Pause").getAttribute("aria-pressed"), "true");
        var slide = Array.from(timers.entries()).find(function (entry) { return entry[1].delay === 5000; });
        assert(slide);
        timers.delete(slide[0]); slide[1].callback(); await settle();
        press("Slideshow / Pause");
        assert(Array.from(timers.values()).some(function (timer) { return timer.delay === 15000; }),
            "Pausing during decode retains the decode deadline");
        decode();
        failure = true;
        press("Next photo"); await settle();
        assert(window.document.getElementById("status").textContent.includes("HTTP 415"));
        assert.strictEqual(control("Slideshow / Pause").getAttribute("aria-pressed"), "false");
        failure = false;
        press("Retry photo"); await settle(); decode();
        var title = window.document.querySelector(".photo-title").textContent;
        Object.defineProperty(window.document, "hidden", { configurable: true, value: true });
        window.document.dispatchEvent(new window.Event("visibilitychange"));
        assert.strictEqual(live.size, 0);
        assert.strictEqual(timers.size, 0, "Standby cancels photo and slideshow timers");
        Object.defineProperty(window.document, "hidden", { configurable: true, value: false });
        window.document.dispatchEvent(new window.Event("visibilitychange"));
        await settle(); decode();
        assert.strictEqual(window.document.querySelector(".photo-title").textContent, title,
            "Foreground restores the selected photo rather than the original page");
        assert.strictEqual(control("Slideshow / Pause").getAttribute("aria-pressed"), "false", "Foreground does not restart a slideshow");
        key(10009); await settle();
        assert.strictEqual(window.document.activeElement.textContent, original.textContent, "Back restores the selected album-list card");
        assert.strictEqual(window.document.querySelectorAll(".media-card").length, 50);
        assert.strictEqual(live.size, 0);
        assert.strictEqual(timers.size, 0);
        assert.strictEqual(peak, 1, "More than 250 transitions retain at most one encoded image URL");
        key(10009); await settle();
        key(10009); await settle();
        key(10009); await settle();
        directPhotos = true;
        press("Photos"); await settle();
        window.document.querySelectorAll(".media-card")[49].focus(); key(13); await settle(); decode();
        press("Next photo"); await settle(); decode();
        assert.strictEqual(window.document.querySelector(".photo-title").textContent, "Photo 50");
        assert(window.document.getElementById("status").textContent.startsWith("51 / 1001"));
        assert.deepStrictEqual(libraryPages.slice(-2), [0, 50], "Direct library photos retain their own paged source");
        key(10009); await settle();
        assert.strictEqual(window.document.activeElement.textContent, "Photo 49");
        key(13); await settle(); decode();
        press("Next photo"); await settle(); decode();
        assert(window.document.getElementById("status").textContent.startsWith("51 / 1001"),
            "Back/reopen preserves library total and cursor without mutating the list window");
        press("Slideshow / Pause");
        window.dispatchEvent(new window.Event("pagehide"));
        assert.strictEqual(live.size, 0);
        assert.strictEqual(timers.size, 0, "Page teardown cannot leave a slideshow callback alive");
    } finally { window.close(); }
    console.log("Tizen photo remote album paging/rotation/retry/slideshow/standby/Back resource journeys: passed");
}
run().catch(function (error) { console.error(error.stack || error); process.exitCode = 1; });
