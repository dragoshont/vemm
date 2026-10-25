"use strict";
var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var root = path.resolve(__dirname, "../..");
var app = path.join(root, "samsung/Vemm");
var product = require(path.join(app, "js/product.js"));
var manifest = fs.readFileSync(path.join(app, "config.xml"), "utf8");
assert.strictEqual(product.version, "0.2.0");
assert.strictEqual(manifest.match(/<widget [^>]*version="([^"]+)"/)[1], product.version);

async function run() {
    for (var version of [product.version, "0.2.7"]) {
        var calls = [];
        var context = { VemmProduct: { name: product.name, version: version }, URL: URL,
            setTimeout: setTimeout, clearTimeout: clearTimeout };
        vm.runInNewContext(fs.readFileSync(path.join(app, "js/plex-api.js"), "utf8"), context);
        function fetch(target, options) {
            calls.push({ target: target, options: options });
            return Promise.resolve({ ok: true, status: 200, json: function () {
                return Promise.resolve(new URL(target).hostname === "pms.synthetic.invalid" ?
                    { MediaContainer: { Directory: [] } } : { users: [] });
            } });
        }
        await context.PlexApi.createClient({ baseUrl: "https://pms.synthetic.invalid", fetch: fetch }).getSections();
        await context.PlexApi.createAccountClient({ token: "synthetic-only", fetch: fetch }).getProfiles();
        assert.strictEqual(calls.length, 2);
        calls.forEach(function (call) {
            assert.strictEqual(call.options.headers["X-Plex-Version"], version,
                "Both PMS and account headers use the loaded staged product version");
        });
    }
    console.log("Vemm source manifest and staged runtime/protocol version identity: passed");
}
run().catch(function (error) { console.error(error.stack || error); process.exitCode = 1; });
