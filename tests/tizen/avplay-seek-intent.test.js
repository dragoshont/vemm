"use strict";
var assert = require("assert");
var av = require("../../samsung/Vemm/js/avplay.js");

function fixture(initial) {
    var nativeState = "NONE", time = 0, listener, completion, outstanding = false;
    var calls = [];
    var native = {
        getState: function () { return nativeState; },
        open: function () { nativeState = "IDLE"; },
        close: function () { nativeState = "NONE"; outstanding = false; },
        stop: function () { nativeState = "IDLE"; outstanding = false; },
        setDisplayRect: function () {}, setDisplayMethod: function () {},
        setListener: function (value) { listener = value; },
        prepareAsync: function (done) { nativeState = "READY"; done(); },
        getDuration: function () { return 100000; },
        getCurrentTime: function () { assert(!outstanding, "Wait for the native seek callback before reading time"); return time; },
        play: function () {
            assert(!outstanding, "Do not call native Play during asynchronous seek");
            assert.notStrictEqual(nativeState, "PLAYING", "Do not play an already playing decoder during a seek");
            calls.push("play"); nativeState = "PLAYING";
        },
        pause: function () {
            assert(!outstanding, "Do not call native Pause during asynchronous seek");
            assert.strictEqual(nativeState, "PLAYING", "Pause only a playing decoder");
            calls.push("pause"); nativeState = "PAUSED";
        },
        seekTo: function (target, done, failed) {
            calls.push("seek-" + nativeState);
            nativeState = "PLAYING"; outstanding = true;
            completion = function (result, state) {
                outstanding = false;
                nativeState = state || "PLAYING"; time = Math.floor(target / 1000) * 1000;
                if (result === "failed") { failed(); } else { done(); }
            };
        }
    };
    var adapter = av.create({ avplay: native, seekTimeout: 5, resumeSeekTimeout: 5 });
    return { native: native, adapter: adapter, calls: calls,
        start: async function (offset) { await adapter.open("https://synthetic.invalid/media", offset || 0, initial === "paused"); },
        complete: function (result, state) { completion(result, state); },
        bufferLanding: function (position) {
            listener.onbufferingstart(); time = position; listener.onbufferingcomplete();
        },
        fail: function () { listener.onerror(); }, state: function () { return nativeState; } };
}

