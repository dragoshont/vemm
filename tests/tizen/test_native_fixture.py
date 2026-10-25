"""Synthetic-only host contracts; these do not establish Samsung or real PMS acceptance."""
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import threading
import unittest
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from http.server import ThreadingHTTPServer
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("native_fixture", ROOT / "tools/tizen/native-fixture.py")
native = importlib.util.module_from_spec(spec)
spec.loader.exec_module(native)


class NativeFixtureTests(unittest.TestCase):
    def test_media_generation_bounds_seek_keyframes_and_segments(self):
        commands = []

        def generated(args, check):
            self.assertTrue(check)
            commands.append(args)
            Path(args[-1]).write_bytes(b"synthetic host generation contract")

        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / "media"
            with patch.object(native.shutil, "which", return_value="/synthetic/ffmpeg"), \
                    patch.object(native.subprocess, "run", side_effect=generated), \
                    patch.object(native.subprocess, "check_output", return_value="ffmpeg synthetic\n"):
                native.media(output)
            video, hls = commands[:2]
            self.assertIn("-g", video, "Default encoder GOP is too large for the one-second seek criterion")
            self.assertEqual(video[video.index("-g") + 1], "24")
            self.assertEqual(video[video.index("-sc_threshold") + 1], "0")
            self.assertEqual(hls[hls.index("-hls_time") + 1], "1")
            self.assertEqual(json.loads((output / "media.json").read_text())["keyframe_interval_ms"], 1000)

    def test_staging_retains_source_and_privileges_without_production_identity(self):
        with tempfile.TemporaryDirectory() as tmp:
            target = Path(tmp) / "app"
            with patch.object(native, "source_receipt", return_value="a" * 40):
                native.stage(target)
            original = (ROOT / "samsung/Vemm/main.js").read_bytes()
            self.assertEqual((target / "main.js").read_bytes(), original)
            prefix = original.decode().split('    addConnectForm("");')[0]
            self.assertTrue((target / "native-fixture-main.js").read_text().startswith(prefix))
            index = (target / "index.html").read_text()
            self.assertIn('src="native-fixture-main.js"', index)
            self.assertNotIn('<script src="main.js">', index)
            config = (target / "config.xml").read_text()
            self.assertIn('id="VemmQaApp0.NativeQa" package="VemmQaApp0"', config)
            self.assertNotIn('id="VemmTvApp0.Vemm"', config)
            original_xml = ET.parse(ROOT / "samsung/Vemm/config.xml")
            staged_xml = ET.parse(target / "config.xml")
            privilege_tag = "{http://tizen.org/ns/widgets}privilege"
            self.assertEqual([p.attrib for p in original_xml.findall(privilege_tag)],
                             [p.attrib for p in staged_xml.findall(privilege_tag)])
            receipt = json.loads((target / "native-fixture.json").read_text())
            self.assertEqual(receipt["source"], "a" * 40)
            self.assertEqual(receipt["files"]["main.js"], hashlib.sha256(original).hexdigest())
            self.assertEqual((target / "LICENSE").read_bytes(), (ROOT / "LICENSE").read_bytes())
            with self.assertRaises(FileExistsError):
                with patch.object(native, "source_receipt", return_value="b" * 40):
                    native.stage(target)

    def test_explicit_synthetic_http_routes_ranges_and_mutations(self):
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            body = b"synthetic-not-a-real-media-file"
            (directory / "synthetic.mp4").write_bytes(body)
            (directory / "media.json").write_text(json.dumps({
                "synthetic_only": True,
                "files": {"synthetic.mp4": hashlib.sha256(body).hexdigest()},
            }))
            fixture = native.Fixture(directory)
            with ThreadingHTTPServer(("127.0.0.1", 0), native.handler(fixture, {"127.0.0.1"})) as server:
                thread = threading.Thread(target=server.serve_forever, daemon=True)
                thread.start()
                base = f"http://127.0.0.1:{server.server_address[1]}"

                def get(path, headers=None, method="GET"):
                    return urlopen(Request(base + path, headers=headers or {}, method=method), timeout=3)

                try:
                    with get("/media/synthetic.mp4", {"Range": "bytes=3-8"}) as response:
                        self.assertEqual(response.status, 206)
                        self.assertEqual(response.read(), body[3:9])
                        self.assertEqual(response.headers["Content-Range"], f"bytes 3-8/{len(body)}")
                    for path, headers, status in [
                        ("/missing-contract", {}, 404),
                        ("/library/sections", {"X-Plex-Token": "deliberately-invalid-nonsynthetic"}, 403),
                        ("/media/synthetic.mp4", {"Range": "bytes=9999-"}, 416),
                        ("/media/../private.txt", {}, 404),
                        ("/:/timeline", {}, 404),
                    ]:
                        with self.assertRaises(HTTPError) as error:
                            get(path, headers)
                        self.assertEqual(error.exception.code, status)
                        error.exception.close()
                    with get("/library/metadata/20000?includeMarkers=1") as response:
                        item = json.load(response)["MediaContainer"]["Metadata"][0]
                        self.assertEqual(item["Marker"][0]["endTimeOffset"], 8000)
                    with get("/library/metadata/20000") as response:
                        self.assertNotIn("Marker", json.load(response)["MediaContainer"]["Metadata"][0])
                    with get("/:/scrobble?key=20000") as response:
                        self.assertEqual(response.status, 200)
                    with get("/library/metadata/30000") as response:
                        self.assertEqual(json.load(response)["MediaContainer"]["Metadata"][0]["viewedLeafCount"], 1)
                    with get("/hubs/items?X-Plex-Container-Start=200&X-Plex-Container-Size=500") as response:
                        container = json.load(response)["MediaContainer"]
                        self.assertEqual(len(container["Metadata"]), 50)
                        self.assertEqual(container["Metadata"][0]["ratingKey"], "10200")
                        self.assertEqual(container["totalSize"], 1001)
                    subprocess.run(["node", str(ROOT / "tests/tizen/native-fixture-ui.test.js"), base],
                                   cwd=ROOT, check=True, timeout=15)
                    self.assertIsNone(fixture.queue_id, "The production remote Stop must clear its owned queue")
                    cleared = fixture.cleared_queue_id
                    self.assertEqual(cleared, "9007199254740993")
                    with get(f"/playQueues/{cleared}/items", method="DELETE") as response:
                        self.assertEqual(response.status, 200, "An owned lost-response cleanup can be retried")
                    with get("/playQueues?type=video&uri=server://synthetic-server/"
                             "com.plexapp.plugins.library/library/metadata/20001", method="POST") as response:
                        queue = json.load(response)["MediaContainer"]
                        self.assertEqual(queue["playQueueSelectedItemOffset"], 0)
                        self.assertIs(queue["playQueueShuffled"], False)
                        self.assertNotEqual(queue["playQueueID"], cleared)
                    with self.assertRaises(HTTPError) as error:
                        get("/playQueues?type=video&uri=server://synthetic-server/"
                            "com.plexapp.plugins.library/library/metadata/20000", method="POST")
                    self.assertEqual(error.exception.code, 400, "The fixture refuses unbounded active queue accumulation")
                    error.exception.close()
                    with get(f"/playQueues/{cleared}/items", method="DELETE") as response:
                        self.assertEqual(response.status, 200)
                    self.assertEqual(fixture.queue_id, queue["playQueueID"],
                                     "Retrying an old clear cannot clear a subsequent owned queue")
                    with self.assertRaises(HTTPError) as error:
                        get("/playQueues/123/items", method="DELETE")
                    self.assertEqual(error.exception.code, 404, "Unknown queue ownership is not fabricated")
                    error.exception.close()
                    with get(f"/playQueues/{queue['playQueueID']}/items", method="DELETE") as response:
                        self.assertEqual(response.status, 200)
                    self.assertIsNone(fixture.queue_id)
                finally:
                    server.shutdown()
                    thread.join(timeout=3)
                self.assertFalse(thread.is_alive())

    def test_no_wildcard_public_bind_or_unverified_media(self):
        for address in ("0.0.0.0", "8.8.8.8", "224.0.0.1", "::1"):
            with self.assertRaises(ValueError):
                native.private_ip(address)
        self.assertEqual(native.private_ip("127.0.0.1"), "127.0.0.1")
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            (directory / "media.json").write_text('{"synthetic_only": false, "files": {}}')
            with self.assertRaisesRegex(ValueError, "synthetic"):
                native.Fixture(directory)


if __name__ == "__main__":
    unittest.main()
