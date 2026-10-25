(function (root, factory) {
    var api = factory();
    if (typeof module === "object" && module.exports) { module.exports = api; }
    else { root.VemmQueue = api; }
}(this, function () {
    "use strict";
    function create(items, selected, random) {
        if (!Array.isArray(items) || !items.length || items.length > 200 ||
                items.some(function (item) { return !item || item.type !== "track" || !/^[0-9]+$/.test(String(item.ratingKey)); })) {
            throw new Error("Choose a music queue of 1 to 200 available tracks.");
        }
        var original = items.slice();
        var order = original.slice();
        var index = selected === undefined ? 0 : selected;
        if (typeof index !== "number" || index < 0 || index >= order.length || Math.floor(index) !== index) {
            throw new Error("Choose an available track in the queue.");
        }
        var repeat = "off";
        var shuffled = false;
        random = random || Math.random;
        return {
            current: function () { return order[index]; },
            items: function () { return order.slice(); },
            position: function () { return index; },
            next: function (automatic) {
                if (automatic && repeat === "one") { return order[index]; }
                if (index + 1 >= order.length) {
                    if (repeat !== "all") { return null; }
                    index = 0;
                } else { index += 1; }
                return order[index];
            },
            previous: function () {
                if (index > 0) { index -= 1; }
                else if (repeat === "all") { index = order.length - 1; }
                return order[index];
            },
            repeat: function (mode) {
                if (["off", "one", "all"].indexOf(mode) === -1) { throw new Error("Invalid queue repeat mode."); }
                repeat = mode;
                return repeat;
            },
            shuffle: function (enabled) {
                if (typeof enabled !== "boolean") { throw new Error("Choose shuffle on or off."); }
                var current = order[index];
                shuffled = enabled;
                order = original.slice();
                if (enabled) {
                    order.splice(order.indexOf(current), 1);
                    for (var i = order.length - 1; i > 0; i -= 1) {
                        var value = random();
                        if (!(value >= 0 && value < 1)) { throw new Error("Invalid shuffle source."); }
                        var j = Math.floor(value * (i + 1));
                        var swap = order[i]; order[i] = order[j]; order[j] = swap;
                    }
                    order.unshift(current);
                }
                index = order.indexOf(current);
                return shuffled;
            }
        };
    }
    function createServer(client, initial, kind) {
        var video = kind === "video";
        function request(name, args) {
            return client[name.replace("Music", video ? "Video" : "Music")].apply(client, args);
        }
        var projection = initial;
        var selected = initial.items.filter(function (item) {
            return String(item.playQueueItemID) === initial.itemId;
        })[0];
        if (!selected) { throw new Error("The selected play queue entry is unavailable."); }
        var position = initial.offset;
        var repeat = "off";
        var closed = false;
        var revision = 0;
        var pending = null;
        var closing = null;
        function active() {
            if (closed) { throw new Error("The play queue was closed."); }
            if (pending) { throw new Error("Wait for the play queue request to finish."); }
        }
        function run(request, receive) {
            active();
            var ownRevision = revision;
            pending = request().then(function (result) {
                if (closed || revision !== ownRevision) {
                    var error = new Error("The play queue request was cancelled.");
                    error.code = "cancelled";
                    throw error;
                }
                return receive(result);
            });
            return pending.then(function (result) { pending = null; return result; },
                function (error) { pending = null; throw error; });
        }
        return {
            current: function () { return selected; },
            snapshot: function () {
                return { id: projection.id, itemId: String(selected.playQueueItemID), version: projection.version };
            },
            position: function () { return position; },
            items: function () { return projection.items.slice(); },
            repeat: function (mode) {
                if (["off", "one", "all"].indexOf(mode) === -1) { throw new Error("Invalid queue repeat mode."); }
                repeat = mode;
                return repeat;
            },
            peek: function (direction, automatic) {
                active();
                if (direction !== -1 && direction !== 1) { return Promise.reject(new Error("Choose previous or next track.")); }
                if (automatic && repeat === "one" || direction < 0 && position === 0 && repeat !== "all") {
                    return Promise.resolve({ item: selected, position: position, revision: revision });
                }
                var target = position + direction;
                if (target >= projection.total && repeat !== "all") { return Promise.resolve(null); }
                target = (target + projection.total) % projection.total;
                if (target === position) { return Promise.resolve({ item: selected, position: position, revision: revision }); }
                return run(function () {
                    return request("getMusicPlayQueue", [projection.id, String(selected.playQueueItemID), direction]);
                }, function (page) {
                    if (page.id !== projection.id || page.version !== projection.version || page.total !== projection.total) {
                        throw new Error("The play queue changed on Plex. Stop and reopen it.");
                    }
                    var item = page.items[direction > 0 ? 0 : page.items.length - 1];
                    if (!item || String(item.playQueueItemID) === String(selected.playQueueItemID) && projection.total > 1) {
                        throw new Error("Plex did not return the next play queue page. Retry or stop playback.");
                    }
                    return { item: item, position: target, revision: revision, page: page };
                });
            },
            select: function (candidate) {
                active();
                if (candidate.revision !== revision) { throw new Error("The play queue selection is out of date."); }
                selected = candidate.item;
                position = candidate.position;
                if (candidate.page) { projection = candidate.page; }
            },
            shuffle: function (enabled) {
                return run(function () { return request("shuffleMusicPlayQueue", [projection.id, enabled]); }, function (page) {
                    var current = page.items.filter(function (item) {
                        return String(item.playQueueItemID) === String(selected.playQueueItemID);
                    })[0];
                    if (page.id !== projection.id || page.version < projection.version ||
                            page.itemId !== String(selected.playQueueItemID) || !current || page.shuffled !== enabled) {
                        throw new Error("Plex did not confirm the play queue order. Stop and reopen it.");
                    }
                    projection = page;
                    selected = current;
                    position = page.offset;
                    revision += 1;
                    return enabled;
                });
            },
            cancel: function () {
                revision += 1;
                request("cancelMusicQueueRequests", [projection.id]);
                return Promise.resolve(pending).then(function () {}, function () {});
            },
            close: function () {
                if (closing) { return closing; }
                closed = true;
                revision += 1;
                request("cancelMusicQueueRequests", [projection.id]);
                // Mutations finish before clearing; cancelling their HTTP response would lose ownership.
                closing = Promise.resolve(pending).then(function () {}, function () {}).then(function () {
                    return request("clearMusicPlayQueue", [projection.id]);
                }).catch(function (error) { closing = null; throw error; });
                return closing;
            }
        };
    }
    return { create: create, createServer: createServer };
}));
