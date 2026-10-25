"use strict";
var assert = require("assert");
var createClient = require("../../samsung/Vemm/js/plex-api").createClient;

function fixture(options) {
    options = options || {};
    var title = "Synthetic saved playlist";
    var exists = true;
    var calls = [];
    var release;
    function response(container) {
        return { ok: true, status: 200, json: function () { return Promise.resolve({ MediaContainer: container }); } };
    }
    function metadata() {
        return { ratingKey: "7", type: "playlist", playlistType: "video", smart: "0", title: title };
    }
    var client = createClient({ baseUrl: "https://pms.synthetic.invalid", token: "synthetic-token",
        fetch: function (target, request) {
            var url = new URL(target);
            assert.strictEqual(url.origin, "https://pms.synthetic.invalid");
            assert.strictEqual(request.headers["X-Plex-Token"], "synthetic-token");
            assert.strictEqual(request.redirect, "error");
            assert(!url.searchParams.has("X-Plex-Token"));
            calls.push({ path: url.pathname, method: request.method });
            if (request.method !== "GET") {
                if (options.denied) { return Promise.resolve({ ok: false, status: 403 }); }
                if (request.method === "POST") {
                    assert.strictEqual(url.pathname, "/playlists");
                    assert.strictEqual(url.searchParams.get("type"), "video");
                    assert.strictEqual(url.searchParams.get("smart"), "0");
                    assert.strictEqual(url.searchParams.get("uri"), options.empty ? null :
                        "server://source-server/com.plexapp.plugins.library/library/metadata/2");
                    title = url.searchParams.get("title");
                    return Promise.resolve(response({ Metadata: [metadata()] }));
                }
                if (request.method === "PUT") {
                    assert.strictEqual(url.pathname, "/playlists/7");
                    assert.strictEqual(url.searchParams.get("title.locked"), "1");
                    if (!options.unchanged) { title = url.searchParams.get("title.value"); }
                } else {
                    assert.strictEqual(request.method, "DELETE");
                    assert.strictEqual(url.pathname, "/playlists/7");
                    if (!options.unchanged) { exists = false; }
                }
                if (options.holdWrite) {
                    return new Promise(function (resolve) { release = function () { resolve({ ok: true, status: 204 }); }; });
                }
                return Promise.resolve({ ok: true, status: 204 });
            }
            if (url.pathname === "/identity") { return Promise.resolve(response({ machineIdentifier: "source-server" })); }
            if (url.pathname === "/library/metadata/2") {
                return Promise.resolve(response({ Metadata: [{ ratingKey: "2", type: options.wrongType ? "track" : "movie" }] }));
            }
            if (url.pathname === "/playlists/7/items") {
                return Promise.resolve(response({ totalSize: options.empty ? 0 : options.wrongContents ? 2 : 1, offset: 0,
                    Metadata: options.empty ? [] : [{ ratingKey: "2", playlistItemID: "9007199254740993", type: "movie" }] }));
            }
            assert.strictEqual(url.pathname, "/playlists/7");
            if (options.readDenied && calls.some(function (call) { return call.method === "DELETE"; })) {
                return Promise.resolve({ ok: false, status: 401 });
            }
            return Promise.resolve(exists ? response({ Metadata: [metadata()] }) : { ok: false, status: 404 });
        } });
    return { client: client, calls: calls, release: function () { release(); },
        mutations: function () { return calls.filter(function (call) { return call.method !== "GET"; }); } };
}

