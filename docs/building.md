# Building and distributing Vemm for Samsung

The maintained source is `samsung/Vemm/`, a public-API Tizen Web app with
Samsung AVPlay. No ARM cross-toolchain, native Makefile or LG SDK is required.
Node and Python 3.10+ run the host checks; an **already-installed** Tizen Studio
Web CLI is needed only for the unsigned SDK build or separately authorized
signing. Do not install SDKs or access certificates as an implicit test step.

## Host loop

```sh
npm ci --prefix tests/tizen --ignore-scripts --no-audit --no-fund
tools/tizen/test.sh
tools/tizen/build-source.sh samsung/Vemm
```

`test.sh` runs synthetic DOM/API contracts, independent repository inventory,
locale/icon freshness, Python staging/source tests, benchmark/probe host tests
and the ES5/Chromium M47 compatibility gate. No device or account is contacted.
`build-source.sh` uses `TIZEN_CLI`, PATH or `TIZEN_HOME`, builds unsigned into a
unique temporary directory and removes only its owned output.

Catalogs are under `samsung/locales/`; additions/overrides are
`samsung/strings.json`. After edits run
`node tools/tizen/build-locales.js --write`.
The original icon is reproducible with `python3 tools/tizen/build-icon.py --write`.
Both generated outputs have freshness checks.

Commit and confirm a clean tree before the final gates. Afterward confirm the
tree remains clean; bind evidence to that exact SHA. An unsigned source build
does not prove signing, install/update, remote input, AVPlay decoding, HDR,
panel output or performance. Those require separately authorized named-model
acceptance, not an LG native benchmark.

## Isolated native product fixture

`tools/tizen/native-fixture.py` prepares a separate **Vemm QA** widget
(`VemmQaApp0.NativeQa` / `VemmQaApp0`) and account-free HTTP fixture. It is
development tooling, not another shipped renderer or a real PMS. A clean
committed source is mandatory for staging; existing output is never overwritten.
The original `main.js`, modules and notices are retained and hashed. Only the
canonical startup suffix is replaced in a separately named executable copy,
which refuses to start outside that exact QA application identity. Production
Vemm identity, storage, sign-in and signing continuity are untouched; no new
platform privileges are requested.

```sh
python3 tools/tizen/native-fixture.py stage --output /absolute/private/new-qa-app
python3 tools/tizen/native-fixture.py media --output /absolute/private/new-synthetic-media
python3 tools/tizen/native-fixture.py serve \
  --media /absolute/private/new-synthetic-media \
  --bind PRIVATE_HOST_IP --allow-client TV_IP --allow-client 127.0.0.1
```

The media command uses an already-installed `ffmpeg` to generate 30 seconds of
synthetic H.264/AAC, HLS, artwork and SRT; it installs nothing and accepts no
household input. The server verifies media checksums, binds an explicit
private IPv4 interface, admits only explicitly listed client addresses, limits
assets/ranges/request bodies and rejects unknown contracts rather than
returning generic success. Mutations affect only its disposable RAM records.
It does not implement real cloud entitlement, tuner, licensed catalogue or all
PMS behavior.

Build/sign/install the QA widget only under the authorized Samsung lane after
checking the QA ID is not somebody else's existing app. Use the existing
approved author/profile, never replace or uninstall production Vemm, and
record the separate QA payload/source hashes. Following fresh live identity
matching, invoke `VemmNativeFixture.start()` through its owned inspector with
the explicit private fixture origin supplied **at runtime**, not stored in the
widget. Fetch is restricted to that exact origin. No Plex account/server token
is configured, and the HTTP fixture rejects unexpected token values. This is
a fetch boundary, not an assertion of
general network isolation. Synthetic setup functions cannot navigate away
from an active player or change ownership silently. Exercise real remote
actions after setup; source helper calls alone do not prove D-pad behavior.

Keep per-model native samples/receipts private and distinguish native
DOM/resource/AVPlay observations from real PMS interoperability, production
startup/update and physical panel/audio acceptance. Heap absence is `null`,
not zero; timing is not presented FPS. Stop the owned fixture server and
release only owned links/forwards when the bounded run ends.

## Separate Vemm distribution

Vemm uses `VemmTvApp0` / `VemmTvApp0.Vemm`, `vemm-tizen-*` storage,
`Vemm-X.Y.Z.wgt`, `Vemm-source-<sha>.zip`, `vX.Y.Z` tags and a separately
retained Vemm author certificate. It is not an update to the historical Plx app
and reads none of that app's tokens/preferences. Published `Plx-*.wgt`,
`samsung-v*` tags and old source offers remain immutable history.

For a separately authorized future release:

```sh
python3 samsung/source_bundle.py --output /absolute/private/release-directory
python3 samsung/release.py X.Y.Z --notes-file /path/to/vX.Y.Z-notes.md
```

The source builder refuses a dirty or untracked source tree and existing output
files. It archives **all tracked source at HEAD**, including tests, build recipes,
catalogs, notices and license texts; its filename includes the exact SHA and it
writes a checksum. The local publisher includes that archive and checksum next
to the WGT. `--no-publish` builds without publishing, but still requires signing
authorization. Do not execute the publisher merely to validate source cleanup.

`samsung/build.py` stages the explicit root app files, flat `.js`, `.css` and
`.svg` assets from their product directories, plus `LICENSE`, `LICENSING.md`,
`THIRD-PARTY-NOTICES.md`, `TRADEMARKS.md` and the explicit `LICENSE_FILES`
inventory from `licenses/` (not arbitrary local directory contents). Hidden files, source maps, old WGTs
and unrelated/private file types are not product assets. This is a staging
boundary, not a secret scanner: review the actual source and staged entries.
`js/product.js` carries the source version, matching `config.xml`.
The default local build uses that version. Explicit `stage(app, X.Y.Z)` stamps
both files in the staged copy, so About and both PMS/account protocol headers
agree with the package version without rewriting source or retaining a
historical client version. This metadata agreement is not release acceptance.
The notices are legal payload,
not executable dependencies. Review actual archive entries and preserve matching
complete-source availability under GPL section 6(d).

`.github/workflows/samsung.yml` runs host/source checks for all PR/main changes.
Its SDK/signing job is restricted to an explicit `vX.Y.Z` tag. It preserves
the Vemm local-author publication handoff when a release already exists;
ordinary CI artifacts are not signed production updates. Release identity and
post-publication checks are in [the transition contract](samsung-project-transition.md).
