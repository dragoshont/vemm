(function (root, factory) {
    var api = factory();
    if (typeof module === "object" && module.exports) { module.exports = api; }
    else { root.VemmTelevision = api; }
}(this, function () {
    "use strict";
    var priorityClients = [];
    function id(value) {
        if (!/^[0-9]+$/.test(String(value))) { throw new Error("Invalid DVR identifier."); }
        return String(value);
    }
    function list(container, field) {
        if (Array.isArray(container[field])) { return container[field]; }
        if (Number(container.size) === 0) { return []; }
        throw new Error("Plex did not return a valid " + field + " list.");
    }
    function providerPath(path) {
        if (typeof path !== "string" || !/^\/tv\.plex\.providers\.epg\.[A-Za-z0-9_-]+:[0-9]+\/[A-Za-z0-9/_-]+$/.test(path)) {
            throw new Error("Plex returned an unsupported guide provider path.");
        }
        return path;
    }
    function templateQuery(template, section, location) {
        var query = {};
        var text = template.parameters;
        if (typeof text !== "string" || !text || text.length > 16384) {
            throw new Error("Plex did not supply recording parameters.");
        }
        text.split("&").forEach(function (pair) {
            var split = pair.indexOf("=");
            if (split < 1) { throw new Error("Invalid recording parameter."); }
            var key = decodeURIComponent(pair.slice(0, split).replace(/\+/g, " "));
            var value = decodeURIComponent(pair.slice(split + 1).replace(/\+/g, " "));
            if (!/^(?:hints|params|prefs)\[[A-Za-z0-9]+\]$/.test(key) || Object.prototype.hasOwnProperty.call(query, key)) {
                throw new Error("Unsupported recording parameter.");
            }
            query[key] = value;
        });
        query.type = id(template.type);
        query.targetLibrarySectionID = id(section);
        if (location !== undefined && location !== null) { query.targetSectionLocationID = id(location); }
        return query;
    }
    function subscriptionOrder(rows) {
        var seen = {};
        if (!Array.isArray(rows) || rows.length > 200) {
            throw new Error("Recording priorities can verify up to 200 subscriptions.");
        }
        return rows.map(function (row) {
            var key = id(row && row.key);
            if (seen[key]) { throw new Error("Plex returned invalid recording priorities."); }
            seen[key] = true;
            return key;
        });
    }
    function create(client) {
        return {
            providers: function () {
                return client.request("/media/providers").then(function (container) {
                    return list(container, "MediaProvider").filter(function (provider) {
                        return /^tv\.plex\.providers\.epg\.[A-Za-z0-9_-]+:[0-9]+$/.test(provider.identifier || "");
                    });
                });
            },
            dvrs: function () { return client.request("/livetv/dvrs").then(function (c) { return list(c, "Dvr"); }); },
            channels: function (lineup) {
                if (typeof lineup !== "string" || !/^lineup:\/\//.test(lineup) || lineup.length > 2048) {
                    return Promise.reject(new Error("This DVR has no valid channel lineup."));
                }
                return client.request("/livetv/epg/channels", "GET", { lineup: lineup }).then(function (c) { return list(c, "Channel"); });
            },
            browse: function (path, offset) {
                return client.request(providerPath(path), "GET", {
                    "X-Plex-Container-Start": offset || 0, "X-Plex-Container-Size": 50
                });
            },
            grid: function (provider, channel, date) {
                if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || typeof channel !== "string" || !channel || channel.length > 256) {
                    return Promise.reject(new Error("Choose a valid guide date and channel."));
                }
                return client.request(providerPath("/" + provider.identifier + "/grid"), "GET", {
                    channelGridKey: channel, date: date
                }).then(function (c) { return list(c, "Metadata"); });
            },
            subscriptions: function () {
                return client.request("/media/subscriptions", "GET", { includeGrabs: 1, includeStorage: 1 })
                    .then(function (c) { return list(c, "MediaSubscription"); });
            },
            scheduled: function () {
                return client.request("/media/subscriptions/scheduled").then(function (c) { return list(c, "MediaGrabOperation"); });
            },
            templates: function (guid) {
                if (typeof guid !== "string" || !guid || guid.length > 2048) {
                    return Promise.reject(new Error("This program has no recording identifier."));
                }
                return client.request("/media/subscriptions/template", "GET", { guid: guid }).then(function (c) {
                    var result = [];
                    list(c, "SubscriptionTemplate").forEach(function (group) {
                        result = result.concat(list(group, "MediaSubscription"));
                    });
                    return result;
                });
            },
            record: function (template, section, location) {
                return client.request("/media/subscriptions", "POST", templateQuery(template, section, location));
            },
            prioritize: function (selected, expected, active) {
                if (priorityClients.indexOf(client) !== -1) {
                    return Promise.reject(new Error("Wait for the previous recording priority change to finish."));
                }
                priorityClients.push(client);
                var deadline = Date.now() + 60000;
                var selectedId;
                var before;
                function current() {
                    if (typeof active !== "function" || !active()) { throw new Error("The recording change was cancelled."); }
                    if (Date.now() > deadline) { throw new Error("Recording verification timed out. Reload before editing."); }
                }
                function read() {
                    current();
                    return client.request("/media/subscriptions", "GET", { includeGrabs: 1, includeStorage: 1 })
                        .then(function (container) {
                            current();
                            var rows = list(container, "MediaSubscription");
                            if (container.totalSize !== undefined && container.totalSize !== rows.length ||
                                    container.size !== undefined && container.size !== rows.length ||
                                    container.offset !== undefined && container.offset !== 0) {
                                throw new Error("Plex returned incomplete recording priorities. Reload before editing.");
                            }
                            return rows;
                        });
                }
                var operation = Promise.resolve().then(function () {
                    current();
                    selectedId = id(selected && selected.key);
                    if (!Array.isArray(expected) || expected.length > 200) {
                        throw new Error("Recording priorities can verify up to 200 subscriptions.");
                    }
                    return read();
                }).then(function (rows) {
                    before = subscriptionOrder(rows);
                    var position = before.indexOf(selectedId);
                    if (position < 1 || typeof selected.title !== "string" || rows[position].title !== selected.title ||
                            before.join(",") !== expected.map(id).join(",")) {
                        throw new Error("The recording priorities changed on Plex. Reload before editing.");
                    }
                    current();
                    return client.request("/media/subscriptions/" + selectedId + "/move", "PUT");
                }).then(read).then(function (rows) {
                    var expectedOrder = [selectedId].concat(before.filter(function (key) { return key !== selectedId; }));
                    if (subscriptionOrder(rows).join(",") !== expectedOrder.join(",") || rows[0].title !== selected.title) {
                        throw new Error("Plex did not confirm the recording priority. Reload before editing.");
                    }
                });
                return operation.then(function () {
                    priorityClients.splice(priorityClients.indexOf(client), 1);
                }, function (error) {
                    priorityClients.splice(priorityClients.indexOf(client), 1);
                    throw error;
                });
            },
            remove: function (subscription) {
                return client.request("/media/subscriptions/" + id(subscription), "DELETE", null, true);
            },
            edit: function (subscription, settings) {
                var query = {};
                settings.forEach(function (setting) {
                    if (!/^[A-Za-z0-9]+$/.test(setting.id) || typeof setting.value !== "string" || setting.value.length > 512) {
                        throw new Error("Invalid recording preference.");
                    }
                    query["prefs[" + setting.id + "]"] = setting.value;
                });
                return client.request("/media/subscriptions/" + id(subscription), "PUT", query);
            }
        };
    }
    return { create: create, templateQuery: templateQuery };
}));
