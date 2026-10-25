#!/usr/bin/env python3
"""Account-free native product fixture. Never a real PMS, entitlement or panel receipt."""
import argparse
import hashlib
import importlib.util
import ipaddress
import json
from pathlib import Path
import re
import shutil
import subprocess
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlsplit

ROOT = Path(__file__).resolve().parents[2]
APP_ID = "VemmQaApp0.NativeQa"
PACKAGE_ID = "VemmQaApp0"
TOKEN = "synthetic-fixture"


def source_receipt():
    if subprocess.check_output(["git", "status", "--porcelain"], cwd=ROOT, text=True).strip():
        raise ValueError("Commit a clean source candidate before staging the native fixture.")
    return subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()


def fixture_boot(source):
    if not re.fullmatch(r"[0-9a-f]{40}", source):
        raise ValueError("The native fixture needs an exact committed source SHA.")
    return r'''
    var fixtureOrigin = "";
    var fixtureClient = null;
    var nativeFetch = window.fetch;
    window.fetch = function (target, options) {
        if (!fixtureOrigin || String(target).indexOf(fixtureOrigin + "/") !== 0) {
            return Promise.reject(new Error("Native fixture blocked non-fixture HTTP."));
        }
        return nativeFetch(target, options);
    };
    var fixtureAppId = "";
    try {
        fixtureAppId = window.tizen && window.tizen.application &&
            window.tizen.application.getCurrentApplication().appInfo.id;
    } catch (identityError) {
        setStatus("Native fixture could not verify application identity.", true);
        return;
    }
    if (fixtureAppId !== "VemmQaApp0.NativeQa") {
        setStatus("Native fixture refused: wrong application identity.", true);
        return;
    }
    function fixtureOwned() {
        if (!fixtureClient || currentClient !== fixtureClient || currentServerId !== "synthetic-server" ||
                !activeProfile || activeProfile.uuid !== "synthetic-profile") {
            throw new Error("Native fixture ownership changed. Start a new fixture session.");
        }
    }
    window.VemmNativeFixture = {
        source: "__SOURCE__",
        appId: "VemmQaApp0.NativeQa",
        start: function (origin) {
            if (!/^http:\/\/(?:10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+|127\.0\.0\.1):[0-9]{1,5}$/.test(origin)) {
                throw new Error("Use the explicit private native-fixture HTTP origin.");
            }
            if (fixtureClient) { throw new Error("The native fixture is already running."); }
            fixtureOrigin = origin;
            fixtureClient = window.PlexApi.createClient({ baseUrl: origin, token: "synthetic-fixture",
                clientIdentifier: "vemm-native-synthetic", location: "lan", fetch: window.fetch });
            currentClient = fixtureClient;
            currentServerId = "synthetic-server";
            activeProfile = { uuid: "synthetic-profile", title: "Synthetic fixture" };
            accountClient = null;
            loadHome(false);
        },
        home: function () {
            fixtureOwned();
            if (player) { throw new Error("Stop synthetic playback before Home fixture sampling."); }
            navigation = []; loadHome(false);
        },
        detail: function (key) {
            fixtureOwned();
            if (player) { throw new Error("Stop synthetic playback before changing fixture detail."); }
            if (!/^(?:10[0-9]{3}|11000|2000[01]|30000|30001)$/.test(String(key))) {
                throw new Error("Unknown synthetic fixture item.");
            }
            visit(function () { openDetail(String(key), fixtureClient); });
        },
        summary: function () {
            fixtureOwned();
            return { source: "__SOURCE__", appId: "VemmQaApp0.NativeQa",
                cards: screen.querySelectorAll(".media-card").length,
                buttons: screen.querySelectorAll("button").length,
                blobImages: screen.querySelectorAll('img[src^="blob:"]').length,
                overflowX: document.body.scrollWidth > window.innerWidth,
                player: !!player, width: window.innerWidth, height: window.innerHeight,
                generation: viewGeneration,
                nowMs: window.performance && typeof window.performance.now === "function" ?
                    window.performance.now() : null,
                heapBytes: window.performance && window.performance.memory ?
                    window.performance.memory.usedJSHeapSize : null };
        }
    };
    setStatus("Account-free native fixture. Waiting for an explicit private fixture origin.");
}());
'''.replace("__SOURCE__", source)


