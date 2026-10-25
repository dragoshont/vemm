"use strict";
var assert = require("assert");
var fs = require("fs");
var path = require("path");
var JSDOM = require("jsdom").JSDOM;
var app = path.resolve(__dirname, "../../samsung/Vemm");
async function run() {
    var dom = new JSDOM(fs.readFileSync(path.join(app, "index.html"), "utf8"), {
        url: "https://app.synthetic.invalid", runScripts: "outside-only", pretendToBeVisual: true
    });
    var w = dom.window;
    var calls = [];
    var mode = "complete";
    var pending = [];
    var movie = { type: "movie", title: "Synthetic online movie", guid: "plex://movie/5d776b59ad5437001f79c6f8",
        key: "/library/metadata/5d776b59ad5437001f79c6f8", summary: "Synthetic catalogue synopsis" };
    var show = { type: "show", title: "Synthetic online show", guid: "plex://show/5d776b59ad5437001f79c6f9",
        key: "/library/metadata/5d776b59ad5437001f79c6f9" };
    var local = { type: "movie", ratingKey: "60", guid: movie.guid, title: "Exact local copy" };
    function response(container, status) {
        return { ok: !status, status: status || 200,
            json: function () { return Promise.resolve({ MediaContainer: container }); } };
    }
    w.TextDecoder = TextDecoder;
    w.fetch = function (target, request) {
        var url = new URL(target);
        assert.strictEqual(request.method || "GET", "GET", "Searching, details and availability never play or write");
        assert(!url.searchParams.has("X-Plex-Token"), "Account tokens stay out of URLs");
        calls.push({ host: url.hostname, path: url.pathname, query: url.searchParams });
        if (url.hostname === "discover.provider.plex.tv") {
            assert.strictEqual(request.headers["X-Plex-Token"], "synthetic-account");
            assert.strictEqual(request.redirect, "error");
            assert.strictEqual(url.pathname, "/library/search");
            assert.strictEqual(url.searchParams.get("searchProviders"), "discover");
            assert.strictEqual(url.searchParams.get("query"), w.__expectedQuery);
            var catalogueMatches = mode === "bounded-late" ? Array.from({ length: 50 }, function (_, i) {
                var id = ("000000000000000000000000" + (i + 1).toString(16)).slice(-24);
                return { Metadata: { type: "movie", title: "Bounded online " + i, guid: "plex://movie/" + id,
                    key: "/library/metadata/" + id } };
            }) : mode === "empty" ? [] : mode === "reverse" ?
                [{ Metadata: show }, { Metadata: movie }] : [{ Metadata: movie }, { Metadata: show }];
            var result = response({ SearchResults: [{ id: "external",
                SearchResult: catalogueMatches }] });
            if (mode === "pending" || mode === "bounded-late") {
                return new Promise(function (resolve) { pending.push(function () { resolve(result); }); });
            }
            if (mode === "cloud-error") { return Promise.resolve(response({}, 503)); }
            return Promise.resolve(result);
        }
        if (url.hostname === "metadata.provider.plex.tv") {
            assert.strictEqual(request.headers["X-Plex-Token"], "synthetic-account");
            assert.strictEqual(url.searchParams.get("includeUserState"), "1");
            assert.strictEqual(url.pathname, movie.key);
            return Promise.resolve(response({ Metadata: [movie] }));
        }
        if (url.hostname === "plex.tv") {
            assert.strictEqual(url.pathname, "/api/v2/resources");
            assert.strictEqual(request.headers["X-Plex-Token"], "synthetic-account");
            return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve([]); } });
        }
        var copyId = url.hostname === "pms.synthetic.invalid" ? "" :
            url.hostname === "beta.synthetic.invalid" ? "beta" : "alpha";
        assert.strictEqual(url.hostname, copyId ? copyId + ".synthetic.invalid" : "pms.synthetic.invalid");
        assert.strictEqual(request.headers["X-Plex-Token"], "synthetic-server" + (copyId ? "-" + copyId : ""));
        if (url.pathname === "/hubs/search") {
            if (mode === "server-error") { return Promise.resolve(response({}, 503)); }
            if (mode === "bounded-late" || mode === "bounded-default") {
                return Promise.resolve(response({ Hub: Array.from({ length: 1000 }, function (_, i) {
                    return { title: "Synthetic group " + i, type: "movie",
                        Metadata: [Object.assign({}, local, { ratingKey: String(100 + i) })] };
                }) }));
            }
            return Promise.resolve(response({ Hub: mode === "cloud-error" ? [{ title: "Movies", type: "movie", Metadata: [local] }] : [] }));
        }
        if (url.pathname === "/library/sections") {
            return Promise.resolve(response({ Directory: [{ key: "1", type: "movie", title: "Movies" }] }));
        }
        if (url.pathname === "/library/sections/1/all") {
            assert.strictEqual(url.searchParams.get("guid"), movie.guid);
            assert.strictEqual(url.searchParams.get("includeGuids"), "1");
            return Promise.resolve(response({ Metadata: [Object.assign({}, local, { ratingKey: "61",
                guid: "plex://movie/000000000000000000000000", title: movie.title }),
                Object.assign({}, local, { title: local.title + (copyId ? " " + copyId : "") })] }));
        }
        assert.strictEqual(url.pathname, "/library/metadata/60", "Only an exact matched local copy opens PMS details");
        return Promise.resolve(response({ Metadata: [Object.assign({}, local, { title: local.title + (copyId ? " " + copyId : "") })] }));
    };
    for (var script of w.document.querySelectorAll("script[src]")) {
        var name = script.getAttribute("src");
        if (name !== "main.js" && name.indexOf("$WEBAPIS") < 0) { w.eval(fs.readFileSync(path.join(app, name), "utf8")); }
    }
    w.__client = w.PlexApi.createClient({ baseUrl: "https://pms.synthetic.invalid", token: "synthetic-server", fetch: w.fetch });
    w.__account = w.PlexApi.createAccountClient({ token: "synthetic-account", clientIdentifier: "synthetic-client", fetch: w.fetch });
    var source = fs.readFileSync(path.join(app, "main.js"), "utf8");
    var boundary = source.lastIndexOf('    addConnectForm("");');
    w.eval(source.slice(0, boundary) + '    currentClient = window.__client; accountClient = window.__account; servers = []; openSearch("");' +
        ' window.__catalogue = function () { catalogueUi().search(); };' +
        ' window.__enableDeferredCatalogue = function () { catalogueSearchEnabled = true; currentClient = window.__client; openSearch(""); };' +
        ' window.__serverPage = function () { openServers(); };' +
        ' window.__multiple = function () { servers = window.__servers; openSearch(""); }; }());');
    async function settle() {
        for (var i = 0; i < 8; i += 1) { await new Promise(function (resolve) { setTimeout(resolve, 0); }); }
    }
    function click(label) {
        var node = Array.from(w.document.querySelectorAll("button")).find(function (button) { return button.textContent === label; });
        assert(node, "Missing " + label + ": " + w.document.body.textContent);
        node.focus();
        node.click();
    }
    function key(code) {
        w.document.dispatchEvent(new w.KeyboardEvent("keydown", { keyCode: code, bubbles: true }));
        w.document.dispatchEvent(new w.KeyboardEvent("keyup", { keyCode: code, bubbles: true }));
    }
    function search(query) {
        w.__expectedQuery = query;
        var input = w.document.querySelector('input[type="search"]');
        input.value = query;
        input.dispatchEvent(new w.Event("input", { bubbles: true }));
        click("Search");
    }
    try {
        search("Library first"); await settle();
        assert(!calls.some(function (call) { return call.host === "discover.provider.plex.tv" || call.host === "metadata.provider.plex.tv"; }),
            "Default Search must not query Plex catalogue services even with a linked account");
        assert(!w.document.querySelector(".online-search-results"), "Default Search does not promote Plex catalogue/distribution");
        mode = "bounded-default"; search("Bounded library first"); await settle();
        assert.strictEqual(w.document.querySelectorAll(".search-results .media-card").length, 200,
            "Linked-account library-only Search retains the complete existing 200-card bound");
        assert(!calls.some(function (call) { return call.host === "discover.provider.plex.tv" || call.host === "metadata.provider.plex.tv"; }));
        mode = "complete";
        w.__serverPage(); await settle();
        assert(!Array.from(w.document.querySelectorAll("button")).some(function (node) { return node.textContent === "Search Plex catalogue"; }),
            "Default server selection does not promote deferred catalogue search");
        w.__enableDeferredCatalogue();
        search("Online only"); await settle();
        assert(calls.some(function (call) { return call.host === "discover.provider.plex.tv"; }),
            "Main Search must search online, not only libraries");
        var titles = Array.from(w.document.querySelectorAll(".search-results .title-tile"));
        assert.strictEqual(titles.length, 2, "Online-only movies and shows remain discoverable without a library match");
        assert(w.document.querySelector(".search-results").textContent.includes("Plex catalogue"));
        assert(!w.document.querySelector(".empty-state"), "Online matches are not a local-library empty state");
        titles[0].focus(); key(13); await settle();
        assert(w.document.querySelector(".screen-catalogue-detail"));
        assert(w.document.querySelector(".synopsis").textContent.includes("Synthetic catalogue synopsis"));
        assert(!Array.from(w.document.querySelectorAll("button")).some(function (node) { return /^Play/.test(node.textContent); }),
            "Catalogue metadata is not permission to stream");
        click("Find in my libraries"); await settle();
        assert.strictEqual(w.document.querySelectorAll(".media-card").length, 1, "Title-only/wrong-GUID matches are excluded");
        w.document.querySelector(".media-card").focus(); key(13); await settle();
        assert(w.document.body.textContent.includes(local.title));
        key(10009); await settle();
        key(10009); await settle();
        mode = "reverse";
        key(10009); await settle();
        assert.strictEqual(w.document.querySelector("input").value, "Online only");
        assert(w.document.activeElement.textContent.includes(movie.title), "Back restores the exact online GUID result");
        mode = "pending"; search("Old online query"); await settle();
        assert.strictEqual(pending.length, 1);
        var input = w.document.querySelector("input");
        input.value = ""; input.dispatchEvent(new w.Event("input", { bubbles: true }));
        var count = calls.length;
        pending.shift()(); await settle();
        assert.strictEqual(w.document.querySelector(".search-results").children.length, 0, "Clearing retires cloud as well as PMS results");
        assert.strictEqual(calls.length, count, "Clearing sends no empty query");
        mode = "cloud-error"; search("Retry online"); await settle();
        assert(/503/.test(w.document.body.textContent), "Cloud failure is explicit, not no matches");
        assert.strictEqual(w.document.querySelectorAll(".search-results .media-card").length, 1,
            "Online failure must not erase working library results");
        mode = "complete"; click("Retry"); await settle();
        assert.strictEqual(w.document.querySelector("input").value, "Retry online");
        assert.strictEqual(w.document.querySelectorAll(".search-results .title-tile").length, 2);
        mode = "server-error"; search("Cloud survives"); await settle();
        assert.strictEqual(w.document.querySelectorAll(".search-results .title-tile").length, 2);
        assert(/503/.test(w.document.body.textContent), "Server failure cannot erase online matches or look complete");
        mode = "empty"; search("No online matches"); await settle();
        assert(w.document.querySelector(".empty-state"));
        mode = "pending"; w.__catalogue();
        w.__expectedQuery = "Standalone pending";
        w.document.querySelector("input").value = w.__expectedQuery;
        click("Search"); await settle();
        assert.strictEqual(pending.length, 1);
        input = w.document.querySelector("input");
        input.value = "Changed, not submitted";
        input.dispatchEvent(new w.Event("input", { bubbles: true }));
        pending.shift()(); await settle();
        assert.strictEqual(w.document.querySelectorAll(".catalogue-grid .title-tile").length, 0,
            "The retained standalone catalogue also retires an edited query");
        mode = "complete";
        var clients = {};
        w.__servers = ["alpha", "beta"].map(function (id) {
            clients[id] = w.PlexApi.createClient({ baseUrl: "https://" + id + ".synthetic.invalid",
                token: "synthetic-server-" + id, fetch: w.fetch });
            return { id: id, name: "Synthetic " + id };
        });
        w.PlexApi.selectServer = function (server, options) {
            assert(options.onClient(clients[server.id]));
            return Promise.resolve({ client: clients[server.id] });
        };
        w.__multiple(); search("Multiple sources"); await settle();
        w.document.querySelector(".title-tile").focus(); key(13); await settle();
        click("Find in my libraries"); await settle();
        var copies = Array.from(w.document.querySelectorAll(".media-card"));
        assert.strictEqual(copies.length, 2);
        copies.find(function (node) { return node.textContent.includes("beta"); }).focus(); key(13); await settle();
        assert(w.document.body.textContent.includes("Exact local copy beta"), "A local result uses its own server's grant");
        key(10009); await settle();
        assert(w.document.activeElement.textContent.includes("beta"), "Availability Back restores the exact server, not the first equal PMS key");
        w.__serverPage(); await settle();
        assert(w.document.body.textContent.includes("No Plex servers are shared"));
        click("Search Plex catalogue"); await settle();
        search("No PMS needed"); await settle();
        assert.strictEqual(w.document.querySelectorAll(".search-results .title-tile").length, 2,
            "Online search remains reachable without an available personal server");
        w.document.querySelector(".search-results .title-tile").focus(); key(13); await settle();
        var noServerCalls = calls.length;
        click("Find in my libraries"); await settle();
        assert(w.document.querySelector(".empty-state"), "No connected/known PMS is an explicit empty availability state");
        assert(w.document.getElementById("status").textContent.includes("No Plex servers are available"),
            "No-server availability must not expose a null-client exception or incomplete-check warning");
        assert(!w.document.querySelector(".inline-error"));
        assert(!Array.from(w.document.querySelectorAll("button")).some(function (node) { return node.textContent === "Retry"; }),
            "An absent PMS is not a transient failed request with an ineffective Retry");
        assert.strictEqual(calls.length, noServerCalls, "An absent client cannot issue availability requests");
        key(10009); await settle();
        assert(w.document.querySelector(".screen-catalogue-detail"));
        key(10009); await settle();
        assert.strictEqual(w.document.querySelector("input").value, "No PMS needed");
        assert(w.document.activeElement.textContent.includes(movie.title));
        mode = "bounded-late";
        w.__servers = [{ id: "alpha", name: "Synthetic alpha" }];
        w.__multiple(); search("Bounded online"); await settle();
        assert.strictEqual(w.document.querySelectorAll(".search-results .media-card").length, 170,
            "Library results reserve bounded space for a slower online response");
        assert.strictEqual(pending.length, 1);
        pending.shift()(); await settle();
        assert.strictEqual(w.document.querySelectorAll(".search-results .title-tile").length, 30);
        assert.strictEqual(w.document.querySelectorAll(".search-results .media-card, .search-results .title-tile").length, 200);
        assert(w.document.querySelector(".search-results").children.length <= 171);
        mode = "complete"; w.__catalogue();
        search("Standalone Back"); await settle();
        var tile = Array.from(w.document.querySelectorAll(".catalogue-grid .title-tile")).find(function (node) {
            return node.textContent.includes(movie.title);
        });
        tile.focus(); key(13); await settle();
        mode = "reverse"; key(10009); await settle();
        assert.strictEqual(w.document.querySelector("input").value, "Standalone Back");
        assert(w.document.activeElement.textContent.includes(movie.title), "Standalone Back retains GUID focus even when result order changes");
    } finally { dom.window.close(); }
    console.log("Library-first default has no catalogue requests/promotions; explicitly test-enabled deferred catalogue contracts remain intact");
}
run().catch(function (error) { console.error(error.stack || error); process.exitCode = 1; });
