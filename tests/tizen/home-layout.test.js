"use strict";
var assert = require("assert");
var layout = require("../../samsung/Vemm/js/home-layout.js");
var key = "vemm-tizen-home-layouts";
var data = {};
var storage = {
    getItem: function (name) { return data[name] || null; },
    setItem: function (name, value) { data[name] = value; },
    removeItem: function (name) { delete data[name]; }
};
function hub(id, section) { return { hubIdentifier: id, librarySectionID: section }; }
var a = hub("home.recent", 1);
var b = hub("home.recent", 2);
var c = hub("home.ondeck");
var saved = { hero: false, order: ["2:home.recent", "1:home.recent"], hidden: ["1:home.recent"] };
assert.deepStrictEqual(layout.arrange([a, b, c], null).hubs, [a, b, c]);
layout.save(storage, "server", "profile", saved);
assert.deepStrictEqual(layout.load(storage, "server", "profile"), saved);
assert.strictEqual(layout.load(storage, "server", "other"), null);
assert.strictEqual(layout.load(storage, "other", "profile"), null);
assert.deepStrictEqual(layout.arrange([a, b, c], saved).hubs, [b, c]);
assert.deepStrictEqual(layout.arrange([c, a, b], saved).hubs, [b, c], "Server order changes do not replace explicit order");
assert.deepStrictEqual(layout.arrange([a, c], saved).hubs, [c], "Missing shelves are ignored without aliasing another library");
assert.deepStrictEqual(layout.arrange([c, b, a, hub("home.new", 3)], saved).hubs,
    [b, c, hub("home.new", 3)], "New shelves follow known saved shelves in server order");
assert.deepStrictEqual(layout.arrange([a, a, b], saved).hubs, [b, a, a], "Duplicate identifiers cannot hide either ambiguous shelf");
assert.deepStrictEqual(layout.arrange([hub(), hub("https://private.invalid/a")], saved).entries.map(function (entry) {
    return entry.id;
}), ["", ""], "Missing or unsafe identifiers are never persisted");
var many = Array.from({ length: 101 }, function (_, i) { return hub("shelf." + i, 1); });
assert.strictEqual(layout.arrange(many, null).entries.filter(function (entry) { return entry.id; }).length, 100);
assert.strictEqual(layout.arrange(many, null).hubs.length, 101, "Customization bounds do not drop server shelves");
assert.deepStrictEqual(saved, { hero: false, order: ["2:home.recent", "1:home.recent"], hidden: ["1:home.recent"] });
[
    { hero: 1, order: [], hidden: [] },
    { hero: true, order: ["1:a", "1:a"], hidden: [] },
    { hero: true, order: [], hidden: ["1:a"] },
    { hero: true, order: ["https://private.invalid"], hidden: [] },
    { hero: true, order: [], hidden: [], token: "forbidden" },
    { hero: true, order: many.map(function (entry) { return "1:" + entry.hubIdentifier; }), hidden: [] }
].forEach(function (bad) { assert.throws(function () { layout.save(storage, "server", "profile", bad); }, /invalid/); });
["", "https://server.invalid", "a:b", new Array(82).join("a")].forEach(function (bad) {
    assert.throws(function () { layout.save(storage, bad, "profile", saved); }, /verified server and profile/);
    assert.throws(function () { layout.save(storage, "server", bad, saved); }, /verified server and profile/);
});
layout.save(storage, "server", "other", { hero: true, order: [], hidden: [] });
layout.reset(storage, "server", "profile");
assert.strictEqual(layout.load(storage, "server", "profile"), null);
assert(layout.load(storage, "server", "other"), "Scoped reset preserves another profile");
for (var i = 0; i < 21; i += 1) { layout.save(storage, "server", "profile-" + i, saved); }
assert.strictEqual(JSON.parse(data[key]).length, 20);
assert.strictEqual(layout.load(storage, "server", "profile-0"), null, "The oldest of 20 scoped records is evicted");
[
    "{bad", "{}", '[{"server":"server","profile":"profile","layout":{}}]',
    JSON.stringify([{ server: "server", profile: "profile", layout: saved, origin: "forbidden" }]),
    JSON.stringify([{ server: "server", profile: "profile", layout: saved },
        { server: "server", profile: "profile", layout: saved }]),
    new Array(1024 * 1024 + 2).join(" ")
].forEach(function (raw) {
    data[key] = raw;
    assert.throws(function () { layout.load(storage, "server", "profile"); }, /invalid/);
});
assert.throws(function () { layout.load({ getItem: function () { throw new Error("denied"); } }, "s", "p"); }, /denied/);
layout.resetAll(storage);
assert.strictEqual(data[key], undefined, "Reset all repairs malformed data without parsing it");
assert.throws(function () {
    layout.save({ getItem: function () { return null; }, setItem: function () { throw new Error("quota"); } }, "s", "p", saved);
}, /quota/);
console.log("Tizen bounded scoped Home layouts, validation and deterministic shelf identities: passed");