def stage(output):
    source = source_receipt()
    spec = importlib.util.spec_from_file_location("vemm_build", ROOT / "samsung/build.py")
    build = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(build)
    build.stage(output, build.source_version())
    original = (output / "main.js").read_text(encoding="utf-8")
    boundary = original.rfind('    addConnectForm("");')
    if boundary < 0:
        raise ValueError("Native fixture boot boundary changed; review instead of guessing.")
    (output / "native-fixture-main.js").write_text(original[:boundary] + fixture_boot(source), encoding="utf-8")
    config = (output / "config.xml").read_text(encoding="utf-8")
    config = config.replace('id="VemmTvApp0.Vemm" package="VemmTvApp0"',
                            f'id="{APP_ID}" package="{PACKAGE_ID}"').replace(
                                "https://vemm.invalid/tizen", "https://vemm.invalid/native-qa").replace(
                                    "<name>Vemm</name>", "<name>Vemm QA</name>")
    (output / "config.xml").write_text(config, encoding="utf-8")
    index = (output / "index.html").read_text(encoding="utf-8").replace(
        '<script src="main.js">', '<script src="native-fixture-main.js">').replace(
            "<title>Vemm</title>", "<title>Vemm QA - synthetic only</title>").replace(
                '<header class="app-header">', '<header class="app-header"><p>Vemm QA: synthetic only</p>')
    (output / "index.html").write_text(index, encoding="utf-8")
    files = {str(path.relative_to(output)): hashlib.sha256(path.read_bytes()).hexdigest()
             for path in sorted(output.rglob("*")) if path.is_file()}
    (output / "native-fixture.json").write_text(json.dumps({
        "source": source, "app_id": APP_ID, "package_id": PACKAGE_ID,
        "evidence": "Synthetic native execution; not real PMS, entitlement, production boot or panel acceptance.",
        "boot": "Only the canonical startup suffix is replaced; original main.js is retained and hashed.",
        "files": files,
    }, indent=2) + "\n", encoding="utf-8")


def media(output):
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise ValueError("ffmpeg is missing; no automatic installation is performed.")
    output.mkdir()
    common = [ffmpeg, "-hide_banner", "-loglevel", "error", "-nostdin", "-n"]
    subprocess.run(common + [
        "-f", "lavfi", "-i", "testsrc2=size=1280x720:rate=24",
        "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000",
        "-t", "30", "-map", "0:v:0", "-map", "1:a:0", "-c:v", "libx264",
        "-profile:v", "baseline", "-level:v", "3.1", "-pix_fmt", "yuv420p",
        "-b:v", "1000k", "-c:a", "aac", "-b:a", "96k", "-ac", "2",
        "-af", "volume=0.1", "-movflags", "+faststart", str(output / "synthetic.mp4")
    ], check=True)
    subprocess.run(common + ["-i", str(output / "synthetic.mp4"), "-c", "copy", "-hls_time", "5",
                             "-hls_list_size", "0", "-hls_segment_filename", str(output / "segment-%03d.ts"),
                             str(output / "synthetic.m3u8")], check=True)
    subprocess.run(common + ["-f", "lavfi", "-i", "testsrc2=size=1280x720:rate=1",
                             "-frames:v", "1", "-update", "1", str(output / "art.jpg")], check=True)
    (output / "synthetic.srt").write_text(
        "1\n00:00:01,000 --> 00:00:07,000\nSynthetic subtitle: no household media.\n\n"
        "2\n00:00:10,000 --> 00:00:18,000\nSecond cue\nUnicode: café / беларуская\n", encoding="utf-8")
    files = {path.name: hashlib.sha256(path.read_bytes()).hexdigest() for path in sorted(output.iterdir())}
    (output / "media.json").write_text(json.dumps({
        "synthetic_only": True, "duration_ms": 30000, "width": 1280, "height": 720,
        "video": "H.264 Baseline 3.1", "audio": "AAC stereo, quiet synthetic sine",
        "ffmpeg": subprocess.check_output([ffmpeg, "-version"], text=True).splitlines()[0],
        "files": files,
    }, indent=2) + "\n", encoding="utf-8")


