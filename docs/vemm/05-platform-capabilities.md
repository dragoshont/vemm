# Vemm platform capability evidence

## Evidence levels

Vemm keeps capability sources distinct:

1. **Published specification** — Samsung's dated media/engine tables.
2. **Device-reported capability** — public runtime APIs such as UHD/HDR panel
   reports and exact model/family/firmware/Tizen identity.
3. **Playback observation** — a bounded named-model/media result.
4. **Conservative fallback** — conversion or explicit unsupported/unknown state.

No single boolean represents all four levels.

## Current Samsung provider

`js/capabilities.js` builds a documented profile from Tizen version and
public panel information. It then checks `js/model-register.js` for an exact
model + family + firmware + Tizen tuple. A partial match never inherits another
device's observation.

The current observed register contains one 2017 UE55MU6172 tuple with narrow
video Direct Play observations. Its empty audio list, unknown subtitles and
unknown HDR are intentional: those dimensions were not certified by the video
observation.

Documented profiles can request Direct Play where Samsung's published
specification predicts support. They remain `measured: false`, PMS can decline,
and AVPlay rejection falls back unless Direct Play is Force.

## Capability contract

The profile used by playback contains:

- evidence status and source;
- measured flag;
- Tizen/runtime basis;
- supported video/audio codecs and container combinations;
- resolution, bitrate, frame-rate, bit-depth and H.264-level limits;
- HDR class;
- narrow observations where available.

Future evidence must add exact tuples or dated specification changes. Do not add
model-year aliases, broad product-family certification or another platform's
codec assumptions.

## Accessibility and Store feasibility

The 0.2.0 candidate adds persisted, TV-local reduced-motion and larger-interface
text controls. Manual reduced motion disables CSS transitions/animations even
where the system media query is unavailable; it retains the existing Home
compositor transform and visible focus. Larger text enlarges menu/card labels,
help, status and metadata without changing subtitle appearance. The document
language follows the selected interface locale. Remote/DOM regressions cover
selection, restart, reset and storage refusal; physical legibility and clipping
still require the named-TV/locale matrix.

Samsung's [TTS guide](https://developer.samsung.com/smarttv/develop/guides/fundamentals/text-to-speech.html)
documents Voice Guide reading focused HTML, including JavaScript focus, roles,
names and descriptions. It warns that older engines incompletely implement
name computation and that Tizen 3.0 alert-role support is limited. Existing
button/label/focus semantics are therefore a useful seam, not proof of audible
output. The TV's Voice Guide setting belongs to its user; Vemm does not switch
it on, add an independent speech engine or claim screen-reader certification.

Samsung's [accessibility guide](https://developer.samsung.com/smarttv/develop/guides/fundamentals/accessibility.html)
distinguishes US IP captioning, accessible UI and communications obligations.
Its caption criteria include multiple fonts, colors, opacity, edge/window
attributes, size range, preview and retention. Vemm's SRT/WebVTT appearance
settings do not establish complete CEA-708 compliance. Intended countries,
content and Store review need a specific legal/accessibility assessment;
existing developer sideloads are not that assessment.

