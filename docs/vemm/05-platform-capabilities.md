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
