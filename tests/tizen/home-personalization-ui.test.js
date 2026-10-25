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
    var storageKey = "vemm-tizen-home-layouts";
    var hub = function (id, title, section) {
        return { hubIdentifier: id, title: title, librarySectionID: section, size: 75,
            Metadata: Array.from({ length: 12 }, function (_, i) {
                return { type: "movie", ratingKey: title + i, title: title + i };
            }) };
    };
    var hubs = [hub("home.recent", "Recent", 1), hub("home.ondeck", "Continue", 2)];
    window.fetch = function () { throw new Error("No account or media network operations expected"); };
    ["js/home-hero.js", "js/preferences.js", "js/i18n.js", "js/home-layout.js"].forEach(function (file) {
        window.eval(fs.readFileSync(path.join(app, file), "utf8"));
    });
    window.VemmPreferences.save(window.localStorage, {
        quality: "original", language: "en", reducedMotion: true, interfaceTextSize: "large", transcodeAudioVolume: 150
    });
    window.__hubs = hubs;
    window.__client = {};
    var source = fs.readFileSync(path.join(app, "main.js"), "utf8");
    source = source.slice(0, source.lastIndexOf('    addConnectForm("");')) +
        '    currentClient = window.__client; currentServerId = "server-a"; activeProfile = {id:"profile-a"};' +
        'window.__home = function(server, profile) { currentServerId = server; activeProfile = {id:profile};' +
        'renderHome([], window.__hubs); }; renderHome([], window.__hubs); }());';
    window.eval(source);
    function key(code) {
        window.document.dispatchEvent(new window.KeyboardEvent("keydown", { keyCode: code, bubbles: true }));
    }
    function control(text) {
        var result = Array.from(window.document.querySelectorAll("button")).find(function (node) {
            return node.textContent === text;
        });
        assert(result, "Missing remote control: " + text);
        return result;
    }
    function enter(text) {
        var target = control(text);
        assert(!target.closest("[hidden]"), "Remote target must be visible: " + text);
        for (var i = 0; i < 500 && window.document.activeElement !== target; i += 1) {
            var controls = Array.from(window.document.querySelectorAll("button")).filter(function (node) {
                return !node.disabled && !node.closest("[hidden]");
            });
            var before = window.document.activeElement;
            key(controls.indexOf(before) > controls.indexOf(target) ? 38 : 40);
            assert.notStrictEqual(window.document.activeElement, before, "D-pad could not reach: " + text);
        }
        assert.strictEqual(window.document.activeElement, target);
        key(13);
    }
    function customize() {
        if (window.document.querySelector(".home-utilities").hidden) {
            if (window.document.activeElement.textContent === "Home") { key(37); }
            assert.strictEqual(window.document.activeElement.textContent, "Account");
            key(13);
        }
        enter("Customize Home");
    }
    function titles() {
        return Array.from(window.document.querySelectorAll(".hub-title")).map(function (node) { return node.textContent; });
    }
    try {
        assert.deepStrictEqual(titles(), ["Recent", "Continue"]);
        assert(window.document.querySelector(".home-hero"));
        customize();
        assert.strictEqual(window.document.activeElement.textContent, "Featured title: On");
        key(13);
        enter("Hide Recent");
        enter("Move Continue up");
        assert.strictEqual(window.document.activeElement.textContent, "Hide Continue",
            "Ordering into the first position retains ownership on the moved shelf");
        enter("Save Home");
        assert.deepStrictEqual(titles(), ["Continue"]);
        assert.strictEqual(window.document.querySelector(".home-hero"), null);
        assert.strictEqual(window.document.activeElement.textContent, "Customize Home");
        var preserved = window.VemmPreferences.load(window.localStorage);
        assert.strictEqual(preserved.reducedMotion, true);
        assert.strictEqual(preserved.interfaceTextSize, "large");
        assert.strictEqual(preserved.transcodeAudioVolume, 150);
        key(10009);
        assert.strictEqual(window.document.activeElement.textContent, "Account");
        key(39);
        key(40);
        assert(window.document.activeElement.classList.contains("media-card"),
            "Home Down enters the first visible shelf when the hero is hidden");
        key(38);
        assert.strictEqual(window.document.activeElement.textContent, "Home",
            "First shelf Up returns to navigation when the optional hero is hidden");
        assert(!/token|origin|ratingKey|Recent|Continue|synthetic/.test(window.localStorage.getItem(storageKey)));
        window.__home("server-a", "profile-a");
        assert.deepStrictEqual(titles(), ["Continue"], "A new render reloads the scoped layout");
        window.__home("server-a", "profile-b");
        assert.deepStrictEqual(titles(), ["Recent", "Continue"], "Another profile retains server defaults");
        window.__home("server-b", "profile-a");
        assert.deepStrictEqual(titles(), ["Recent", "Continue"], "Another server retains defaults");
        window.__home("server-a", "profile-a");
        customize();
        enter("Show Recent");
        key(10009);
        assert.deepStrictEqual(titles(), ["Continue"], "Remote Back discards unsaved edits");
        assert.strictEqual(window.document.activeElement.textContent, "Customize Home");
        key(13);
        enter("Show Recent");
        var nativeSet = window.Storage.prototype.setItem;
        window.Storage.prototype.setItem = function () { throw new Error("storage refused"); };
        enter("Save Home");
        assert(window.document.querySelector(".screen-personalization"));
        assert(/Could not save Home/.test(window.document.getElementById("status").textContent));
        enter("Retry");
        assert(/Could not save Home/.test(window.document.getElementById("status").textContent),
            "Retry repeats the failed save without discarding the draft");
        assert(control("Hide Recent"));
        window.Storage.prototype.setItem = nativeSet;
        enter("Retry");
        assert.deepStrictEqual(titles(), ["Continue", "Recent"]);
        customize();
        window.Storage.prototype.setItem = function () { throw new Error("reset refused"); };
        enter("Reset this Home");
        assert(/Could not reset Home layouts/.test(window.document.getElementById("status").textContent));
        window.Storage.prototype.setItem = nativeSet;
        enter("Retry");
        assert.deepStrictEqual(titles(), ["Recent", "Continue"]);
        customize();
        enter("Reset this Home");
        assert.deepStrictEqual(titles(), ["Recent", "Continue"]);
        assert(window.document.querySelector(".home-hero"));
        customize();
        enter("Hide Recent");
        enter("Hide Continue");
        enter("Save Home");
        assert.deepStrictEqual(titles(), []);
        assert(/No visible Home shelves/.test(window.document.querySelector(".home-shelves .empty-state").textContent));
        customize();
        enter("Reset this Home");
        window.localStorage.setItem(storageKey, "{bad");
        window.__home("server-a", "profile-a");
        assert(/Home customization/.test(window.document.getElementById("status").textContent));
        customize();
        assert(control("Retry"));
        enter("Reset all Home layouts");
        assert(control("Featured title: On"));
        key(10009);
        assert.deepStrictEqual(titles(), ["Recent", "Continue"]);
        var nativeGet = window.Storage.prototype.getItem;
        window.Storage.prototype.getItem = function (name) {
            if (name === storageKey) { throw new Error("read refused"); }
            return nativeGet.call(this, name);
        };
        window.__home("server-a", "profile-a");
        customize();
        enter("Retry");
        assert(/Home customization could not be loaded/.test(window.document.getElementById("status").textContent));
        window.Storage.prototype.getItem = nativeGet;
        enter("Retry");
        assert(control("Featured title: On"));
        key(10009);
        preserved = window.VemmPreferences.load(window.localStorage);
        assert.strictEqual(preserved.reducedMotion, true);
        assert.strictEqual(preserved.interfaceTextSize, "large");
        assert.strictEqual(preserved.transcodeAudioVolume, 150);
        window.__home("", "");
        customize();
        assert(/verified server and profile/.test(window.document.getElementById("status").textContent));
        assert(!Array.from(window.document.querySelectorAll("button")).some(function (node) {
            return node.textContent === "Save Home";
        }));
    } finally { window.close(); }
    console.log("Tizen Home personalization remote journeys: passed");
}
run().catch(function (error) { console.error(error.stack || error); process.exitCode = 1; });
