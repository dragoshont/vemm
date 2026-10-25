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
    var w = dom.window;
    var d = w.document;
    var switches = [];
    var discovered = [];
    var profileReads = 0;
    var oldReads = 0;
    var resolveOldPage;
    var holdOldPage = false;
    var profileFailure = false;
    var profiles = [
        { uuid: "synthetic-owner", title: "Synthetic owner", admin: true, protected: true },
        { uuid: "synthetic-managed", title: "Synthetic managed", protected: true }
    ];
    w.fetch = function () { assert.fail("Profile boundaries use synthetic clients, never household accounts"); };
    ["js/i18n.js", "js/preferences.js", "js/home-hero.js"].forEach(function (file) {
        w.eval(fs.readFileSync(path.join(app, file), "utf8"));
    });
    w.VemmSession = { load: function () { return "synthetic-root-token"; } };
    function serverClient(token) {
        var owner = token === "synthetic-root-token";
        var title = owner ? "Owner-only synthetic title" : "Managed synthetic title";
        var metadata = { ratingKey: owner ? "101" : "201", type: "movie", title: title };
        return {
            cancelRequests: function () {},
            getSections: function () { return Promise.resolve([{ key: "1", title: "Movies", type: "movie" }]); },
            getHomeHubs: function () {
                if (owner) { oldReads += 1; }
                return Promise.resolve([{ title: "Recent", hubIdentifier: "recent", Metadata: [metadata] }]);
            },
            getSectionItems: function () {
                if (owner) { oldReads += 1; }
                var page = { items: [metadata], offset: 0, totalSize: 1 };
                if (owner && holdOldPage) {
                    holdOldPage = false;
                    return new Promise(function (resolve) { resolveOldPage = function () { resolve(page); }; });
                }
                return Promise.resolve(page);
            }
        };
    }
    w.PlexApi = {
        createAccountClient: function (options) {
            var token = options.token;
            return {
                cancelRequests: function () {},
                getProfiles: function () {
                    profileReads += 1;
                    return profileFailure ? Promise.reject(new Error("Synthetic profile lookup failed")) : Promise.resolve(profiles);
                },
                switchProfile: function (uuid, pin) {
                    switches.push([uuid, pin]);
                    assert.strictEqual(pin, "1234");
                    return Promise.resolve(uuid === "synthetic-managed" ? "synthetic-managed-token" : "synthetic-root-token");
                },
                getServers: function () {
                    discovered.push(token);
                    return Promise.resolve([{ id: "synthetic-server", name: "Synthetic PMS", owned: true,
                        token: token, connections: [{ uri: "https://pms.synthetic.invalid" }] }]);
                }
            };
        },
        selectServer: function (server) { return Promise.resolve({ relay: false, client: serverClient(server.token) }); }
    };
    w.eval(fs.readFileSync(path.join(app, "main.js"), "utf8"));
    function key(code) {
        d.dispatchEvent(new w.KeyboardEvent("keydown", { keyCode: code, bubbles: true }));
        d.dispatchEvent(new w.KeyboardEvent("keyup", { keyCode: code, bubbles: true }));
    }
    function press(label) {
        var control = Array.from(d.querySelectorAll("button")).find(function (node) {
            return node.textContent.trim() === label && !node.closest("[hidden]");
        });
        assert(control, "Missing remote action: " + label + " / " + d.getElementById("status").textContent);
        control.focus();
        key(13);
    }
    async function settle() {
        for (var i = 0; i < 8; i += 1) { await new Promise(function (resolve) { setImmediate(resolve); }); }
    }
    function assertNoOwnerContent() {
        assert(!d.body.textContent.includes("Owner-only synthetic title"),
            "Profile selection and managed scope must never restore the old profile's retained metadata");
    }
    try {
        await settle();
        press("Use linked account"); await settle();
        assert(d.querySelector('input[type="password"]'),
            "The linked-owner shortcut must require the protected owner's PIN");
        assert.strictEqual(discovered.length, 0, "The root token cannot discover owner servers before PIN authorization");
        d.querySelector('input[type="password"]').value = "1234";
        press("Use this profile"); await settle();
        press("Synthetic PMS (owned)"); await settle();
        press("Movies"); await settle();
        assert(d.body.textContent.includes("Owner-only synthetic title"));
        holdOldPage = true;
        press("Account"); press("Refresh");
        assert(resolveOldPage, "The old library request is pending at the profile boundary");
        press("Account"); press("Change server"); await settle();
        press("Change profile"); await settle();
        press("Synthetic managed");
        var before = oldReads;
        key(10009); await settle();
        assert(d.querySelector(".screen-profiles"), "Remote Back from PIN entry returns to profiles, not an old library");
        assertNoOwnerContent();
        resolveOldPage(); await settle();
        assertNoOwnerContent();
        assert.strictEqual(oldReads, before, "Back cannot reload the previous profile's Home through a retained restore closure");
        press("Synthetic managed");
        d.querySelector('input[type="password"]').value = "12";
        press("Use this profile"); await settle();
        assert.strictEqual(switches.length, 1, "Invalid PIN cannot initiate another profile switch");
        d.querySelector('input[type="password"]').value = "1234";
        press("Use this profile"); await settle();
        press("Synthetic PMS (owned)"); await settle();
        assert(d.body.textContent.includes("Managed synthetic title"));
        assertNoOwnerContent();
        key(10009); await settle();
        assertNoOwnerContent();
        assert.strictEqual(oldReads, before, "Post-switch Back cannot restore or read owner libraries");
        assert.deepStrictEqual(discovered, ["synthetic-root-token", "synthetic-root-token", "synthetic-managed-token"]);
        assert(profileReads >= 3, "The PIN Back action refreshes profile choices without unlocking one");
        press("Account"); press("Change server"); await settle();
        press("Change profile"); await settle();
        var ownerDiscoveries = discovered.filter(function (token) { return token === "synthetic-root-token"; }).length;
        press("Use linked account"); await settle();
        assert(d.querySelector('input[type="password"]'),
            "A managed viewer cannot enter the protected owner through Use linked account");
        assert.strictEqual(discovered.filter(function (token) { return token === "synthetic-root-token"; }).length,
            ownerDiscoveries, "No owner-only server discovery occurs without a fresh owner PIN");
        assertNoOwnerContent();
        profileFailure = true;
        press("Back to profiles"); await settle();
        assert(!Array.from(d.querySelectorAll("button")).some(function (node) {
            return node.textContent === "Use linked account";
        }), "Profile-list failure must not expose an unverified linked-owner fallback");
        assert(d.getElementById("status").textContent.includes("Synthetic profile lookup failed"));
        assert.strictEqual(discovered.filter(function (token) { return token === "synthetic-root-token"; }).length,
            ownerDiscoveries);
        profileFailure = false;
        var knownProfiles = profiles;
        profiles = [];
        press("Retry profiles"); await settle();
        assert(!Array.from(d.querySelectorAll("button")).some(function (node) {
            return node.textContent === "Use linked account";
        }), "An empty profile response cannot expose an unverified owner fallback");
        assert.strictEqual(discovered.filter(function (token) { return token === "synthetic-root-token"; }).length,
            ownerDiscoveries);
        profiles = knownProfiles;
        press("Retry profiles"); await settle();
        press("Use linked account"); await settle();
        d.querySelector('input[type="password"]').value = "1234";
        press("Use this profile"); await settle();
        press("Synthetic PMS (owned)"); await settle();
        assert(d.body.textContent.includes("Owner-only synthetic title"),
            "The protected owner remains usable after successful fresh PIN authorization");
        profiles[0].protected = false;
        press("Account"); press("Change server"); await settle();
        press("Change profile"); await settle();
        press("Synthetic managed"); await settle();
        d.querySelector('input[type="password"]').value = "1234";
        press("Use this profile"); await settle();
        press("Synthetic PMS (owned)"); await settle();
        assertNoOwnerContent();
        press("Account"); press("Change server"); await settle();
        press("Change profile"); await settle();
        press("Use linked account"); await settle();
        press("Synthetic PMS (owned)"); await settle();
        assert(d.body.textContent.includes("Owner-only synthetic title"),
            "An explicitly unprotected owner shortcut must restore the owner's grant, not relabel a managed grant");
    } finally { w.close(); }
    console.log("Tizen profile-boundary Back, late library cancellation, PIN and grant isolation: passed");
}
run().catch(function (error) { console.error(error.stack || error); process.exitCode = 1; });
