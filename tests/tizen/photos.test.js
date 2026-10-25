"use strict";
var assert = require("assert");
var fs = require("fs");
var vm = require("vm");
async function run() {
    var timers = new Map(), buttons = {}, revoked = [], created = [], pending = [], messages = [];
    var headerReads = [], headerAborts = 0;
    function blob(size, type, width, height) {
        width = width || 1600; height = height || 900;
        var header = new Uint8Array([255, 216, 255, 192, 0, 8, 8,
            height >> 8, height & 255, width >> 8, width & 255, 1]);
        if (type === "image/png") {
            header = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82,
                0, 0, width >> 8, width & 255, 0, 0, height >> 8, height & 255]);
        }
        return { size: size, type: type, slice: function (start, end) {
            headerReads.push(end - start); return header.buffer;
        } };
    }
    var context = { Promise: Promise, FileReader: function () {
        this.readAsArrayBuffer = function (buffer) {
            var reader = this;
            Promise.resolve().then(function () {
                reader.result = buffer;
                if (reader.onload) { reader.onload(); }
            });
        };
        this.abort = function () { headerAborts += 1; };
    },
        setTimeout: function (callback) { var id = {}; timers.set(id, callback); return id; },
        clearTimeout: function (id) { timers.delete(id); } };
    vm.runInNewContext(fs.readFileSync(require.resolve("../../samsung/Vemm/js/photos"), "utf8"), context);
    var image;
    function options(index) {
        return {
            items: [{ type: "photo", title: "One" }, { type: "photo", title: "Two" }], index: index,
            client: { photo: function (item) { return new Promise(function (resolve) { pending.push({ item: item, resolve: resolve }); }); } },
            element: function (tag) {
                var node = { style: {}, clientWidth: 1600, clientHeight: 700,
                    naturalWidth: 1600, naturalHeight: 900,
                    removeAttribute: function () { this.src = ""; } };
                if (tag === "img") { image = node; }
                return node;
            },
            parent: { appendChild: function () {} },
            urls: { createObjectURL: function () { var url = "blob:" + created.length; created.push(url); return url; },
                revokeObjectURL: function (url) { revoked.push(url); } },
            status: function (text) { messages.push(text); }, translate: function (text) { return text; },
            button: function (parent, label, callback) { buttons[label] = callback; }, back: function () {}
        };
    }
    async function settle() { for (var i = 0; i < 20; i += 1) { await Promise.resolve(); } }
    assert.throws(function () { context.VemmPhotos.create(options(0.5)); }, /not available/);
    var viewer = context.VemmPhotos.create(options(0));
    await settle();
    buttons["Next photo"](); await settle();
    pending[0].resolve(blob(100, "image/jpeg")); await settle();
    assert.strictEqual(created.length, 0, "A superseded photo must not allocate an object URL");
    pending[1].resolve(blob(100, "image/jpeg")); await settle();
    assert.strictEqual(timers.size, 1, "Image decode must have a finite deadline");
    timers.forEach(function (callback) { callback(); });
    assert(messages.pop().includes("could not be decoded"));
    assert.deepStrictEqual(revoked, created);
    buttons["Slideshow / Pause"](); await settle();
    pending[2].resolve(blob(100, "image/jpeg")); await settle();
    image.onload();
    assert.strictEqual(timers.size, 1, "Slideshow schedules only after decode");
    buttons["Slideshow / Pause"]();
    assert.strictEqual(timers.size, 0);
    buttons["Next photo"](); await settle();
    viewer.close();
    pending[3].resolve(blob(100, "image/jpeg")); await settle();
    assert.strictEqual(created.length, 2, "Closed viewer ignores late downloads");
    assert.deepStrictEqual(revoked, created);
    assert.strictEqual(timers.size, 0);
    assert.strictEqual(image.onload, null);
    var paged = options(49);
    paged.items = Array.from({ length: 50 }, function (_, i) { return { type: "photo", title: "Photo " + i }; });
    var pages = [];
    paged.source = { start: 0, total: 1001, load: function (start) {
        pages.push(start);
        return Promise.resolve({ offset: start, totalSize: 1001,
            Metadata: Array.from({ length: Math.min(50, 1001 - start) }, function (_, i) {
                return { type: "photo", title: "Photo " + (start + i) };
            }) });
    } };
    var cancelled = 0;
    paged.client.cancelRequests = function () { cancelled += 1; };
    viewer = context.VemmPhotos.create(paged);
    await settle();
    var last = pending.length - 1;
    pending[last].resolve(blob(1024, "image/jpeg")); await settle();
    image.onload();
    buttons["Next photo"](); await settle();
    assert.deepStrictEqual(pages, [50], "Next crosses the metadata page instead of wrapping to photo zero");
    last += 1;
    pending[last].resolve(blob(1024, "image/jpeg")); await settle();
    image.onload();
    assert(messages.pop().startsWith("51 / 1001"));
    assert(buttons["Rotate photo"], "Rotation must be a real remote-focusable control");
    buttons["Rotate photo"]();
    assert(image.style.transform.includes("rotate(90deg)"));
    assert(image.style.transform.includes("scale(0.4375)"), "Quarter-turn fits the existing image slot");
    buttons["Next photo"](); await settle();
    assert(image.style.transform.includes("rotate(0deg)"), "Rotation belongs to the selected photo");
    last += 1;
    pending[last].resolve(blob(1024, "image/jpeg")); await settle();
    buttons["Slideshow / Pause"]();
    buttons["Slideshow / Pause"]();
    assert.strictEqual(timers.size, 1, "Pausing the slideshow must retain the in-flight decode deadline");
    image.onload();
    assert.strictEqual(timers.size, 0, "A paused slideshow cannot advance after decode");
    buttons["Next photo"](); await settle();
    last = pending.length - 1;
    var beforeOversize = created.length;
    pending[last].resolve(blob(4 * 1024 * 1024 + 1, "image/jpeg")); await settle();
    assert.strictEqual(created.length, beforeOversize, "Oversized downloads cannot allocate a Blob URL");
    assert(messages.pop().includes("limit"));
    buttons["Retry photo"](); await settle();
    last = pending.length - 1;
    pending[last].resolve(blob(100, "image/svg+xml")); await settle();
    assert.strictEqual(created.length, beforeOversize, "Only raster photo responses are decoded");
    buttons["Retry photo"](); await settle();
    last = pending.length - 1;
    pending[last].resolve(blob(100, "image/jpeg", 10000, 10000)); await settle();
    assert.strictEqual(created.length, beforeOversize, "Oversized raster headers are rejected before native decode");
    assert(messages.pop().includes("limit"));
    buttons["Retry photo"](); await settle();
    last = pending.length - 1;
    pending[last].resolve(blob(100, "image/jpeg")); await settle();
    image.naturalWidth = 10000; image.naturalHeight = 10000;
    image.onload();
    assert(messages.pop().includes("limit"), "Unexpected decoded dimensions fail visibly");
    viewer.close();
    assert(cancelled > 0, "Navigation and teardown cancel owned downloads");
    assert.strictEqual(timers.size, 0);
    assert.deepStrictEqual(revoked, created);
    paged = options(49);
    paged.items = Array.from({ length: 50 }, function (_, i) { return { type: "photo", title: "Photo " + i }; });
    var pagePending = [];
    paged.source = { start: 0, total: 1001, load: function () {
        return new Promise(function (resolve, reject) { pagePending.push({ resolve: resolve, reject: reject }); });
    } };
    viewer = context.VemmPhotos.create(paged); await settle();
    pending[pending.length - 1].resolve(blob(100, "image/png")); await settle();
    image.onload();
    buttons["Next photo"](); await settle();
    pagePending[0].reject(new Error("Synthetic album unavailable")); await settle();
    assert(messages.pop().includes("Synthetic album unavailable"));
    buttons["Retry photo"](); await settle();
    pagePending[1].resolve({ offset: 0, totalSize: 1001, Metadata: [{ type: "photo" }] }); await settle();
    assert(messages.pop().includes("incomplete"), "A mismatched metadata cursor fails instead of showing the wrong photo");
    buttons["Retry photo"](); await settle();
    buttons["Previous photo"](); await settle();
    var downloads = pending.length;
    pagePending[2].resolve({ offset: 50, totalSize: 1001, Metadata: [{ type: "photo", title: "Stale" }] }); await settle();
    assert.strictEqual(pending.length, downloads, "Superseded metadata cannot issue a photo request");
    pending[pending.length - 1].resolve(blob(100, "image/png")); await settle();
    image.onload();
    buttons["Next photo"](); await settle();
    viewer.close();
    pagePending[3].resolve({ offset: 50, totalSize: 1001, Metadata: [{ type: "photo", title: "Closed" }] }); await settle();
    assert.strictEqual(pending.length, downloads, "Closed viewers ignore late page results");
    assert.strictEqual(timers.size, 0);
    assert.deepStrictEqual(revoked, created);
    assert(headerReads.every(function (size) { return size === 256 * 1024; }), "Raster header reads have a fixed byte ceiling");
    var stalled = options(0);
    var Reader = context.FileReader;
    context.FileReader = function () {
        this.readAsArrayBuffer = function () {};
        this.abort = function () { headerAborts += 1; };
    };
    viewer = context.VemmPhotos.create(stalled); await settle();
    pending[pending.length - 1].resolve(blob(100, "image/jpeg")); await settle();
    assert.strictEqual(timers.size, 1, "Header reading shares the decode deadline");
    buttons["Slideshow / Pause"](); buttons["Slideshow / Pause"]();
    assert.strictEqual(timers.size, 1);
    viewer.close(); viewer.close();
    assert.strictEqual(headerAborts, 1, "Teardown aborts a stalled header read exactly once");
    assert.strictEqual(timers.size, 0);
    context.FileReader = Reader;
    console.log("Tizen photo generation/decode deadline/slideshow/resource cleanup: passed");
}
run().catch(function (error) { console.error(error); process.exitCode = 1; });
