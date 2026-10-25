(function (root, factory) {
    var api = factory();
    if (typeof module === "object" && module.exports) { module.exports = api; }
    else { root.VemmHomeLayout = api; }
}(this, function () {
    "use strict";
    var key = "vemm-tizen-home-layouts";
    var identity = /^[A-Za-z0-9_-]{1,80}$/;
    var shelf = /^(?:[0-9]{1,10}|-):[A-Za-z0-9_.-]{1,160}$/;
    var invalid = "Saved Home customization is invalid. Reset all Home layouts to recover.";

    function exact(value, fields) {
        return value && typeof value === "object" && !Array.isArray(value) &&
            Object.keys(value).sort().join(",") === fields.slice().sort().join(",");
    }
    function ids(value) {
        if (!Array.isArray(value) || value.length > 100) { throw new Error(invalid); }
        var result = [];
        value.forEach(function (id) {
            if (typeof id !== "string" || !shelf.test(id) || result.indexOf(id) !== -1) { throw new Error(invalid); }
            result.push(id);
        });
        return result;
    }
    function validate(value) {
        if (!exact(value, ["hero", "order", "hidden"]) || typeof value.hero !== "boolean") { throw new Error(invalid); }
        var order = ids(value.order);
        var hidden = ids(value.hidden);
        if (hidden.some(function (id) { return order.indexOf(id) === -1; })) { throw new Error(invalid); }
        return { hero: value.hero, order: order, hidden: hidden };
    }
    function scoped(server, profile) {
        return typeof server === "string" && identity.test(server) &&
            typeof profile === "string" && identity.test(profile);
    }
    function read(storage) {
        var raw = storage.getItem(key);
        if (!raw) { return []; }
        if (raw.length > 1024 * 1024) { throw new Error(invalid); }
        var value;
        try { value = JSON.parse(raw); } catch (error) { throw new Error(invalid); }
        if (!Array.isArray(value) || value.length > 20) { throw new Error(invalid); }
        var scopes = [];
        return value.map(function (entry) {
            if (!exact(entry, ["server", "profile", "layout"]) || !scoped(entry.server, entry.profile)) {
                throw new Error(invalid);
            }
            var scope = entry.server + ":" + entry.profile;
            if (scopes.indexOf(scope) !== -1) { throw new Error(invalid); }
            scopes.push(scope);
            return { server: entry.server, profile: entry.profile, layout: validate(entry.layout) };
        });
    }
    function descriptors(hubs) {
        var candidates = hubs.map(function (hub) {
            var section = hub.librarySectionID === undefined ? "-" : String(hub.librarySectionID);
            var id = typeof hub.hubIdentifier === "string" ? section + ":" + hub.hubIdentifier : "";
            return shelf.test(id) ? id : "";
        });
        return hubs.map(function (hub, index) {
            var id = candidates[index];
            // Ambiguous and unidentified shelves stay visible; labels and array positions are not identities.
            if (index >= 100 || !id || candidates.indexOf(id) !== candidates.lastIndexOf(id)) { id = ""; }
            return { id: id, hub: hub };
        });
    }
    function arrange(hubs, saved) {
        var layout = saved ? validate(saved) : { hero: true, order: [], hidden: [] };
        var entries = descriptors(hubs);
        var ordered = [];
        layout.order.forEach(function (id) {
            entries.forEach(function (entry) { if (entry.id === id) { ordered.push(entry); } });
        });
        entries.forEach(function (entry) { if (ordered.indexOf(entry) === -1) { ordered.push(entry); } });
        return { hero: layout.hero, entries: ordered, hidden: layout.hidden.slice(),
            hubs: ordered.filter(function (entry) { return !entry.id || layout.hidden.indexOf(entry.id) === -1; })
                .map(function (entry) { return entry.hub; }) };
    }
    function update(storage, server, profile, layout) {
        if (!scoped(server, profile)) { throw new Error("Home customization requires a verified server and profile."); }
        var clean = layout ? validate(layout) : null;
        var all = read(storage).filter(function (entry) { return entry.server !== server || entry.profile !== profile; });
        if (clean) { all.push({ server: server, profile: profile, layout: clean }); }
        if (all.length > 20) { all.shift(); }
        storage.setItem(key, JSON.stringify(all));
    }
    return {
        scoped: scoped,
        load: function (storage, server, profile) {
            if (!scoped(server, profile)) { return null; }
            var matches = read(storage).filter(function (entry) { return entry.server === server && entry.profile === profile; });
            return matches.length ? matches[0].layout : null;
        },
        save: update,
        reset: function (storage, server, profile) { update(storage, server, profile, null); },
        resetAll: function (storage) { storage.removeItem(key); },
        arrange: arrange
    };
}));
