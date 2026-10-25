"use strict";
var assert = require("assert");
var av = require("../../samsung/Vemm/js/avplay.js");

function fixture(initial) {
    var nativeState = "NONE", time = 0, listener, completion;
    var calls = [];
    var native = {
        getState: function () { return nativeState; },
        open: function () { nativeState = "IDLE"; },
        close: function () { nativeState = "NONE"; },
        stop: function () { nativeState = "IDLE"; },
        setDisplayRect: function () {}, setDisplayMethod: function () {},
        setListener: function (value) { listener = value; },
        prepareAsync: function (done) { nativeState = "READY"; done(); },
        getDuration: function () { return 100000; },
        getCurrentTime: function () { return time; },
        play: function () {
            assert.notStrictEqual(nativeState, "PLAYING", "Do not play an already playing decoder during a seek");
            calls.push("play"); nativeState = "PLAYING";
        },
        pause: function () {
            assert.strictEqual(nativeState, "PLAYING", "Pause only a playing decoder");
            calls.push("pause"); nativeState = "PAUSED";
        },
        seekTo: function (target, done, failed) {
            nativeState = "PLAYING";
            completion = function (result, state) {
                nativeState = state || "PLAYING"; time = Math.floor(target / 1000) * 1000;
                if (result === "failed") { failed(); } else { done(); }
            };
        }
    };
    var adapter = av.create({ avplay: native, seekTimeout: 5 });
    return { native: native, adapter: adapter, calls: calls,
        start: async function () { await adapter.open("https://synthetic.invalid/media", 0, initial === "paused"); },
        complete: function (result, state) { completion(result, state); },
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
        assert.strictEqual(f.state(), "PAUSED", "A lost native callback cannot discard paused intent");
        f.complete();
        assert.strictEqual(f.state(), "PAUSED", "A late callback for the latest owned seek cannot resume paused output");
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