def private_ip(value):
    address = ipaddress.ip_address(value)
    if address.version != 4 or not address.is_private or address.is_unspecified or address.is_multicast:
        raise ValueError("Use an explicit private/loopback IPv4 address, never a wildcard/public bind.")
    return str(address)


class Fixture:
    def __init__(self, media_dir):
        receipt = json.loads((media_dir / "media.json").read_text(encoding="utf-8"))
        if receipt.get("synthetic_only") is not True:
            raise ValueError("Refusing media without an explicit synthetic fixture receipt.")
        self.assets = {}
        for name, digest in receipt["files"].items():
            if not re.fullmatch(r"(?:synthetic\.(?:mp4|m3u8|srt)|art\.jpg|segment-[0-9]+\.ts)", name):
                raise ValueError("Unexpected synthetic asset.")
            path = media_dir / name
            if path.is_symlink() or not path.is_file() or path.stat().st_size > 16 * 1024 * 1024:
                raise ValueError("Unsafe or oversized synthetic asset.")
            if hashlib.sha256(path.read_bytes()).hexdigest() != digest:
                raise ValueError("Synthetic asset checksum mismatch.")
            self.assets[name] = path
        self.watched = {}
        self.calls = {}
        self.lock = threading.Lock()

    def item(self, key, markers=False):
        number = int(key)
        if number not in (20000, 20001, 30000, 30001) and not 10000 <= number < 11001:
            raise ValueError("Unknown synthetic metadata key.")
        kind = {20000: "episode", 20001: "episode", 30000: "show", 30001: "season"}.get(number, "movie")
        item = {"ratingKey": str(number), "type": kind, "title": f"Synthetic {kind} {number}",
                "thumb": "/media/art.jpg", "art": "/media/art.jpg", "duration": 30000,
                "viewCount": self.watched.get(str(number), 0), "viewOffset": 0}
        if kind in ("show", "season"):
            item.update({"leafCount": 2, "viewedLeafCount":
                         self.watched.get("20000", 0) + self.watched.get("20001", 0)})
            return item
        if kind == "episode":
            item.update({"grandparentTitle": "Synthetic show", "grandparentRatingKey": "30000",
                         "parentRatingKey": "30001", "parentIndex": 1, "index": number - 19999})
            if markers:
                item["Marker"] = [{"id": 1, "type": "intro", "startTimeOffset": 1000, "endTimeOffset": 8000},
                                  {"id": 2, "type": "credits", "startTimeOffset": 24000,
                                   "endTimeOffset": 30000, "final": True}]
                item["Chapter"] = [{"id": 1, "index": 0, "startTimeOffset": 0, "endTimeOffset": 15000},
                                   {"id": 2, "index": 1, "startTimeOffset": 15000, "endTimeOffset": 30000}]
        item["Media"] = [{"id": 1, "container": "mp4", "videoCodec": "h264", "audioCodec": "aac",
                          "width": 1280, "height": 720, "bitrate": 1100, "duration": 30000,
                          "Part": [{"id": number, "key": "/media/synthetic.mp4", "container": "mp4",
                                    "Stream": [{"id": 1, "streamType": 1, "codec": "h264", "index": 0},
                                               {"id": 2, "streamType": 2, "codec": "aac", "index": 1,
                                                "languageCode": "eng", "selected": True},
                                               {"id": 3, "streamType": 3, "codec": "srt", "index": 2,
                                                "languageCode": "eng", "key": "/media/synthetic.srt"}]}]}]
        return item

    def reply(self, method, path, query):
        def container(**values):
            return {"MediaContainer": values}
        mutation = path == "/playQueues" and method == "POST" or (
            re.fullmatch(r"/library/parts/[0-9]+", path) and method == "PUT")
        if method not in ("GET", "HEAD") and not mutation:
            raise LookupError("No fixture contract for this method.")
        if path == "/library/sections":
            return container(Directory=[{"key": "1", "type": "movie", "title": "Synthetic movies"},
                                        {"key": "2", "type": "show", "title": "Synthetic shows"}])
        if path == "/hubs/promoted":
            return container(Hub=[
                {"title": "Synthetic movies", "hubIdentifier": "home.movies.recent", "librarySectionID": 1,
                 "size": 1001, "Metadata": [self.item(key) for key in range(10000, 10012)]},
                {"title": "Synthetic episodes", "hubIdentifier": "home.television.recent", "librarySectionID": 2,
                 "Metadata": [self.item(20000, True), self.item(20001, True)]}])
        if path == "/hubs/continueWatching":
            return container(Metadata=[], size=0)
        if path == "/hubs/items" or path == "/library/sections/1/all":
            start = int(query.get("X-Plex-Container-Start", ["0"])[0])
            count = min(50, int(query.get("X-Plex-Container-Size", ["50"])[0]))
            if start < 0 or count < 1:
                raise ValueError("Invalid synthetic page.")
            return container(offset=start, totalSize=1001,
                             Metadata=[self.item(10000 + i) for i in range(start, min(1001, start + count))])
        match = re.fullmatch(r"/library/metadata/([0-9]+)", path)
        if match:
            return container(Metadata=[self.item(match[1], query.get("includeMarkers") == ["1"])])
        if path in ("/library/metadata/30000/children", "/library/metadata/30001/children",
                    "/library/metadata/30000/allLeaves"):
            keys = [30001] if path.endswith("30000/children") else [20000, 20001]
            return container(Metadata=[self.item(key, query.get("includeMarkers") == ["1"]) for key in keys],
                             totalSize=len(keys), offset=0)
        if path in ("/:/scrobble", "/:/unscrobble"):
            key = query.get("key", [""])[0]
            self.item(key)
            for watched_key in (["20000", "20001"] if key in ("30000", "30001") else [key]):
                self.watched[watched_key] = int(path == "/:/scrobble")
            return container(size=0)
        if path == "/:/timeline":
            if query.get("state", [""])[0] not in ("playing", "paused", "buffering", "stopped"):
                raise ValueError("Invalid synthetic timeline state.")
            return container(size=0)
        if path == "/video/:/transcode/universal/decision":
            key = query.get("path", [""])[0].rsplit("/", 1)[-1]
            item = self.item(key, True)
            item["Media"][0]["Part"][0]["decision"] = (
                "directplay" if query.get("directPlay") == ["1"] else "transcode")
            return container(generalDecisionCode=1001, Metadata=[item])
        if path == "/video/:/transcode/universal/stop" or re.fullmatch(r"/library/parts/[0-9]+", path) and method == "PUT":
            return container(size=0)
        if path == "/playQueues" and method == "POST":
            match = re.search(r"/library/metadata/([0-9]+)$", query.get("uri", [""])[0])
            if not match:
                raise ValueError("Only explicit synthetic video items are supported.")
            item = self.item(match[1], query.get("includeMarkers") == ["1"])
            item["playQueueItemID"] = "9007199254740995"
            return container(playQueueID="9007199254740993", playQueueSelectedItemID="9007199254740995",
                             playQueueVersion=1, playQueueTotalCount=1, Metadata=[item])
        raise LookupError("No fixture contract for this route.")


