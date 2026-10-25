(function (root, factory) {
    var api = factory();
    if (typeof module === "object" && module.exports) { module.exports = api; }
    else { root.VemmAvplay = api; }
}(this, function () {
    "use strict";

    function create(options) {
        options = options || {};
        var avplay = options.avplay;
        var emit = options.onEvent || function () {};
        var generation = 0;
        var state = "idle";
        var position = 0;
        var duration = 0;
        var pending = null;
        var pendingSeek = null;
        var seekSequence = 0;
        var timer = null;

        function notify(type, detail) { emit({ type: type, state: state, position: position, duration: duration, detail: detail }); }
        function transition(next) { state = next; notify("state"); }
        function error(operation) {
            var failure = new Error("Samsung playback failed during " + operation + ". Stop and retry this title.");
            failure.code = "avplay-" + operation;
            return failure;
        }
        function requireState(allowed, operation) {
            if (!avplay) { throw new Error("Samsung AVPlay is not available in this runtime."); }
            if (allowed.indexOf(state) === -1) { throw new Error("Cannot " + operation + " while playback is " + state + "."); }
        }
        function requireSeekSettled() {
            if (pendingSeek) { throw new Error("A seek is already in progress. Wait before seeking again."); }
        }
        function currentPosition() {
            var value = avplay.getCurrentTime();
            if (typeof value !== "number" || !isFinite(value) || value < 0) { throw error("position"); }
            return Math.round(value);
        }
        function cancelPending() {
            if (timer !== null) { clearTimeout(timer); timer = null; }
            if (pending) { var reject = pending; pending = null; reject(new Error("Playback preparation was cancelled.")); }
        }
        function close() {
            generation += 1;
            cancelPending();
            if (pendingSeek) { pendingSeek(new Error("Seek cancelled.")); }
            if (avplay && state !== "idle") {
                try {
                    var nativeState = avplay.getState();
                    if (nativeState === "PLAYING" || nativeState === "PAUSED") { avplay.stop(); }
                    avplay.close();
                } catch (failure) {
                    transition("error");
                    throw error("close");
                }
            }
            position = 0;
            duration = 0;
            transition("idle");
        }
        function open(url, offset, paused) {
            if (!avplay) { return Promise.reject(new Error("Samsung AVPlay is unavailable. Use an authorized Samsung TV runtime.")); }
            close();
            if (!/^https?:\/\//.test(url) || /[\r\n]/.test(url)) {
                return Promise.reject(new Error("The playback URL is invalid."));
            }
            var ownGeneration = generation;
            transition("preparing");
            return new Promise(function (resolve, reject) {
                pending = reject;
                function failed(operation) {
                    if (ownGeneration !== generation || !pending) { return; }
                    clearTimeout(timer);
                    timer = null;
                    pending = null;
                    generation += 1;
                    transition("error");
                    reject(error(operation));
                }
                function streamFailed(operation) {
                    if (ownGeneration !== generation) { return; }
                    if (pending) { failed("prepare"); }
                    else {
                        generation += 1;
                        if (pendingSeek) { pendingSeek(new Error("Seek cancelled.")); }
                        transition("error"); notify("error", error(operation).message);
                    }
                }
                try {
                    avplay.open(url);
                    avplay.setDisplayRect(0, 0, 1920, 1080);
                    avplay.setDisplayMethod("PLAYER_DISPLAY_MODE_LETTER_BOX");
                    avplay.setListener({
                        onbufferingstart: function () {
                            if (ownGeneration === generation) { notify("buffering", true); }
                        },
                        onbufferingprogress: function (percent) {
                            if (ownGeneration === generation) { notify("buffer-progress", percent); }
                        },
                        onbufferingcomplete: function () {
                            if (ownGeneration !== generation) { return; }
                            try {
                                if (!pendingSeek && (state === "playing" || state === "paused" || state === "ready")) {
                                    position = currentPosition();
                                    notify("time");
                                }
                                if (ownGeneration === generation) { notify("buffering", false); }
                            } catch (failure) { streamFailed("position"); }
                        },
                        oncurrentplaytime: function (time) {
                            if (ownGeneration === generation && typeof time === "number" && isFinite(time)) {
                                position = Math.max(0, Math.round(time));
                                notify("time");
                            }
                        },
                        onsubtitlechange: function (length, text) {
                            if (ownGeneration === generation) { notify("subtitle", { text: String(text || ""), duration: length }); }
                        },
                        onstreamcompleted: function () {
                            if (ownGeneration === generation) {
                                generation += 1;
                                cancelPending();
                                if (pendingSeek) { pendingSeek(new Error("Seek cancelled.")); }
                                position = Math.max(position, duration);
                                transition("ended");
                                notify("ended");
                            }
                        },
                        onerror: function () {
                            streamFailed("stream");
                        }
                    });
                    timer = setTimeout(function () { failed("prepare-timeout"); }, options.prepareTimeout || 25000);
                    avplay.prepareAsync(function () {
                        if (ownGeneration !== generation || !pending) { return; }
                        try {
                            duration = Math.max(0, Number(avplay.getDuration()) || 0);
                            transition("ready");
                            if (ownGeneration !== generation || !pending) { return; }
                            var resumeWait = options.resumeSeekTimeout || 8000;
                            // READY-state HLS seeks can never call back on older TVs.
                            // Start first, then use the same owned seek as remote actions.
                            avplay.play();
                            if (ownGeneration !== generation || !pending) { return; }
                            if (paused && !(offset > 0)) { avplay.pause(); }
                            position = currentPosition();
                            clearTimeout(timer);
                            timer = null;
                            pending = null;
                            transition(paused ? "paused" : "playing");
                            if (offset > 0) {
                                seek(offset, resumeWait).then(resolve, function (failure) {
                                    failure.playbackPhase = "resume";
                                    reject(failure);
                                });
                            }
                            else { resolve(); }
                        } catch (failure) { failed("prepare"); }
                    }, function () { failed("prepare"); });
                } catch (failure) { failed("open"); }
            });
        }
        function seek(target, wait) {
            try { requireState(["playing", "paused", "ready"], "seek"); }
            catch (failure) { return Promise.reject(failure); }
            if (typeof target !== "number" || !isFinite(target)) { return Promise.reject(new Error("Invalid seek position.")); }
            try { requireSeekSettled(); } catch (failure) { return Promise.reject(failure); }
            var ownGeneration = generation;
            var ownSeek = ++seekSequence;
            var intendedState = state;
            target = Math.max(0, Math.min(duration || target, Math.round(target)));
            return new Promise(function (resolve, reject) {
                var settled = false;
                var timedOut = false;
                var timeout = setTimeout(function () {
                    if (settled) { return; }
                    settled = true;
                    timedOut = true;
                    var failure = error("seek-timeout");
                    transition("error");
                    notify("error", failure.message);
                    reject(failure);
                }, wait || options.seekTimeout || 10000);
                function retainState() {
                    var expected = intendedState.toUpperCase();
                    var nativeState = avplay.getState();
                    if (ownGeneration !== generation) { throw new Error("Seek cancelled."); }
                    // Native completion must match the latest owned Play/Pause
                    // intent, including changes made while seeking.
                    if (intendedState === "paused" && nativeState === "PLAYING") { avplay.pause(); }
                    else if (intendedState === "playing" && nativeState === "PAUSED") { avplay.play(); }
                    if (ownGeneration !== generation) { throw new Error("Seek cancelled."); }
                    if (avplay.getState() !== expected) { throw error("seek-state"); }
                }
                function stateFailure() {
                    if (ownGeneration !== generation) { return new Error("Seek cancelled."); }
                    var failure = error("seek-state");
                    generation += 1;
                    if (pendingSeek === finish) { pendingSeek = null; }
                    transition("error");
                    notify("error", failure.message);
                    return failure;
                }
                function finish(failure) {
                    if (settled) {
                        if (ownGeneration !== generation) {
                            if (pendingSeek === finish) { pendingSeek = null; }
                        } else if (timedOut && ownSeek === seekSequence && pendingSeek === finish) {
                            pendingSeek = null;
                            try { retainState(); } catch (nativeFailure) { stateFailure(); }
                        }
                        return;
                    }
                    settled = true;
                    clearTimeout(timeout);
                    pendingSeek = null;
                    if (ownGeneration === generation) {
                        try {
                            retainState();
                            if (ownGeneration !== generation) { throw new Error("Seek cancelled."); }
                            if (!failure) {
                                var landed = currentPosition();
                                if (ownGeneration !== generation) { throw new Error("Seek cancelled."); }
                                position = landed;
                            }
                        } catch (nativeFailure) {
                            failure = stateFailure();
                        }
                    } else if (!failure) { failure = new Error("Seek cancelled."); }
                    if (failure) { reject(failure); }
                    else { resolve(position); notify("time"); }
                }
                pendingSeek = finish;
                pendingSeek.intent = function (next) { intendedState = next; };
                try {
                    avplay.seekTo(target, function () {
                        if (ownGeneration !== generation) { finish(new Error("Seek cancelled.")); return; }
                        finish(null);
                    }, function () { finish(error("seek")); });
                } catch (failure) { finish(error("seek")); }
            });
        }
        return {
            open: open, close: close, seek: seek,
            snapshot: function () { return { state: state, position: position, duration: duration }; },
            pause: function () {
                requireState(["playing"], "pause");
                try {
                    if (pendingSeek) { pendingSeek.intent("paused"); }
                    else { avplay.pause(); }
                    transition("paused");
                } catch (failure) { throw error("pause"); }
            },
            play: function () {
                requireState(["paused", "ready"], "play");
                try {
                    if (pendingSeek) { pendingSeek.intent("playing"); }
                    else { avplay.play(); }
                    transition("playing");
                } catch (failure) { throw error("play"); }
            },
            tracks: function () {
                requireState(["ready", "playing", "paused"], "list tracks");
                requireSeekSettled();
                try { return avplay.getTotalTrackInfo(); } catch (failure) { throw error("tracks"); }
            },
            selectTrack: function (type, index) {
                requireState(["playing", "paused"], "change track");
                requireSeekSettled();
                if (["AUDIO", "TEXT"].indexOf(type) === -1 || typeof index !== "number" || index < 0) {
                    throw new Error("Invalid playback track.");
                }
                var resume = state === "playing";
                try {
                    if (resume) { avplay.pause(); }
                    avplay.setSelectTrack(type, index);
                    if (resume) { avplay.play(); }
                } catch (failure) {
                    if (resume && avplay.getState() === "PAUSED") {
                        try { avplay.play(); } catch (resumeFailure) { transition("error"); }
                    }
                    throw error("track-selection");
                }
            },
            subtitles: function (enabled) {
                requireState(["playing", "paused"], "change subtitles");
                requireSeekSettled();
                try { avplay.setSilentSubtitle(!enabled); } catch (failure) { throw error("subtitles"); }
            },
            suspend: function () {
                requireState(["playing", "paused"], "suspend");
                requireSeekSettled();
                try { avplay.suspend(); transition("suspended"); } catch (failure) { throw error("suspend"); }
            },
            restore: function () {
                requireState(["suspended"], "restore");
                requireSeekSettled();
                try { avplay.restore(); transition("paused"); } catch (failure) { throw error("restore"); }
            }
        };
    }
    return { create: create };
}));
