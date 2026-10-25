"use strict";
var assert = require("assert");
var fileInfo = require("../../samsung/Vemm/js/file-info.js");
assert.strictEqual(typeof fileInfo.supportRecord, "function", "A bounded allowlist must build support records");
var privateText = "PRIVATE_TOKEN_DUID_TITLE_SERVER_PROFILE_SESSION";
var bad = { title: privateText, model: privateText, version: privateText, codec: privateText,
    videoCodec: privateText, audioCodec: privateText, container: privateText,
    width: privateText, height: privateText, bitrate: privateText, Part: [{ key: privateText }] };
var hostile = { source: bad, stream: bad, mode: privateText, limit: privateText,
    explanation: { reason: privateText, fallback: privateText,
        capability: { status: privateText, measured: true, source: privateText } } };
var record = fileInfo.supportRecord(hostile, privateText);
assert(!JSON.stringify(record).includes(privateText));
assert(JSON.stringify(record).length < 1600);
assert.strictEqual(record.mode, null);
assert.strictEqual(record.reason, null);
assert.strictEqual(record.nativeOutput, "not-measured");
assert.strictEqual(record.serverReportedOutput.videoCodec, null);
["__proto__", "constructor", "toString", new String("h264"), ["h264"], { toString: function () {
    throw new Error("Never coerce arbitrary objects");
} }].forEach(function (value) {
    var result = fileInfo.supportRecord({ source: { videoCodec: value, width: value },
        explanation: { reason: value, capability: { status: value } } }, value);
    assert.strictEqual(result.source.videoCodec, null);
    assert.strictEqual(result.source.width, null);
    assert.strictEqual(result.reason, null);
});
[NaN, Infinity, -1, 1e20, true, "1920", 12.5].forEach(function (value) {
    assert.strictEqual(fileInfo.supportRecord({ stream: { width: value } }).serverReportedOutput.width, null);
});
var safe = fileInfo.supportRecord({ source: { width: 3840, height: 2160, videoCodec: "hevc", bitrate: 30000 },
    stream: { width: 1280, height: 720, videoCodec: "h264", audioCodec: "aac", bitrate: 3000 },
    limit: "1080", mode: "transcode", explanation: { reason: "quality", fallback: "none",
        capability: { status: "documented", measured: true } } });
assert.strictEqual(safe.requestedCeiling, "1080");
assert.strictEqual(safe.serverReportedOutput.height, 720);
assert.strictEqual(safe.source.height, 2160);
assert.strictEqual(safe.nativeOutput, "not-measured");
assert.strictEqual(safe.nextAction, "quality-settings");
var selectedAudio = fileInfo.supportRecord({ explanation: { reason: "audio-track" } });
assert.strictEqual(selectedAudio.reason, "audio-track");
assert.strictEqual(selectedAudio.nextAction, "track-settings");
assert.strictEqual(fileInfo.supportRecord(null, "720").requestedCeiling, "720");
require("../../samsung/Vemm/js/preferences.js").qualities.forEach(function (quality) {
    assert.strictEqual(fileInfo.supportRecord({ limit: quality }).requestedCeiling, quality);
});
assert.deepStrictEqual(Object.keys(record), ["schema", "playbackActive", "requestedCeiling", "mode",
    "reason", "nextAction", "fallback", "capabilityEvidence", "source", "serverReportedOutput", "nativeOutput"]);
assert.deepStrictEqual(Object.keys(record.source), ["container", "videoCodec", "audioCodec", "width", "height", "bitrateKbps"]);
assert.strictEqual(fileInfo.supportRecord({ mode: "transcode", limit: "1080" }).serverReportedOutput, null,
    "Never fill missing PMS output with the requested ceiling");
console.log("Tizen explicit-allowlist support record privacy and evidence boundaries: passed");