async function run() {
    var created = fixture();
    var playlist = await created.client.createVideoPlaylist("Synthetic new playlist", "2");
    assert.strictEqual(playlist.ratingKey, "7");
    assert.strictEqual(playlist.title, "Synthetic new playlist");
    assert.strictEqual(created.mutations().length, 1);
    var empty = fixture({ empty: true });
    await empty.client.createVideoPlaylist("Synthetic empty playlist");
    assert.strictEqual(empty.mutations().length, 1);
    assert(!empty.calls.some(function (call) { return call.path === "/identity" || call.path.startsWith("/library/"); }),
        "An empty playlist does not inspect an unrelated library item");
    var renamed = fixture();
    await renamed.client.renameVideoPlaylist("7", "Synthetic renamed playlist", "Synthetic saved playlist");
    assert.strictEqual(renamed.mutations().length, 1);
    var removed = fixture();
    await removed.client.deleteVideoPlaylist("7", "Synthetic saved playlist");
    assert.strictEqual(removed.mutations().length, 1);
    for (var method of ["rename", "delete"]) {
        var stale = fixture();
        var action = function (test) {
            return method === "rename" ?
                test.client.renameVideoPlaylist("7", "Synthetic changed", "Another title") :
                test.client.deleteVideoPlaylist("7", "Another title");
        };
        await assert.rejects(action(stale), /changed/i);
        assert.strictEqual(stale.mutations().length, 0, "A renamed target needs another user confirmation");
        var unchanged = fixture({ unchanged: true });
        await assert.rejects(method === "rename" ?
            unchanged.client.renameVideoPlaylist("7", "Synthetic changed", "Synthetic saved playlist") :
            unchanged.client.deleteVideoPlaylist("7", "Synthetic saved playlist"), /confirm/i);
        assert.strictEqual(unchanged.mutations().length, 1, "Unchanged HTTP success is never replayed");
    }
    var denied = fixture({ readDenied: true });
    await assert.rejects(denied.client.deleteVideoPlaylist("7", "Synthetic saved playlist"), function (error) {
        return error.status === 401;
    });
    assert.strictEqual(denied.mutations().length, 1, "An inaccessible playlist is not a confirmed deletion");
    var wrong = fixture({ wrongContents: true });
    await assert.rejects(wrong.client.createVideoPlaylist("Synthetic new playlist", "2"), /confirm/i);
    assert.strictEqual(wrong.mutations().length, 1);
    var invalid = fixture();
    await assert.rejects(invalid.client.createVideoPlaylist(" \n ", "2"), /name/i);
    await assert.rejects(invalid.client.renameVideoPlaylist("7", "x".repeat(129), "Synthetic saved playlist"), /name/i);
    await assert.rejects(invalid.client.renameVideoPlaylist("7", "Synthetic saved playlist", "Synthetic saved playlist"), /different/i);
    assert.strictEqual(invalid.mutations().length, 0);
    for (var mutation of ["create", "rename", "delete"]) {
        var forbidden = fixture({ denied: true });
        await assert.rejects(mutation === "create" ? forbidden.client.createVideoPlaylist("Synthetic created", "2") :
            mutation === "rename" ? forbidden.client.renameVideoPlaylist("7", "Synthetic renamed", "Synthetic saved playlist") :
                forbidden.client.deleteVideoPlaylist("7", "Synthetic saved playlist"), function (error) {
            return error.status === 403 && error.scope === "server";
        });
        assert.strictEqual(forbidden.mutations().length, 1);
    }
    var audio = fixture({ wrongType: true });
    await assert.rejects(audio.client.createVideoPlaylist("Synthetic new playlist", "2"), /video/i);
    assert.strictEqual(audio.mutations().length, 0);
    var inFlight = fixture({ holdWrite: true });
    var sent = inFlight.client.renameVideoPlaylist("7", "Synthetic changed", "Synthetic saved playlist");
    while (!inFlight.mutations().length) { await new Promise(function (resolve) { setTimeout(resolve, 0); }); }
    await assert.rejects(inFlight.client.deleteVideoPlaylist("7", "Synthetic changed"), /previous|finish/i);
    await assert.rejects(inFlight.client.addVideoPlaylistItem("7", "2"), /previous|finish/i);
    inFlight.client.cancelRequests();
    inFlight.release();
    await assert.rejects(sent, /cancel/i);
    assert.strictEqual(inFlight.mutations().length, 1);
    console.log("Saved playlist lifecycle: create, rename, delete, stale/denied/uncertain results and cancellation passed");
}
run().catch(function (error) { console.error(error.stack || error); process.exitCode = 1; });
