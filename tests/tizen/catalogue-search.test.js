"use strict";
var assert = require("assert");
var plex = require("../../samsung/Vemm/js/plex-api");
async function run() {
    var movie = { type: "movie", title: "Synthetic catalogue movie", guid: "plex://movie/5d776b59ad5437001f79c6f8",
        key: "/library/metadata/5d776b59ad5437001f79c6f8" };
    var rows = [movie];
    var detail = movie;
    var api = plex.createAccountClient({ token: "synthetic-account", clientIdentifier: "synthetic-client",
        fetch: function (target, request) {
            var url = new URL(target);
            assert.strictEqual(request.headers["X-Plex-Token"], "synthetic-account");
            assert(!url.searchParams.has("X-Plex-Token"));
            assert.strictEqual(request.redirect, "error");
            var container = url.hostname === "discover.provider.plex.tv" ?
                { SearchResults: [{ id: "external", SearchResult: rows.map(function (item) { return { Metadata: item }; }) }] } :
                { Metadata: [detail] };
            return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve({ MediaContainer: container }); } });
        } });
    assert.strictEqual((await api.searchCatalogue("Synthetic")).length, 1);
    rows = [Object.assign({}, movie, { guid: "plex://movie/not-a-catalogue-id" })];
    await assert.rejects(api.searchCatalogue("Synthetic"), /invalid catalogue search/i,
        "An online result must not advertise an invalid catalogue identity");
    rows = [Object.assign({}, movie, { key: "/library/metadata/60" })];
    await assert.rejects(api.searchCatalogue("Synthetic"), /invalid catalogue search/i);
    rows = [Object.assign({}, movie, { type: "show" })];
    await assert.rejects(api.searchCatalogue("Synthetic"), /invalid catalogue search/i);
    rows = [movie, movie];
    assert.strictEqual((await api.searchCatalogue("Synthetic")).length, 1, "Repeated GUIDs do not produce ambiguous Back targets");
    rows = Array.from({ length: 50 }, function (_, i) {
        var id = ("000000000000000000000000" + (i + 1).toString(16)).slice(-24);
        return { type: "movie", guid: "plex://movie/" + id, key: "/library/metadata/" + id };
    });
    assert.strictEqual((await api.searchCatalogue("Synthetic")).length, 30);
    rows = [movie];
    detail = { type: "movie", title: "Unidentified details" };
    await assert.rejects(api.catalogueDetails(movie), /mismatched catalogue/i, "Missing GUID cannot confirm the selected online result");
    detail = Object.assign({}, movie, { type: "show" });
    await assert.rejects(api.catalogueDetails(movie), /mismatched catalogue/i);
    detail = movie;
    assert.strictEqual((await api.catalogueDetails(movie)).guid, movie.guid);
    console.log("Catalogue search: validated movie/show identity, detail matching, unique 30-result bound and account token policy passed");
}
run().catch(function (error) { console.error(error.stack || error); process.exitCode = 1; });