def handler(fixture, allowed):
    class Handler(BaseHTTPRequestHandler):
        def handle(self):
            try:
                super().handle()
            except (BrokenPipeError, ConnectionResetError, TimeoutError) as error:
                with fixture.lock:
                    name = "transport_" + type(error).__name__
                    fixture.calls[name] = fixture.calls.get(name, 0) + 1

        def setup(self):
            super().setup()
            self.connection.settimeout(10)

        def log_message(self, *_args):
            pass

        def send(self, status, body=b"", content_type="application/json", extra=None, head=False):
            self.send_response(status)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            for key, value in (extra or {}).items():
                self.send_header(key, value)
            self.end_headers()
            if not head:
                self.wfile.write(body)

        def dispatch(self, head=False):
            if self.client_address[0] not in allowed:
                self.send(403)
                return
            try:
                length = int(self.headers.get("Content-Length", "0"))
            except ValueError:
                self.send(400)
                return
            if length < 0 or length > 4096:
                self.send(413)
                return
            if length:
                self.rfile.read(length)
            target = urlsplit(self.path)
            query = parse_qs(target.query)
            if (self.headers.get("X-Plex-Token", TOKEN) != TOKEN or
                    query.get("X-Plex-Token", [TOKEN]) != [TOKEN]):
                self.send(403)
                return
            path = target.path
            with fixture.lock:
                fixture.calls[self.command] = fixture.calls.get(self.command, 0) + 1
                asset = None
                if path == "/photo/:/transcode":
                    asset = "art.jpg"
                elif path == "/video/:/transcode/universal/start.m3u8":
                    asset = "synthetic.m3u8"
                elif (re.fullmatch(r"/media/[^/]+", path) or
                      re.fullmatch(r"/video/:/transcode/universal/segment-[0-9]+\.ts", path)):
                    asset = path.rsplit("/", 1)[-1]
                if asset in fixture.assets:
                    if self.command not in ("GET", "HEAD"):
                        self.send(405)
                        return
                    body = fixture.assets[asset].read_bytes()
                    content_type = {".mp4": "video/mp4", ".m3u8": "application/vnd.apple.mpegurl",
                                    ".ts": "video/mp2t", ".jpg": "image/jpeg", ".srt": "text/plain; charset=utf-8"}[
                                        Path(asset).suffix]
                    extra = {"Accept-Ranges": "bytes"}
                    status = 200
                    if self.headers.get("Range"):
                        match = re.fullmatch(r"bytes=([0-9]+)-([0-9]*)", self.headers["Range"])
                        if not match or int(match[1]) >= len(body):
                            self.send(416, extra={"Content-Range": f"bytes */{len(body)}"})
                            return
                        start, end = int(match[1]), int(match[2]) if match[2] else len(body) - 1
                        if end < start:
                            self.send(416)
                            return
                        end = min(end, len(body) - 1)
                        extra["Content-Range"] = f"bytes {start}-{end}/{len(body)}"
                        body, status = body[start:end + 1], 206
                    self.send(status, body, content_type, extra, head)
                    return
                try:
                    response = fixture.reply(self.command, path, query)
                except (ValueError, TypeError):
                    self.send(400, b'{"error":"Invalid synthetic request."}')
                except LookupError:
                    self.send(404, b'{"error":"Missing explicit synthetic fixture contract."}')
                else:
                    self.send(200, json.dumps(response).encode("utf-8"), head=head)

        do_GET = dispatch
        do_POST = dispatch
        do_PUT = dispatch
        do_DELETE = dispatch

        def do_HEAD(self):
            self.dispatch(head=True)

    return Handler


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    for command in ("stage", "media"):
        commands.add_parser(command).add_argument("--output", type=Path, required=True)
    serve = commands.add_parser("serve")
    serve.add_argument("--media", type=Path, required=True)
    serve.add_argument("--bind", type=private_ip, required=True)
    serve.add_argument("--port", type=int, default=32491)
    serve.add_argument("--allow-client", type=private_ip, action="append", required=True)
    args = parser.parse_args()
    if args.command == "stage":
        stage(args.output)
    elif args.command == "media":
        media(args.output)
    else:
        fixture = Fixture(args.media)
        with ThreadingHTTPServer((args.bind, args.port), handler(fixture, set(args.allow_client))) as server:
            server.timeout = 15
            print("Synthetic fixture listening; no real account, PMS, catalogue or tuner is used.", flush=True)
            try:
                server.serve_forever()
            finally:
                print("Synthetic fixture stopped. Method/transport counts: " +
                      json.dumps(fixture.calls, sort_keys=True), flush=True)


if __name__ == "__main__":
    main()
