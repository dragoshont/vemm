(function (root, factory) {
    var api = factory();
    if (typeof module === "object" && module.exports) { module.exports = api; }
    else { root.VemmSmartPlaylists = api; }
}(this, function () {
    "use strict";
    var types = { "1": "movie", "2": "show", "3": "season", "4": "episode", "12": "clip" };
    function invalid() { throw new Error("These smart rules cannot be safely edited. Nothing was changed."); }
    function text(value, limit) {
        if (typeof value !== "string" || !value.length || value.length > limit || /[\x00-\x1f\x7f]/.test(value)) { invalid(); }
        return value;
    }
    function identifier(value) {
        if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,80}$/.test(value)) { invalid(); }
        return value;
    }
    function fieldKey(value) { return typeof value === "string" && /^[A-Za-z][A-Za-z0-9]*(?:\.[A-Za-z][A-Za-z0-9]*)?$/.test(value); }
    function parse(content, server) {
        identifier(server);
        text(content, 16384);
        if (/^server%3A%2F%2F/i.test(content)) {
            try { content = decodeURIComponent(content); } catch (error) { invalid(); }
        }
        var match = /^server:\/\/([A-Za-z0-9_-]{1,80})\/com\.plexapp\.plugins\.library\/library\/sections\/([0-9]+)\/all\?([^#]+)$/.exec(content);
        if (!match || match[1] !== server) { invalid(); }
        var result = { section: match[2], type: null, sort: [], limit: null, includeGuids: null, root: null };
        var feed = [];
        var seen = {};
        var pairs = match[3].split("&");
        if (pairs.length > 160) { invalid(); }
        pairs.forEach(function (pair) {
            var at = pair.indexOf("=");
            if (at < 1) { invalid(); }
            var name;
            var value;
            try {
                name = decodeURIComponent(pair.slice(0, at).replace(/\+/g, " "));
                value = decodeURIComponent(pair.slice(at + 1).replace(/\+/g, " "));
            } catch (error) { invalid(); }
            if (pair.charAt(at + 1) === "=") { name += "="; value = value.slice(1); }
            text(name, 100); text(value, 512);
            if (["type", "sort", "limit", "includeGuids"].indexOf(name) !== -1) {
                if (seen[name]) { invalid(); }
                seen[name] = true;
                if (name === "sort") { result.sort = value.split(","); }
                else { result[name] = value; }
            } else { feed.push({ key: name, value: value }); }
        });
        if (!types[result.type]) { invalid(); }
        var offset = 0;
        var count = 0;
        function group(depth, nested) {
            if (depth > 5) { invalid(); }
            var node = { match: "and", rules: [] };
            var logical = null;
            var waiting = false;
            while (offset < feed.length) {
                var pair = feed[offset++];
                if (pair.key === "pop") {
                    if (!nested || pair.value !== "1" || waiting || !node.rules.length) { invalid(); }
                    return node;
                }
                if (pair.key === "and" || pair.key === "or") {
                    if (pair.value !== "1" || !node.rules.length || waiting || logical && logical !== pair.key) { invalid(); }
                    logical = pair.key; node.match = logical; waiting = true;
                    continue;
                }
                waiting = false;
                if (pair.key === "push") {
                    if (pair.value !== "1") { invalid(); }
                    node.rules.push(group(depth + 1, true));
                } else {
                    var field = /^([A-Za-z][A-Za-z0-9]*(?:\.[A-Za-z][A-Za-z0-9]*)?)([!<>=]*)$/.exec(pair.key);
                    if (!field || ++count > 32) { invalid(); }
                    node.rules.push({ field: field[1], operator: field[2] + "=", value: pair.value });
                }
            }
            if (nested || waiting || !node.rules.length) { invalid(); }
            return node;
        }
        result.root = group(0, false);
        while (result.root.rules.length === 1 && result.root.rules[0].rules) { result.root = result.root.rules[0]; }
        function checkDepth(node, depth) {
            if (depth > 4) { invalid(); }
            node.rules.forEach(function (rule) { if (rule.rules) { checkDepth(rule, depth + 1); } });
        }
        checkDepth(result.root, 0);
        return result;
    }
    function schema(container, type) {
        var meta = container && container.Meta;
        if (!types[type] || !meta || !Array.isArray(meta.Type) || meta.Type.length > 20 ||
                !Array.isArray(meta.FieldType) || meta.FieldType.length > 30) { invalid(); }
        var selected = meta.Type.filter(function (entry) { return entry && entry.type === types[type]; });
        if (selected.length !== 1) { invalid(); }
        selected = selected[0];
        if (!Array.isArray(selected.Field) || !selected.Field.length || selected.Field.length > 300 ||
                !Array.isArray(selected.Sort) || selected.Sort.length > 100) { invalid(); }
        var names = {};
        var fields = selected.Field.map(function (field) {
            if (!field || !fieldKey(field.key) || names[field.key]) { invalid(); }
            names[field.key] = true;
            var fieldTypes = meta.FieldType.filter(function (entry) { return entry && entry.type === field.type; });
            if (fieldTypes.length !== 1 || !Array.isArray(fieldTypes[0].Operator) ||
                    !fieldTypes[0].Operator.length || fieldTypes[0].Operator.length > 20) { invalid(); }
            var operators = fieldTypes[0].Operator.map(function (operator) {
                if (!operator || !/^[!<>=]*=$/.test(operator.key) || operator.key.length > 4) { invalid(); }
                return { key: operator.key, title: text(operator.title, 128) };
            });
            return { key: field.key, type: text(field.type, 40), title: text(field.title, 128), operators: operators };
        });
        names = {};
        var sorts = selected.Sort.map(function (sort) {
            if (!sort || !fieldKey(sort.key) || names[sort.key]) { invalid(); }
            names[sort.key] = true;
            return { key: sort.key, title: text(sort.title, 128) };
        });
        return { fields: fields, sorts: sorts, type: type };
    }
    function validate(input, menu) {
        if (!input || typeof input.section !== "string" || !/^[0-9]+$/.test(input.section) ||
                !types[input.type] || input.type !== menu.type ||
                !Array.isArray(input.sort) || input.sort.length > 5 ||
                input.limit !== null && (typeof input.limit !== "string" || !/^[1-9][0-9]{0,5}$/.test(input.limit) ||
                    Number(input.limit) > 100000) ||
                input.includeGuids !== null && ["0", "1"].indexOf(input.includeGuids) < 0) { invalid(); }
        var used = {};
        function advertised(key, entries) {
            return entries.filter(function (entry) { return entry.key === key; })[0] ||
                entries.filter(function (entry) {
                    return key === types[input.type] + "." + entry.key || entry.key === types[input.type] + "." + key;
                })[0];
        }
        var sorts = input.sort.map(function (sort) {
            var match = /^([A-Za-z][A-Za-z0-9]*(?:\.[A-Za-z][A-Za-z0-9]*)?)(?::(asc|desc|nullsLast))?$/.exec(sort);
            var choice = match && advertised(match[1], menu.sorts);
            if (!choice || used[choice.key]) { invalid(); }
            used[choice.key] = true;
            return choice.key + (match[2] ? ":" + match[2] : "");
        });
        var count = 0;
        function group(node, depth) {
            if (!node || depth > 4 || ["and", "or"].indexOf(node.match) < 0 ||
                    !Array.isArray(node.rules) || !node.rules.length || node.rules.length > 32) { invalid(); }
            var children = node.rules.map(function (rule) {
                if (!rule) { invalid(); }
                if (rule.rules) { return group(rule, depth + 1); }
                if (++count > 32) { invalid(); }
                var field = advertised(rule.field, menu.fields);
                if (!field || !field.operators.some(function (operator) { return operator.key === rule.operator; })) { invalid(); }
                var value = text(rule.value, 512);
                if (field.type === "boolean" && !/^[01]$/.test(value) ||
                        field.type === "integer" && !/^-?[0-9]+(?:\.[0-9]+)?(?:,-?[0-9]+(?:\.[0-9]+)?)*$/.test(value) ||
                        field.type === "date" && !/^(?:[0-9]{1,12}|-[0-9]{1,6}(?:mon|[smhdwy]))$/.test(value)) { invalid(); }
                return { field: field.key, operator: rule.operator, value: value };
            });
            if (children.length === 1 && children[0].rules) { return children[0]; }
            return { match: children.length > 1 ? node.match : "and", rules: children };
        }
        return { section: input.section, type: input.type, sort: sorts, limit: input.limit,
            includeGuids: input.includeGuids, root: group(input.root, 0) };
    }
    function uri(input, menu, server) {
        identifier(server);
        var rules = validate(input, menu);
        var pairs = ["type=" + rules.type];
        function pair(key, value) { pairs.push(encodeURIComponent(key) + "=" + encodeURIComponent(value)); }
        function group(node) {
            pair("push", "1");
            node.rules.forEach(function (rule, index) {
                if (index) { pair(node.match, "1"); }
                if (rule.rules) { group(rule); }
                else { pair(rule.field + rule.operator.slice(0, -1), rule.value); }
            });
            pair("pop", "1");
        }
        group(rules.root);
        if (rules.sort.length) { pair("sort", rules.sort.join(",")); }
        if (rules.limit !== null) { pair("limit", rules.limit); }
        if (rules.includeGuids !== null) { pair("includeGuids", rules.includeGuids); }
        var value = "server://" + server + "/com.plexapp.plugins.library/library/sections/" + rules.section + "/all?" + pairs.join("&");
        text(value, 16384);
        return value;
    }
    return { parse: parse, schema: schema, validate: validate, uri: uri };
}));
