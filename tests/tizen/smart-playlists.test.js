"use strict";
var assert = require("assert");
var createClient = require("../../samsung/Vemm/js/plex-api").createClient;

var initial = "server://source-server/com.plexapp.plugins.library/library/sections/1/all?" +
    "type=1&push=1&genre=7&and=1&year%3E=1990&pop=1&sort=titleSort%3Aasc&limit=20";
var meta = {
    Type: [{ type: "movie", key: "/library/sections/1/all?type=1",
        Field: [{ key: "genre", type: "tag", title: "Genre" }, { key: "year", type: "integer", title: "Year" },
            { key: "title", type: "string", title: "Title" }, { key: "unwatched", type: "boolean", title: "Unwatched" }],
        Sort: [{ key: "titleSort", title: "Title" }, { key: "addedAt", title: "Date added" }] }],
    FieldType: [{ type: "tag", Operator: [{ key: "=", title: "is" }, { key: "!=", title: "is not" }] },
        { type: "integer", Operator: [{ key: "=", title: "is" }, { key: ">=", title: "is greater than" }] },
        { type: "string", Operator: [{ key: "=", title: "contains" }, { key: "==", title: "is" }] },
        { type: "boolean", Operator: [{ key: "=", title: "is" }] }]
};
function fixture(options) {
    options = options || {};
    var content = options.content || initial;
    var calls = [];
    var release;
    function response(container) {
        return { ok: true, status: 200, json: function () { return Promise.resolve({ MediaContainer: container }); } };
    }
    var client = createClient({ baseUrl: "https://pms.synthetic.invalid", token: "synthetic-token",
        fetch: function (target, request) {
            var url = new URL(target);
            assert.strictEqual(url.origin, "https://pms.synthetic.invalid");
            assert(!url.searchParams.has("X-Plex-Token"));
            calls.push({ method: request.method, path: url.pathname });
            if (request.method === "PUT") {
                assert.strictEqual(url.pathname, "/playlists/7/items");
                if (options.denied) { return Promise.resolve({ ok: false, status: 403 }); }
                if (!options.unchanged) { content = url.searchParams.get("uri"); }
                if (options.holdWrite) {
                    return new Promise(function (resolve) { release = function () { resolve({ ok: true, status: 204 }); }; });
                }
                if (options.concurrent) { content = content.replace("2000", "2010"); }
                return Promise.resolve({ ok: true, status: 204 });
            }
            if (url.pathname === "/identity") {
                if (options.advance) { options.advance(); }
                if (options.holdIdentity) {
                    return new Promise(function (resolve) {
                        release = function () { resolve(response({ machineIdentifier: "source-server" })); };
                    });
                }
                return Promise.resolve(response({ machineIdentifier: "source-server" }));
            }
            if (url.pathname === "/library/sections/1/all") {
                assert.strictEqual(url.searchParams.get("includeMeta"), "1");
                assert.strictEqual(url.searchParams.get("includeAdvanced"), "1");
                assert.strictEqual(url.searchParams.get("X-Plex-Container-Size"), "0");
                return Promise.resolve(response({ Meta: options.missingSchema ? {} : options.meta || meta }));
            }
            assert.strictEqual(url.pathname, "/playlists/7");
            if (options.readDenied && calls.some(function (call) { return call.method === "PUT"; })) {
                return Promise.resolve({ ok: false, status: 403 });
            }
            return Promise.resolve(response({ Metadata: [{ ratingKey: "7", type: "playlist", playlistType: "video",
                smart: options.standard ? "0" : "1", title: options.stale ||
                    options.staleAfter && calls.filter(function (call) { return call.path === "/playlists/7"; }).length > 1 ?
                    "Changed title" : "Synthetic smart playlist",
                content: content, composite: "/unrelated/artwork" }] }));
        } });
    return { client: client, calls: calls, release: function () { release(); },
        mutations: function () { return calls.filter(function (call) { return call.method !== "GET"; }); } };
}
async function run() {
    var sample = fixture();
    assert.strictEqual(typeof sample.client.getSmartVideoPlaylist, "function", "Missing smart-playlist rule inspection");
    var rules = require("../../samsung/Vemm/js/smart-playlists");
    var loaded = await sample.client.getSmartVideoPlaylist("7");
    assert.strictEqual(loaded.rules.section, "1");
    assert.strictEqual(loaded.rules.root.match, "and");
    assert.strictEqual(loaded.rules.root.rules.length, 2);
    assert.strictEqual(loaded.rules.root.rules[1].operator, ">=");
    assert.strictEqual(loaded.schema.fields[0].title, "Genre");
    assert.strictEqual(sample.mutations().length, 0);
    var draft = JSON.parse(JSON.stringify(loaded.rules));
    draft.root.rules[1].value = "2000";
    await sample.client.updateSmartVideoPlaylist("7", loaded.playlist, draft);
    assert.strictEqual(sample.mutations().length, 1);
    var read = await sample.client.getSmartVideoPlaylist("7");
    assert.strictEqual(read.rules.root.rules[1].value, "2000");
    assert.deepStrictEqual(read.rules.sort, ["titleSort:asc"]);
    assert.strictEqual(read.rules.limit, "20");
    var compoundMeta = JSON.parse(JSON.stringify(meta));
    compoundMeta.Type[0].Sort[0].descKey = "titleSort:desc,addedAt:desc";
    var compound = fixture({ meta: compoundMeta });
    var compoundLoaded = await compound.client.getSmartVideoPlaylist("7");
    var compoundDraft = JSON.parse(JSON.stringify(compoundLoaded.rules));
    compoundDraft.sort = ["titleSort:desc,addedAt:desc"];
    await compound.client.updateSmartVideoPlaylist("7", compoundLoaded.playlist, compoundDraft);
    assert.deepStrictEqual((await compound.client.getSmartVideoPlaylist("7")).rules.sort,
        ["titleSort:desc,addedAt:desc"], "Advertised compound sorts remain a complete logical choice with a limit");
    var partialSort = fixture({ meta: compoundMeta });
    compoundDraft.sort = ["titleSort:desc"];
    await assert.rejects(partialSort.client.updateSmartVideoPlaylist("7", compoundLoaded.playlist, compoundDraft), /safely/);
    assert.strictEqual(partialSort.mutations().length, 0, "A truncated advertised compound is not a different valid choice");
    compoundMeta.Type[0].Sort = [{ key: "show.titleSort:asc,season.index:asc", title: "Show",
        descKey: "show.titleSort:desc,season.index:desc" }];
    var noExplicitSort = fixture({ meta: compoundMeta, content: initial.replace("&sort=titleSort%3Aasc", "") });
    assert.deepStrictEqual((await noExplicitSort.client.getSmartVideoPlaylist("7")).rules.sort, [],
        "A compound advertised key must not reject a playlist that uses default ordering");
    assert.strictEqual(rules.sortChoice({ key: "show.titleSort:asc,season.index:asc", title: "Show" }).descending, null,
        "No opposite compound direction is invented when the server did not supply one");
    var expandedMeta = JSON.parse(JSON.stringify(meta));
    expandedMeta.Type[0].Sort[0].descKey = "titleSort:desc,addedAt:desc";
    ["duration", "rating", "yearSort", "index"].forEach(function (key) {
        expandedMeta.Type[0].Sort.push({ key: key, title: key });
    });
    var expandedMenu = rules.schema({ Meta: expandedMeta }, "1");
    var expandedDraft = JSON.parse(JSON.stringify(draft));
    expandedDraft.sort = ["titleSort:desc,addedAt:desc", "duration:asc", "rating:asc", "yearSort:asc"];
    assert.strictEqual(rules.validate(expandedDraft, expandedMenu).sort.join(",").split(",").length, 5);
    expandedDraft.sort.push("index:asc");
    assert.throws(function () { rules.validate(expandedDraft, expandedMenu); }, /safely/,
        "Five logical choices cannot hide six expanded server sort components");
    for (var bad of ["unchanged", "denied", "concurrent"]) {
        var uncertain = fixture({ [bad]: true });
        await assert.rejects(uncertain.client.updateSmartVideoPlaylist("7", loaded.playlist, draft),
            bad === "denied" ? function (error) { return error.status === 403; } : /confirm/i);
        assert.strictEqual(uncertain.mutations().length, 1, "No mutation replay after " + bad);
    }
    for (var option of ["stale", "staleAfter", "standard", "missingSchema"]) {
        var invalid = fixture({ [option]: true });
        await assert.rejects(invalid.client.updateSmartVideoPlaylist("7", loaded.playlist, draft));
        assert.strictEqual(invalid.mutations().length, 0, "No write after " + option);
    }
    for (var changed of [
        { section: "2" }, { type: "4" }, { limit: "0" }, { limit: "100001" },
        { sort: ["unadvertised:asc"] }, { sort: ["titleSort:asc", "titleSort:asc"] },
        { root: { match: "or", rules: [] } },
        { root: { match: "and", rules: [{ field: "X-Plex-Token", operator: "=", value: "synthetic" }] } },
        { root: { match: "and", rules: [{ field: "year", operator: "<=", value: "2000" }] } },
        { root: { match: "and", rules: [{ field: "year", operator: ">=", value: "invalid" }] } }
    ]) {
        var malformed = fixture();
        await assert.rejects(malformed.client.updateSmartVideoPlaylist("7", loaded.playlist, Object.assign({}, draft, changed)));
        assert.strictEqual(malformed.mutations().length, 0);
    }
    var noChange = fixture();
    await assert.rejects(noChange.client.updateSmartVideoPlaylist("7", loaded.playlist, loaded.rules), /different/i);
    assert.strictEqual(noChange.mutations().length, 0);
    var refusedRead = fixture({ readDenied: true });
    await assert.rejects(refusedRead.client.updateSmartVideoPlaylist("7", loaded.playlist, draft),
        function (error) { return error.status === 403; });
    assert.strictEqual(refusedRead.mutations().length, 1);
    var originalNow = Date.now;
    var clock = originalNow();
    Date.now = function () { return clock; };
    try {
        var expired = fixture({ advance: function () { clock += 60001; } });
        await assert.rejects(expired.client.updateSmartVideoPlaylist("7", loaded.playlist, draft), /timed out/i);
        assert.strictEqual(expired.mutations().length, 0);
    } finally { Date.now = originalNow; }
    for (var content of [
        initial.replace("source-server", "other-server"),
        initial.replace("server://", "https://"),
        initial + "&X-Plex-Token=synthetic",
        initial + "&push=1", initial + "&pop=1", initial + "&type=4",
        initial.replace("genre=7", "genre=%E0%A4%A"), initial + "#fragment",
        initial.replace("and=1", "or=1&and=1"),
        initial.replace("year%3E=1990", "unknown=1990")
    ]) {
        var unsafe = fixture({ content: content });
        await assert.rejects(unsafe.client.getSmartVideoPlaylist("7"));
        assert.strictEqual(unsafe.mutations().length, 0);
    }
    var nested = rules.parse(initial, "source-server");
    nested.root.rules.push({ match: "or", rules: [
        { field: "title", operator: "==", value: "A & B=1" },
        { field: "unwatched", operator: "=", value: "1" }
    ] });
    var encoded = rules.uri(nested, loaded.schema, "source-server");
    assert(encoded.includes("title%3D=A%20%26%20B%3D1"), "Equality and value delimiters are encoded separately");
    assert.deepStrictEqual(rules.validate(rules.parse(encoded, "source-server"), loaded.schema),
        rules.validate(nested, loaded.schema), "Nested all/any conditions and exact strings round trip");
    var wrapped = encodeURIComponent(encoded);
    assert.deepStrictEqual(rules.parse(wrapped, "source-server"), rules.parse(encoded, "source-server"));
    var literal = rules.parse(initial.replace("genre=7", "title==Exact%20title"), "source-server");
    assert.strictEqual(literal.root.rules[0].operator, "==");
    assert.strictEqual(literal.root.rules[0].value, "Exact title");
    var prefixed = rules.parse(initial.replace("genre=7", "movie.genre=7").replace("titleSort%3Aasc", "movie.titleSort"), "source-server");
    assert.strictEqual(rules.validate(prefixed, loaded.schema).root.rules[0].field, "genre");
    assert.strictEqual(rules.validate(prefixed, loaded.schema).sort[0], "titleSort");
    var maximum = JSON.parse(JSON.stringify(loaded.rules));
    maximum.root.rules = Array.from({ length: 32 }, function (_, index) {
        return { field: "year", operator: ">=", value: String(1900 + index) };
    });
    assert.strictEqual(rules.parse(rules.uri(maximum, loaded.schema, "source-server"), "source-server").root.rules.length, 32);
    maximum.root.rules.push({ field: "year", operator: "=", value: "2000" });
    assert.throws(function () { rules.uri(maximum, loaded.schema, "source-server"); }, /safely/);
    var deep = JSON.parse(JSON.stringify(loaded.rules));
    var group = deep.root;
    for (var depth = 0; depth < 4; depth += 1) {
        var child = { match: "or", rules: [{ field: "year", operator: "=", value: "2000" }] };
        group.rules.push(child); group = child;
    }
    group.rules.push({ field: "title", operator: "=", value: "Synthetic" });
    assert.deepStrictEqual(rules.validate(rules.parse(rules.uri(deep, loaded.schema, "source-server"), "source-server"), loaded.schema),
        rules.validate(deep, loaded.schema), "The advertised maximum group depth round trips");
    group.rules.push({ match: "and", rules: [{ field: "year", operator: "=", value: "2001" }] });
    assert.throws(function () { rules.uri(deep, loaded.schema, "source-server"); }, /safely/);
    var unary = JSON.parse(JSON.stringify(loaded.rules));
    unary.root = { match: "or", rules: [{ match: "and", rules: [unary.root.rules[0]] }] };
    assert.deepStrictEqual(rules.validate(rules.parse(rules.uri(unary, loaded.schema, "source-server"), "source-server"), loaded.schema),
        rules.validate(unary, loaded.schema), "Redundant unary groups are compared semantically, not silently lost");
    var snapshotOptions = { holdIdentity: true };
    var snapshot = fixture(snapshotOptions);
    var callerDraft = JSON.parse(JSON.stringify(draft));
    var snapshotEdit = snapshot.client.updateSmartVideoPlaylist("7", loaded.playlist, callerDraft);
    while (!snapshot.calls.some(function (call) { return call.path === "/identity"; })) {
        await new Promise(function (resolve) { setTimeout(resolve, 0); });
    }
    callerDraft.root.rules[1].value = "2088";
    snapshotOptions.holdIdentity = false;
    snapshot.release();
    await snapshotEdit;
    assert.strictEqual((await snapshot.client.getSmartVideoPlaylist("7")).rules.root.rules[1].value, "2000",
        "The confirmed snapshot cannot change while preflight is pending");
    for (var hold of ["holdIdentity", "holdWrite"]) {
        var pending = fixture({ [hold]: true });
        var operation = pending.client.updateSmartVideoPlaylist("7", loaded.playlist, draft);
        while (!pending.calls.some(function (call) { return hold === "holdIdentity" ? call.path === "/identity" : call.method === "PUT"; })) {
            await new Promise(function (resolve) { setTimeout(resolve, 0); });
        }
        if (hold === "holdWrite") {
            await assert.rejects(pending.client.renameVideoPlaylist("7", "Another", loaded.playlist.title), /previous|finish/i);
        }
        pending.client.cancelRequests();
        pending.release();
        await assert.rejects(operation, /cancel/i);
        assert.strictEqual(pending.mutations().length, hold === "holdWrite" ? 1 : 0);
        assert.strictEqual(pending.calls.filter(function (call) { return call.path === "/playlists/7"; }).length,
            hold === "holdIdentity" ? 1 : 2);
    }
    console.log("Smart playlist rules: advertised grammar, nested round-trip, preflight/read-back, no replay and cancellation passed");
}
run().catch(function (error) { console.error(error.stack || error); process.exitCode = 1; });