The current [Seller Office registration guide](https://developer.samsung.com/tv-seller-office/guides/applications/registering-application.html)
explicitly accepts Tizen Web WGT packages, separates the Seller application ID
from the package's Tizen ID, and requires package pretesting before registration.
The [partnership guide](https://developer.samsung.com/tv-seller-office/guides/membership/becoming-partner.html)
requires Partner Seller approval for countries outside the US and certain
APIs. No seller identity, countries, model groups, reviewer backend, partnership,
GPL/Store-terms compatibility or Plex/brand permission has been established for
Vemm. These remain specific distribution gates, not evidence that GPL apps are
categorically accepted or prohibited. Preserve the existing author/update
identity; do not rotate it to manufacture Store eligibility. No submission,
seller-account mutation or approval is implied by these public reads.

## Plex service feasibility boundaries

The independently observed public Plex Web 4.163.0 startup requested
`together.plex.tv/rooms`. The accompanying official Watch Together article
observation records its 2025-02-25 withdrawal note for most newer native
experiences while retaining Web support. That is not universal withdrawal and
does not establish a supported third-party room ownership, authorization,
clock/seek/pause or reconnect protocol. No authorized disposable service
context or synchronization contract is available. Do not add fake rooms,
borrow household identities or infer a usable API from the URL.

Plex's public [AVOD direct-playback partner guide](https://catalogs-docs.plex.tv/avod-direct-playback-partner-guide/)
is explicitly a **draft** for partner feasibility, with indicative fields.
It describes assigned partner/catalog credentials, a shared secret retained
server-side, time-limited signed bootstrap requests, licensed geo/windows,
DRM licensing, client-side ads and timeline reporting. Its catalogue is too
large for direct TV ingestion and explicitly calls for server-side streaming
ingest. None of those rights or a production contract has been granted to
Vemm. A normal personal-PMS token and metadata/Watchlist access cannot replace
them. Do not embed a partner secret in a WGT, bypass ads/DRM, or present the
draft as a live supported Vemm endpoint. Licensed playback remains externally
gated; personal-PMS playback remains separate.

These public references were read for the 0.2.0 feasibility work on 2026-10-25.
They do not grant service access, certify a device or authorize publication.

## Styled and image subtitles: bounded fallback decision

Primary sources were read again on 2026-10-25. Samsung's
[subtitle guide](https://developer.samsung.com/smarttv/develop/guides/multimedia/subtitles.html)
documents common SAMI, SMPTE-TT and DFXP paths; external AVPlay subtitle files
require absolute local paths. This does not establish complete ASS styling or
PGS/VobSub image rendering. Vemm's bounded SRT/WebVTT DOM overlay is a separate
implementation; cleaning embedded text is not a styled-subtitle renderer.

| Format | Current supported request policy | Unaccepted output criterion |
| --- | --- | --- |
| ASS / SSA | Preserve the selected stream and request PMS video burn-in; do not flatten a styled track into a claimed equivalent local rendering. | Actual fonts, positioning, drawing, animation, timing and conversion output. |
| PGS | Preserve the selected stream and request PMS video burn-in, not text decoding or copied-video Direct Stream. | Actual bitmap placement, language/forced selection and timing. |
| VobSub | Preserve the selected stream and request PMS video burn-in, independently of PGS. | Actual bitmap palette, placement, selected language and timing. |

Format-labelled `playback.test.js` sessions exercise negotiation and owned
teardown for each row. Force Direct Play refuses required burn-in before
stream selection, conversion allocation or AVPlay calls. These are request
contracts, not proof that PMS rendered a particular subtitle correctly.

There are real local-renderer candidates, not a finding of impossibility.
[libass](https://github.com/libass/libass/blob/master/COPYING) itself is ISC
licensed; that does not settle every wrapper, dependency or bundled font's
licence. Current [JASSUB](https://github.com/ThaUnknown/jassub#requirements)
requires WebAssembly, OffscreenCanvas, workers, Proxy and modern playback
timing APIs; its documented modern-browser floor is not the shipped M47
baseline in Samsung's [engine table](https://developer.samsung.com/smarttv/develop/specifications/web-engine-specifications.html).
[SubtitlesOctopus](https://github.com/libass/JavascriptSubtitlesOctopus)
documents an asm.js worker fallback, manual canvas timing and cache limits,
so WebAssembly absence alone cannot rule out all local ASS rendering.
Its default bitmap/glyph-cache limits are unlimited; worker scheduling, total
memory, rendering cost and disposal still need exact old/new-TV measurements.
Neither project alone supplies PGS/VobSub decoding or proves AVPlay video-plane
composition. No renderer, font download service or additional dependency is
enabled by this investigation.

The 0.2.0 choice is the existing explicit PMS-rendered fallback, not an
unmeasured local renderer. Named-TV format correctness and CPU/memory/frame
comparisons have not been run on the latest candidate. Earlier SDK transport
failures were superseded by three normal Ethernet updates; current access
needs fresh verification, not a blanket blocked-access assumption. Unicode numeric entities
in the supported text path now retain valid supplementary-plane characters
using ES5 surrogate pairs; malformed surrogate entities remain literal.

## Audio-control feasibility

The [AVPlay reference](https://developer.samsung.com/smarttv/develop/api-references/samsung-product-api-references/avplay-api.html)
marks its sound-analysis listener and 32-band callback deprecated since 2.4.
That callback supplies analysis data; it is not a documented PCM write,
dialog-isolation, gain-processing or normalization hook. The subtitle guide
explicitly defines positive/negative `setSubtitlePosition` as subtitle timing
in milliseconds. It cannot justify an audio-delay control.

Vemm therefore exposes only the documented PMS percent-loudness request for
converted audio, with its unchanged default and original-file exclusion.
This is not isolated dialog boost, measured normalization or AV sync.
No supported local output-control contract for those three functions has
been established; that is not a claim that all devices or external sound
systems lack such controls. Audible converted-volume behavior, entitlement
and exact-model output/timing acceptance remain open. No private audio API,
additional privilege or persistent TV audio-setting change is introduced.

## Live tuner ownership gate

The bundled [PMS OpenAPI](../plex-openapi.json) documents
`POST /livetv/dvrs/{dvrId}/channels/{channel}/tune`, read-only session
enumeration/metadata, and consumer-specific HLS index/segment reads.
It does not establish consumer allocation, keepalive or release semantics.
A session ID or playable-looking HLS path does not prove that a client can
own, cancel or release the tuner safely. Guide/DVR UI and subscription
requests therefore remain separate from live tuner acceptance.

No explicitly disposable, entitled account/server/tuner context has been
established. Do not experimentally allocate household tuners, infer a release
request from an endpoint name, or turn a synthetic HTTP success into a real
ownership contract. Live output, conflicts, interruption/cancellation,
release read-back and DVR mutations remain blocked on that context and the
missing ownership contract; the retained guide is not presented as live tuning.

## Community distribution pilot

The current [TizenBrew installation guide](https://github.com/reisxd/TizenBrew/blob/main/docs/README.md)
distinguishes its installer from the installed TizenBrew container. Its
[module guide](https://github.com/reisxd/TizenBrew/blob/main/docs/MODULES.md)
defines application modules as served pages, with separate key/service
configuration. Neither is proof that a standalone WGT can become a module
without adapting public APIs, storage, privileges and lifecycle.

The least-change pilot candidate is the documented desktop standalone-WGT importer,
not moving real Plex credentials into a shared container. However, the guide
describes Samsung account/certificate setup for newer TVs. Inspection of the
installer at
[`579e2d2a`](https://github.com/reisxd/TizenBrewInstaller/tree/579e2d2a7826709a5f9bea93bdeacbcea21a607b)
establishes a more specific gate: its
[`resignOrInstall`](https://github.com/reisxd/TizenBrewInstaller/blob/579e2d2a7826709a5f9bea93bdeacbcea21a607b/client/services/tizenbrew-installer-service/index.js#L197-L219)
path requires configured author/distributor certificates for Tizen 7+ and
resigns imported files. The
[`resignPackage`](https://github.com/reisxd/TizenBrewInstaller/blob/579e2d2a7826709a5f9bea93bdeacbcea21a607b/client/services/tizenbrew-installer-service/utils/SamsungCertificateCreation.js#L23-L51)
helper removes existing signature XML before signing with those configured
certificates. Importing an already signed Vemm WGT is therefore not proof of
retaining its approved author on the known Tizen 9 targets. Existing Vemm
certificates are not exported into this third-party configuration.
No account sign-in, new certificate, module publication,
container install or TV Host PC setting change is authorized by reading it.
Its instructions to reboot or change Developer Mode are not executed here.

The isolated Vemm QA widget and generated media can supply a synthetic
workload, but its SDK installation is **not** the community-adapter pilot.
Exact installer/source and author behavior must be pinned/verified, followed
by model-specific API, storage-isolation, lifecycle, update and rollback
checks. The current five-TV developer-transport outage also blocks the ordinary
native lane. Neither a community pilot nor alternate-channel support or an
install shortcut is advertised.
These two community guides were read on 2026-10-25.

## Future platforms

Future clients may supply native capability providers and playback backends,
but Vemm does not define a false lowest-common-denominator interface in this
transition. A future platform must first demonstrate its real policy inputs,
error states and lifecycle needs. Samsung AVPlay behavior remains represented
directly by the current backend.

## Validation boundary

Host capability tests cover exact identity matching, published-profile
construction and conservative playback choices. Device acceptance still needs
exact model/region/firmware, source SHA, media tuple, expected/actual result and
redacted evidence. No device was contacted for this transition.
