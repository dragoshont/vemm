(function (root) {
    "use strict";
    function dimensions(bytes, type) {
        var width, height, offset, length, marker;
        if (type.toLowerCase() === "image/png") {
            if (bytes.length < 24 || bytes[0] !== 137 || bytes[1] !== 80 || bytes[2] !== 78 ||
                    bytes[3] !== 71 || bytes[4] !== 13 || bytes[5] !== 10 || bytes[6] !== 26 || bytes[7] !== 10 ||
                    bytes[12] !== 73 || bytes[13] !== 72 || bytes[14] !== 68 || bytes[15] !== 82) {
                throw new Error("Photo has an invalid PNG header.");
            }
            width = bytes[16] * 16777216 + bytes[17] * 65536 + bytes[18] * 256 + bytes[19];
            height = bytes[20] * 16777216 + bytes[21] * 65536 + bytes[22] * 256 + bytes[23];
        } else {
            if (bytes[0] !== 255 || bytes[1] !== 216) { throw new Error("Photo has an invalid JPEG header."); }
            offset = 2;
            while (offset + 4 <= bytes.length) {
                if (bytes[offset++] !== 255) { break; }
                while (bytes[offset] === 255) { offset += 1; }
                marker = bytes[offset++];
                if (marker === 218 || marker === 217) { break; }
                length = bytes[offset] * 256 + bytes[offset + 1];
                if (length < 2 || offset + length > bytes.length) { break; }
                if (marker >= 192 && marker <= 207 && [196, 200, 204].indexOf(marker) === -1) {
                    if (length < 8) { break; }
                    height = bytes[offset + 3] * 256 + bytes[offset + 4];
                    width = bytes[offset + 5] * 256 + bytes[offset + 6];
                    break;
                }
                offset += length;
            }
        }
        if (!width || !height) { throw new Error("Photo dimensions are unavailable within the bounded image header."); }
        if (width > 1920 || height > 1080) { throw new Error("Photo exceeds the decoded image memory limit."); }
    }
    root.VemmPhotos = {
        create: function (options) {
            var items = options.items;
            var source = options.source;
            if (!Array.isArray(items) || !items.length || items.length > 200 ||
                    items.some(function (item) { return !item || (item.type !== "photo" && (!source || item.type !== "photoalbum")); })) {
                throw new Error("Choose 1 to 200 photos from the current page.");
            }
            var index = options.index === undefined ? 0 : options.index;
            if (typeof index !== "number" || Math.floor(index) !== index || index < 0 || index >= items.length ||
                    items[index].type !== "photo") {
                throw new Error("Photo is not available on this page.");
            }
            function integer(value) {
                return typeof value === "number" && isFinite(value) && value >= 0 &&
                    Math.floor(value) === value && value <= 2147483647;
            }
            var start = source ? source.start : 0;
            var total = source ? source.total : items.length;
            if (!integer(start) || !integer(total) || total < start + items.length ||
                    source && typeof source.load !== "function") {
                throw new Error("The photo album page is invalid. Return to the album and retry.");
            }
            var position = start + index;
            var direction = 1;
            var closed = false;
            var generation = 0;
            var timer = null;
            var decodeTimer = null;
            var url = "";
            var slideshow = false;
            var phase = "loading";
            var rotation = 0;
            var cancelHeader = null;
            var image = options.element("img", "photo-display");
            var heading = options.element("h2", "photo-title");
            var parent = options.parent;
            parent.appendChild(heading);
            parent.appendChild(image);
            function revoke() {
                if (url) { options.urls.revokeObjectURL(url); url = ""; }
            }
            function cancelSlide() {
                if (timer !== null) { clearTimeout(timer); timer = null; }
            }
            function cancelTimer() {
                cancelSlide();
                if (decodeTimer !== null) { clearTimeout(decodeTimer); decodeTimer = null; }
            }
            function releaseHeader() {
                if (cancelHeader) { var cancel = cancelHeader; cancelHeader = null; cancel(); }
            }
            function inspect(blob) {
                return new Promise(function (resolve, reject) {
                    if (typeof FileReader !== "function" || typeof blob.slice !== "function") {
                        reject(new Error("Bounded photo header reading is unavailable in this runtime.")); return;
                    }
                    var reader = new FileReader();
                    function finish(error) {
                        reader.onload = null; reader.onerror = null; reader.onabort = null;
                        cancelHeader = null;
                        if (error) { reject(error); } else { resolve(); }
                    }
                    cancelHeader = function () {
                        finish(new Error("Photo header reading was cancelled."));
                        reader.abort();
                    };
                    reader.onerror = function () { finish(new Error("Photo header could not be read. Retry or choose another.")); };
                    reader.onabort = function () { finish(new Error("Photo header reading was cancelled.")); };
                    reader.onload = function () {
                        try { dimensions(new Uint8Array(reader.result), blob.type); }
                        catch (error) { finish(error); return; }
                        finish();
                    };
                    reader.readAsArrayBuffer(blob.slice(0, 256 * 1024));
                });
            }
            function pressed() {
                if (slideshowControl) { slideshowControl.setAttribute("aria-pressed", slideshow ? "true" : "false"); }
            }
            function schedule() {
                cancelSlide();
                if (!closed && slideshow && phase === "ready") {
                    timer = setTimeout(function () { timer = null; advance(1); }, options.delay || 5000);
                }
            }
            function rotate() {
                var scale = 1;
                if (rotation % 180 && image.clientWidth > 0 && image.clientHeight > 0) {
                    scale = Math.min(image.clientWidth / image.clientHeight, image.clientHeight / image.clientWidth);
                }
                image.style.transform = "rotate(" + rotation + "deg) scale(" + scale + ")";
            }
            function fail(error) {
                cancelTimer();
                phase = "error";
                slideshow = false;
                pressed();
                image.onload = null; image.onerror = null;
                image.removeAttribute("src");
                revoke();
                releaseHeader();
                options.status(error.message, true);
            }
            function load() {
                if (closed) { return; }
                var own = ++generation;
                cancelTimer();
                releaseHeader();
                if (options.client.cancelRequests) { options.client.cancelRequests(); }
                phase = "loading";
                rotation = 0; rotate();
                image.onload = null; image.onerror = null;
                image.removeAttribute("src");
                revoke();
                options.status(options.translate("Loading photo..."));
                Promise.resolve().then(function () {
                    if (closed || own !== generation) { return null; }
                    if (position >= start && position < start + items.length) { return null; }
                    if (!source) { throw new Error("Photo is not available on this page."); }
                    var requested = Math.floor(position / 50) * 50;
                    return source.load(requested).then(function (container) {
                        if (closed || own !== generation) { return; }
                        var page = container && container.Metadata;
                        if (!Array.isArray(page) || !page.length || page.length > 50 ||
                                !integer(container.totalSize) || container.totalSize < requested + page.length ||
                                container.offset !== undefined && container.offset !== requested ||
                                page.some(function (item) { return !item || ["photo", "photoalbum"].indexOf(item.type) === -1; })) {
                            throw new Error("The photo album page is incomplete. Return to the album and retry.");
                        }
                        if (position >= container.totalSize || position >= requested + page.length) {
                            throw new Error("The photo album changed. Return to the album and retry.");
                        }
                        items = page; start = requested; total = container.totalSize;
                    });
                }).then(function () {
                    if (closed || own !== generation) { return null; }
                    index = position - start;
                    while (index >= 0 && index < items.length && items[index].type !== "photo") { index += direction; }
                    if (index < 0 || index >= items.length) {
                        throw new Error("This page contains albums, not photos. Return to the album to choose one.");
                    }
                    position = start + index;
                    heading.textContent = items[index].title || options.translate("Photo");
                    image.alt = heading.textContent;
                    if (options.changed) { options.changed(items, index, start, total); }
                    return options.client.photo(items[index]);
                }).then(function (blob) {
                    if (closed || own !== generation) { return; }
                    if (!blob || !integer(blob.size) || !blob.size || blob.size > 4 * 1024 * 1024) {
                        throw new Error("Photo exceeds the image memory limit or is empty.");
                    }
                    if (!/^image\/(?:jpeg|png)$/i.test(blob.type || "")) {
                        throw new Error("Photo format is unavailable. The server must return JPEG or PNG.");
                    }
                    decodeTimer = setTimeout(function () {
                        if (!closed && own === generation) {
                            fail(new Error(options.translate("Photo could not be decoded. Retry or choose another.")));
                        }
                    }, 15000);
                    return inspect(blob).then(function () { return blob; });
                }).then(function (blob) {
                    if (closed || own !== generation || phase === "error") { return; }
                    url = options.urls.createObjectURL(blob);
                    phase = "decoding";
                    image.onload = function () {
                        if (closed || own !== generation) { return; }
                        if (image.naturalWidth > 1920 || image.naturalHeight > 1080) {
                            fail(new Error("Photo exceeds the decoded image memory limit.")); return;
                        }
                        cancelTimer();
                        image.onload = null; image.onerror = null;
                        revoke();
                        phase = "ready";
                        options.status((position + 1) + " / " + total + " - " +
                            options.translate(source ? "Photos" : "Photos on this page"));
                        schedule();
                    };
                    image.onerror = function () {
                        if (closed || own !== generation) { return; }
                        fail(new Error(options.translate("Photo could not be decoded. Retry or choose another.")));
                    };
                    image.src = url;
                }).catch(function (error) {
                    if (closed || own !== generation || phase === "error") { return; }
                    fail(error);
                });
            }
            function advance(delta) {
                if (closed) { return; }
                direction = delta;
                position = (position + delta + total) % total;
                load();
            }
            var controls = options.element("section", "photo-controls");
            parent.appendChild(controls);
            options.button(controls, "Previous photo", function () { advance(-1); });
            options.button(controls, "Next photo", function () { advance(1); });
            options.button(controls, "Rotate photo", function () {
                if (closed || phase !== "ready") { return; }
                rotation = (rotation + 90) % 360; rotate();
            });
            var slideshowControl = options.button(controls, "Slideshow / Pause", function () {
                if (closed) { return; }
                slideshow = !slideshow;
                pressed();
                if (slideshow) {
                    if (phase === "error") { load(); }
                    else { schedule(); }
                } else { cancelSlide(); options.status(options.translate("Slideshow paused.")); }
            });
            pressed();
            options.button(controls, "Retry photo", load);
            options.button(controls, "Back", options.back);
            load();
            return {
                close: function () {
                    if (closed) { return; }
                    closed = true; generation += 1; cancelTimer();
                    releaseHeader();
                    slideshow = false; pressed();
                    if (options.client.cancelRequests) { options.client.cancelRequests(); }
                    image.onload = null; image.onerror = null;
                    image.removeAttribute("src"); revoke();
                }
            };
        }
    };
}(this));
