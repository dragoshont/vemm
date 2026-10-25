"use strict";
var assert = require("assert");
var createClient = require("../../samsung/Vemm/js/plex-api").createClient;
var spec = require("../../docs/plex-openapi.json");
async function run() {
    var calls = [], type = "image/jpeg", bytes = 100, status = 200, stalled = false, cancelled = 0;
    var photo = { type: "photo", Media: [{ Part: [{ key: "/library/parts/40/file.heic" }] }] };
    var client = createClient({
        baseUrl: "https://pms.synthetic.invalid", token: "synthetic-token",
        fetch: function (target, options) {
            calls.push({ url: new URL(target), options: options });
            return Promise.resolve({ ok: status === 200, status: status,
                headers: { get: function (name) {
                    return name === "Content-Type" ? type : name === "Content-Length" ? String(bytes) : null;
                } },
                body: new ReadableStream({ start: function (controller) {
                    if (!stalled) { controller.enqueue(new Uint8Array(bytes)); controller.close(); }
                }, cancel: function () { cancelled += 1; } })
            });
        }
    });
    var blob = await client.photo(photo);
    assert.strictEqual(blob.size, 100);
    assert.strictEqual(blob.type, "image/jpeg");
    var call = calls[0];
    assert.strictEqual(call.url.pathname, "/photo/:/transcode");
    var parameters = spec.paths["/photo/:/transcode"].get.parameters;
    ["format", "rotate", "width", "height", "minSize", "upscale", "url"].forEach(function (name) {
        assert(parameters.some(function (parameter) { return parameter.name === name; }), "Documented photo parameter: " + name);
    });
    assert.strictEqual(call.url.searchParams.get("format"), "jpg", "PMS normalizes source formats to a bounded raster");
    assert.strictEqual(call.url.searchParams.get("rotate"), "1", "PMS applies EXIF orientation independently of user rotation");
    assert.strictEqual(call.url.searchParams.get("width"), "1920");
    assert.strictEqual(call.url.searchParams.get("height"), "1080");
    assert.strictEqual(call.url.searchParams.get("minSize"), "0");
    assert.strictEqual(call.url.searchParams.get("upscale"), "0");
    assert.strictEqual(call.url.searchParams.get("url"), photo.Media[0].Part[0].key);
    assert.strictEqual(call.options.headers["X-Plex-Token"], "synthetic-token");
    assert.strictEqual(call.options.redirect, "error");
    assert.strictEqual(call.options.credentials, "omit");
    assert(!call.url.href.includes("synthetic-token"));
    type = "image/svg+xml";
    await assert.rejects(client.photo(photo), /JPEG or PNG/);
    type = "image/png";
    assert.strictEqual((await client.photo(photo)).type, "image/png");
    bytes = 4 * 1024 * 1024 + 1;
    await assert.rejects(client.photo(photo), /limit/);
    bytes = 0;
    await assert.rejects(client.photo(photo), /empty/);
    bytes = 100; status = 415;
    await assert.rejects(client.photo(photo), /HTTP 415/);
    var count = calls.length;
    await assert.rejects(client.photo({ thumb: "https://untrusted.invalid/image.jpg" }), /local resource/);
    assert.strictEqual(calls.length, count, "Photo paths cannot send the server grant off origin");
    status = 200; stalled = true;
    var request = client.photo(photo);
    for (var i = 0; i < 20; i += 1) { await Promise.resolve(); }
    client.cancelRequests();
    await assert.rejects(request, function (error) { return error.code === "cancelled"; });
    assert.strictEqual(cancelled, 1, "Closing/navigating the viewer cancels a stalled photo body");
    console.log("Tizen photo documented transcode/EXIF/format/byte-bound/cancellation contracts: passed");
}
run().catch(function (error) { console.error(error); process.exitCode = 1; });