var cases = {
    "paused-success": async function (f) {
        var pending = f.adapter.seek(12555);
        f.complete();
        assert.strictEqual(await pending, 12000);
        assert.strictEqual(f.state(), "PAUSED", "Seek completion must restore actual native pause, not just the adapter enum");
    },
    "paused-failure": async function (f) {
        var pending = assert.rejects(f.adapter.seek(12555), /seek/);
        f.complete("failed"); await pending;
        assert.strictEqual(f.state(), "PAUSED", "Failed seeks cannot leave a paused viewer playing");
    },
    "paused-timeout": async function (f) {
        await assert.rejects(f.adapter.seek(12555), /seek-timeout/);
        assert.strictEqual(f.adapter.snapshot().state, "error", "A missing callback cannot be a verified paused landing");
        await assert.rejects(f.adapter.seek(5000), /Cannot seek/, "A failed outstanding native operation cannot admit another seek");
        f.complete();
        assert.strictEqual(f.state(), "PAUSED", "A late callback for the latest owned seek cannot resume paused output");
        assert.strictEqual(f.adapter.snapshot().state, "error", "Late intent restoration cannot turn a timed-out operation into success");
        assert.strictEqual(f.adapter.snapshot().position, 0, "A timed-out callback cannot rewrite the recorded landing");
    },
    "user-play": async function (f) {
        var pending = f.adapter.seek(12555);
        pending.catch(function () {});
        f.adapter.play();
        f.complete(); await pending;
        assert.strictEqual(f.state(), "PLAYING", "A new explicit Play supersedes pre-seek pause");
        assert.strictEqual(f.adapter.snapshot().state, "playing");
    },
    "user-pause": async function (f) {
        f.adapter.play();
        var pending = f.adapter.seek(12555);
        pending.catch(function () {});
        f.adapter.pause();
        f.complete(); await pending;
        assert.strictEqual(f.state(), "PAUSED", "A new explicit Pause wins over native completion resuming");
    },
    "playing-success": async function (f) {
        f.adapter.play();
        var pending = f.adapter.seek(12555);
        f.complete(undefined, "PAUSED"); await pending;
        assert.strictEqual(f.state(), "PLAYING", "Playing seeks retain playing intent");
    },
    "retired-success": async function (f) {
        var pending = assert.rejects(f.adapter.seek(12555), /cancelled/);
        f.adapter.close(); await pending;
        await f.adapter.open("https://synthetic.invalid/new-media", 0);
        var pauses = f.calls.filter(function (call) { return call === "pause"; }).length;
        f.complete();
        assert.strictEqual(f.state(), "PLAYING");
        assert.strictEqual(f.adapter.snapshot().position, 0);
        assert.strictEqual(f.calls.filter(function (call) { return call === "pause"; }).length, pauses,
            "An old callback cannot pause a new source");
    },
    "native-error": async function (f) {
        var pending = assert.rejects(f.adapter.seek(12555), /cancelled/);
        var pauses = f.calls.filter(function (call) { return call === "pause"; }).length;
        f.fail(); await pending; f.complete();
        assert.strictEqual(f.adapter.snapshot().state, "error");
        assert.strictEqual(f.calls.filter(function (call) { return call === "pause"; }).length, pauses);
    },
    "pause-refused": async function (f) {
        f.native.pause = function () {};
        var pending = assert.rejects(f.adapter.seek(12555), /seek/);
        f.complete(); await pending;
        assert.strictEqual(f.adapter.snapshot().state, "error", "An unverified native pause is an explicit failure");
    },
    "post-callback-buffering": async function (f) {
        var pending = f.adapter.seek(18021);
        f.complete(); await pending;
        f.bufferLanding(19029);
        assert.strictEqual(f.adapter.snapshot().position, 19029,
            "A second buffering cycle after success must publish the final native landing, not the provisional callback time");
        assert.strictEqual(f.state(), "PAUSED");
    },
    "unreadable-buffer-position": async function (f) {
        f.native.getCurrentTime = function () { throw new Error("synthetic private native error"); };
        f.bufferLanding(19029);
        assert.strictEqual(f.adapter.snapshot().state, "error", "A failed native position read cannot be a successful landing");
    },
    "invalid-buffer-position": async function (f) {
        f.native.getCurrentTime = function () { return NaN; };
        f.bufferLanding(19029);
        assert.strictEqual(f.adapter.snapshot().state, "error", "An invalid native position cannot silently become zero");
    },
    "buffer-before-callback": async function (f) {
        var pending = f.adapter.seek(18021);
        f.bufferLanding(19029);
        assert.strictEqual(f.adapter.snapshot().state, "paused", "Buffer completion cannot read time before the native callback");
        f.complete(); await pending;
        f.bufferLanding(19029);
        assert.strictEqual(f.adapter.snapshot().position, 19029);
    },
    "latest-pending-intent": async function (f) {
        var pending = f.adapter.seek(18021);
        f.adapter.play(); f.adapter.pause();
        f.complete(); await pending;
        assert.strictEqual(f.state(), "PAUSED", "Only the latest queued intent is applied after the native callback");
        assert.strictEqual(f.calls.filter(function (call) { return call === "play"; }).length, 1);
    },
    "other-pending-native-operations": async function (f) {
        var pending = f.adapter.seek(18021);
        pending.catch(function () {});
        assert.throws(function () { f.adapter.tracks(); }, /seek is already/);
        assert.throws(function () { f.adapter.selectTrack("AUDIO", 0); }, /seek is already/);
        assert.throws(function () { f.adapter.subtitles(false); }, /seek is already/);
        assert.throws(function () { f.adapter.suspend(); }, /seek is already/);
        f.complete(); await pending;
    },
    "owned-resume-controls": async function (f) {
        f.adapter.close();
        var opening = f.start(12555);
        opening.catch(function () {});
        assert(f.calls.includes("seek-PLAYING"), "Resume must use the shared owned PLAYING-state seek");
        f.adapter.play(); f.adapter.pause();
        f.complete(); await opening;
        assert.strictEqual(f.state(), "PAUSED");
        assert.strictEqual(f.adapter.snapshot().position, 12000);
    },
    "owned-resume-timeout": async function (f) {
        f.adapter.close();
        await assert.rejects(f.start(12555), /seek-timeout/);
        f.complete();
        assert.strictEqual(f.state(), "PAUSED");
        assert.strictEqual(f.adapter.snapshot().state, "error");
        assert.strictEqual(f.adapter.snapshot().position, 0);
    },
    "invalid-seek-position": async function (f) {
        var pending = assert.rejects(f.adapter.seek(12555), /seek/);
        f.native.getCurrentTime = function () { return NaN; };
        f.complete(); await pending;
        assert.strictEqual(f.adapter.snapshot().state, "error", "A successful callback cannot turn an invalid native clock into zero");
    },
    "native-error-during-restoration": async function (f) {
        var pause = f.native.pause;
        f.native.pause = function () { pause(); f.fail(); };
        var pending = assert.rejects(f.adapter.seek(12555), /cancelled/);
        f.complete(); await pending;
        assert.strictEqual(f.adapter.snapshot().state, "error");
        assert.strictEqual(f.adapter.snapshot().position, 0);
    },
    "close-during-restoration": async function (f) {
        f.native.pause = function () { f.adapter.close(); };
        var pending = assert.rejects(f.adapter.seek(12555), /cancelled/);
        f.complete(); await pending;
        assert.strictEqual(f.adapter.snapshot().state, "idle", "A retired callback cannot turn explicit Close into error");
    }
};

async function run() {
    var failures = [];
    for (var name of Object.keys(cases)) {
        var f = fixture("paused");
        try { await f.start(); await cases[name](f); }
        catch (error) { failures.push(name + ": " + error.message); }
        finally { f.adapter.close(); }
    }
    assert.deepStrictEqual(failures, []);
    console.log("Tizen native seek intent, failure, user controls and retired callbacks: passed");
}
run().catch(function (error) { console.error(error); process.exitCode = 1; });
