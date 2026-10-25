# Vemm 0.2.0 requirements

Status: implementation authorized; not delivered.
Baseline: `2b50628cd9a346dbe1d374e103124665b749b260`.
Owner: the Vemm product-backlog session.

**Conditional shipping authorization:** the subsequent owner direction,
"release automatically onece you finish and run an adversarial review against
the specs. do this automatically", supersedes the indefinite hold only after
all reconciled, currently in-scope specifications are complete and an independent full-spec review
accepts the exact frozen candidate. Until then no production signing/rollout,
distribution, push/publication, PR edits, merge, tag or release. The later
native-acceptance direction permits bounded account-free synthetic QA within
existing exact-target/author grants; it is not production release acceptance
or permission to guess the Livingroom identity. External blockers and unmet
criteria are not waived. Preserve retained artifacts; at this source freeze no
device command, owned connection or Samsung lease is active.

Evidence currency: the retained signed `c1b7b015` production 0.2.0 was accepted
as a normal update on MU6172, Q80C and QN70F, with raw installed-version
read-back. Both RU7092 units were unreachable and not updated. Earlier
transport-blocked evidence below describes its collection time, not a current
blanket SDK failure. Installation is not loaded-runtime or feature acceptance.
The original 34 grouped rows are retained, including explicitly deferred scope,
but are not an exhaustive
interaction-level reconciliation of the owner's feedback.

The owner approved the entire previously researched product backlog, recovery
of earlier functional feedback, an adversarial review, Plex Web interoperability
investigation, implementation, and deployment to every available known TV.
Branding, source presence, host tests, package creation and installation are
different outcomes; none substitutes for functional acceptance.

The existing [client specification](docs/samsung-tizen-client-spec.md),
[product contract](samsung/PRODUCT.md) and [design contract](samsung/DESIGN.md)
remain binding. This file is the implementation and acceptance ledger, not a
replacement that reduces their scope.

## Current release scope

The owner's later direction, "i do no tuse playlists, though, and music and
photos, so i woul not enabled/prioritize this just yet", defers those workflows
from this release's implementation priority and acceptance scope. This is a
scope change, not a completion claim. Retain existing code, behavior and
regressions; do not add or enable new optional playlist, music or photo surfaces.
The already-frozen compound-sort review may finish to close its known
correctness finding, including the shared movie/TV browse selector.

| Area | Current release disposition |
| --- | --- |
| Saved video playlists, standard edits/lifecycle and smart rules (`QU-01` playlist portion, `QU-EDIT-01`, `QU-LIFE-01`, `QU-SMART-01`) | Deferred, not accepted. No further expansion or new optional surfaces. Existing behavior is retained. |
| Music (`MU-01`) and photos (`PH-01`) | Deferred, not accepted. Existing behavior and regression protection are retained. |
| Personal/shared movie/TV library browsing/search, video playback and automatic episode/queue transitions, seeking/remote controls, subtitles and video audio-track selection | Active priority. Core search is library-first; no automatic Discover or Plex-distributed Movies & Shows promotion/playback. Deferring optional workflows does not defer video queue ownership, Up Next, pause intent, video audio selection or cleanup. |
| Online catalogue search (`SEARCH-ONLINE-01`) and licensed Plex Movies & Shows playback (`SV-01`) | Deferred by the latest owner direction. Retain existing implementation/regressions without automatic queries or promoted search entry points; no licensed Plex playback. Public metadata lookup is at most optional future scope, not a current release blocker or licensed-stream permission. |
| Shared identity, focus, cancellation, privacy, packaging and applicable native/service acceptance | Still required for the revised release. Do not disable regression coverage because another workflow is deferred. |

Other requirements retain their recorded disposition; this direction is not
permission to infer further deferrals or waive blockers. The conditional
automatic release and independent adversarial gate evaluate this revised scope,
not deferred-feature completion. Native evidence, exact device identity and
account/certificate/privacy constraints remain mandatory.

The latest search direction supersedes the earlier online priority:
"do not search and run plex own distributions please. focus on a godd own
search. from library for now and at most public search like plex does.
no plex movies". Focus Vemm's own search on personal/shared libraries. Do not
download/run Plex client distributions or automatically query/promote Plex's
distributed Movies & Shows. Retain legitimate Plex authentication/library
grants. At most explicitly separate public metadata lookup is allowed, but
optional, not a current release blocker. Query edit/clear cancellation,
correct source-server results, movie/show/episode navigation, empty/error/Retry
and query/results/focus preservation on Back remain required.

## Requirements

`pending` means not accepted, including features whose source already exists.
An `accepted` row needs evidence identifying the tested source and actual
behavior. A real external dependency is `blocked`, never silently omitted or
called implemented. Feasibility rows retain their original research scope;
negative findings require evidence, not speculation.
`deferred` means explicitly outside the current release acceptance scope, not
completed, removed or accepted. The release-scope table separates the saved
playlist portion of `QU-01` from its still-active core video queue criteria.

| ID | Requirement | Testable acceptance | Owner | Status | Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-ID-01 | Preserve the independent Vemm identity. | Current app, package, assets, settings, support and distribution use the approved identity; GPL/protocol/provenance remain intact; updates preserve Vemm state and author continuity. | Vemm | in_progress | Host inventory/identity/locale/package and independently inspected 463c5290 artifacts preserve VemmTvApp0.Vemm, namespaces/assets/protocol headers, GPL/notices and complete-source bytes. No historical Plx credentials/settings imported. Normal signed c1b7 updates were accepted on MU6172/Q80C/QN70F after Ethernet restoration. Historical author fingerprints and settings/sign-in continuity were not measured; unsigned artifacts do not prove them. Any new authorized update needs fresh original-DUID match and the existing approved author/profile, not a replacement identity. Current access is unattempted, not assumed blocked or restored. |
| REQ-FB-01 | Provide working Samsung feedback/support. | Logged-out support destination works; Samsung-specific report fields, privacy guidance and response ownership are correct. | Vemm | accepted | Independent 2026-10-25 anonymous GETs confirmed canonical public repository Issues enabled, the logged-out issue destination reachable and the public Samsung-specific form present. Current bug_report.yml includes model, actual Tizen/firmware, version/source, installation, reproduction/media tuple, redacted evidence and required privacy acknowledgement. README explicitly assigns reports to Vemm maintainers here, not Plex/Samsung/upstream support, and repeats the no-credentials/private-addresses/DUIDs/raw-inspector/signing-files boundary. No issue submission, response-time promise or native acceptance is implied. |
| REQ-UX-01 | Complete Account/Settings remote access. | Regression reproduces the reported trap; D-pad journeys from Home and libraries reach Account/Settings and return without DOM-click shortcuts. | Vemm | in_progress | Actual-main.js keyboard-only account-navigation-ui enters Account/Settings from Home hero/shelves and movie/show libraries, including empty/denied/pending pages. Back restores Account/library; held Enter and late pages cannot trigger a successor action or steal focus. The reported physical trap is not reproduced by these host journeys. Latest-candidate retail reproduction/remote acceptance is unattempted. Earlier transport failure was superseded by three Ethernet updates; fresh access/identity still needs observation, not a blanket blocked-transport excuse. |
| REQ-QA-01 | Establish current-artifact acceptance. | Bind source/package/model/firmware/runtime; exercise linking, focus, playback, seek, tracks, subtitles, resume, standby and update; record actual pass/fail/skip using synthetic or disposable records. | Vemm | in_progress | Isolated checksum-bound QA retains product code except its guarded synthetic startup suffix, exact QA identity/origin, privileges and notices. Observed generated-boot/production-parser/actual-Python-HTTP failures repaired queue revision fields and POST timeline/owned DELETE handling; Play, Intro, Stop, idempotent cleanup and unknown-owner refusal pass with mocked AVPlay. Latest-source native focus/playback/seek/output/standby/performance is unattempted. Three earlier Ethernet production updates supersede the old blanket transport blocker but not current runtime evidence. Real PMS/profile/entitlement acceptance separately lacks a disposable backend; synthetic native media need not write household progress. |
| REQ-IN-01 | Complete fresh install/update journeys. | Supported Windows/macOS/Linux paths have observed stage-specific recovery; same-author updates preserve settings/sign-in without uninstalling Vemm; documentation matches the actual toolkit. | Vemm | in_progress | Guides distinguish source/unsigned builds, existing-author updates and separate toolkit; canonical builder tests pre-distribution refusal/profile restoration without certificate access. Three c1b7 normal updates were accepted after Ethernet restoration, without Vemm uninstall; settings/sign-in continuity was not measured. Windows/Linux host recovery and historical author/state continuity remain unverified, not generic transport failure. Current access needs fresh identity verification under the authorized lane/profile; no certificate replacement or uninstall workaround. |
| REQ-PF-01 | Measure and guard performance. | Cold/warm Home, focus, artwork, large-library and long-session fixtures have raw per-model distributions and evidence-based budgets; no unmeasured official-Plex speed claim. | Vemm | in_progress | Bounded shelves/cards/pages/history, responses/cues and image/decode ownership are host-covered; source-bound synthetic QA assets/observer are prepared. Latest-candidate raw per-model cold/warm/focus/artwork/large-library/long-session distributions and decoder/heap ceilings remain unmeasured. Earlier transport failures were superseded by Ethernet updates; current access is unattempted/unknown, not assumed blocked. Next native measurements require fresh identity and the authorized synthetic workload/inspector, not household Plex writes. Host timings are not TV budgets; no official-Plex speed claim. |
| REQ-UX-02 | Complete Home shelves and personalization. | See-all/paging retains row/item/focus/Back state beyond the first 12 entries; provide evidence-backed optional row/order/hero controls without mandatory customization. | Vemm | in_progress | Existing See all /hubs/items paging remains unchanged: 50-item pages, 200-card retention bound, 75-title regression and remote Back to the same shelf action. Observed failing actual-main.js regressions for missing Customize Home, first-shelf Up with a hidden hero, and failed-save Retry losing its draft; all now pass. Optional Account > Customize Home uses existing value/selection rows for shelf visibility, order and featured-title visibility; defaults stay unchanged. home-layout and home-personalization-ui cover bounded validated server/profile-scoped persistence, isolation, missing/new/duplicate identifiers, all-hidden recovery, Save/Back/return focus, storage failure/retry/reset and preserved interface/audio preferences. Named-TV layout, D-pad/held-key, restart/profile-PIN and standby acceptance remain open; host/source evidence is not native acceptance. |
| REQ-PB-01 | Complete playback recovery/lifecycle. | Network/PMS interruption supports retry/cancel, preserves intended pause/resume and selected tracks, avoids unintended autoplay, and passes stop/read-back, long-session and standby cases. | Vemm | in_progress | Independent review reproduced final-credits autoplay while paused and automatic transitions discarding pause. Observed red-to-green player-layout/video-queue-ui regressions now freeze remaining credits ticks while not foreground-playing, resume the exact remainder, and pause during a delayed real-API successor metadata response before transactional commit. Video and no-queue successors retain pause; existing repeat-one completion, retry/cancel and >200-entry queue journeys remain intact. Real-service interruption/read-back, long-session, standby and named-TV acceptance remain open. |
| REQ-PB-02 | Explain playback and export safe diagnostics. | Plain-language reason/next action, actual versus requested output, and previewable redacted support record work without token, DUID, server or title leakage. | Vemm | in_progress | Source implementation: Settings Diagnostics and playback More expose a remote-owned allowlisted support preview with explicit local copy success/unavailable/denied feedback. Requested ceiling, source and PMS output stay separate; physical/native output remains not measured. Host privacy/remote regressions are not named-model clipboard, native-output or deployment acceptance; those remain pending. |
| REQ-ST-01 | Finish audio/subtitle ranking and persistence. | Multi-language, forced/default/SDH and duplicate cases have deterministic ranking and clear per-item/profile persistence; verify actual selected output. | Vemm | in_progress | Observed failing actual-main.js regressions: spa/es and bel/be did not match, and numeric-string stream types disappeared while duplicate/forced/SDH variants had ambiguous labels/unranked selection. Menus reuse ISO normalization, rank actual selection then explicit PMS defaults then stable server order, label strict true Forced/SDH/CC/AD/default flags, and number otherwise duplicate labels. Host journeys preserve Other languages, exact IDs and pause on explicit selection, with no restart/write while browsing. Playback still follows PMS Stream.selected; account preferences and per-Part selection remain distinct with no local override store. Profile/item/version persistence and audible/visible native output require the unavailable disposable backend and named TVs; menu ranking alone is not their acceptance. |
| REQ-ST-02 | Finish subtitle reliability. | Unicode/multiline timing survives seek, pause and version changes; native/overlay/burned paths and download failure/recovery have per-format visible acceptance. | Vemm | in_progress | Observed failing regressions: supplementary-plane numeric entities were truncated into unrelated BMP characters, and an older still-active cue disappeared after 12 later cues expired. ES5 surrogate-pair decoding preserves valid astral text; malformed surrogate entities remain literal. A nonserialized prefix-end index, bounded by the existing 20,000-cue limit, replaces the lossy fixed look-back; plain cue arrays remain correct without it. Subtitle tests cover entities, multiline overlap/order/end boundaries, seeking back and unchanged serialized shape; playback/player-layout contracts remain green. Native glyph/timing, pause/version and burned-format acceptance remain open. |
| REQ-AC-01 | Complete safe profile/server switching. | Explicit profile changes preserve PIN boundaries and correct library/watch state; denied/unavailable servers recover; restart and saved-sign-in behavior match settings. | Vemm | in_progress | Observed failing actual-main.js regression: library to server/profile selection followed by remote Back at a protected PIN restored the old Home closure and dereferenced its retired client. Profile/server boundaries now retire browse grants, metadata/cache/filter/navigation owners; PIN Back returns to profile selection. The new synthetic profile-boundary-ui journey verifies invalid PIN makes no switch, late old-library data cannot return, managed server discovery uses the managed token, and post-switch Back cannot read/restore owner titles. Existing session/profile tests cover saved sign-in, opt-out/restart, expired/denied grants, PIN failure and cancelled switches; 24-route Back tests preserve same-screen Settings focus/scroll. Actual profile service persistence/PIN and named-TV restart/watch-state acceptance remain externally blocked; no household profile used. |
| REQ-UX-03 | Finish large-library browse/search return. | Detail/player return retains item identity, filter and cursor; bounded large synthetic libraries meet measured memory ceilings; stale requests cannot replace the current view. | Vemm | in_progress | Observed Movies/Shows/Back cross-library data failure repaired by capturing each accepted page/cursor/filter/watch revision in its own return closure. Existing 200-card/20-history bounds and watched-page reload/focus remain. Account-navigation, watched-readback, 24-route resilience, Home paging and search-completeness-ui cover late-page ownership and movie/show/episode detail/Back. Current native player return, decoded-image/heap and large-library performance remain unmeasured/unattempted. Earlier transport failures do not describe current access after three Ethernet updates; fresh live identity is required, not presumed unavailable. Desktop timings are not TV budgets. |
| REQ-AU-01 | Complete remote accessibility/legibility. | Focus, Back and held/repeated keys work throughout; text/captions fit; reduced motion and text-size feasibility are resolved; Samsung TTS/Caption obligations are assessed for intended Store targets. | Vemm | in_progress | Manual legacy-compatible reduced motion and larger interface text implemented; document language follows locale. Remote UI regression covers persistence/restart/reset and storage refusal. Samsung primary TTS/caption/Store obligations mapped in platform-capabilities; actual Voice Guide, locale clipping and intended-country certification remain unaccepted. |
| REQ-PB-03 | Add adaptive quality and local/remote policy. | A bounded negotiation/rebuffer policy adapts while preserving explicit quality choice; Original labels remain truthful; disposable local/remote interruption cases pass. | Vemm | in_progress | Independent opt-in controller, documented ABR/location requests, remote initial ceiling and bounded rebuffer downgrades implemented. Controller and real-UI/fake-adapter tests cover grace/cooldown, fixed/Force choices, tracks/playhead, stale owners and no paused autoplay. Native/disposable-backend acceptance outstanding. |
| REQ-QU-01 | Complete video playlists/queues. | PMS identity, order, paging, repeat/shuffle, next-item and cleanup are verified; editing/paged playlist workflow is usable without duplicating the existing video queue. | video-lane | in_progress | Observed failing regressions: video projection discarded PMS version/count/offset, no remote playlist destination, wrong playlist-details route, mismatched/incomplete successor metadata committed or stopped playback, and completion raced an unfinished credits preview. Existing video creation now feeds the shared bounded server controller; transitions reuse its exact string entry identity, validate full metadata/markers/chapters before stop, preserve manual pause and inherited Up Next countdown, and support previous/next, server shuffle and repeat off/one/all. Existing video playlists have bounded pages and explicitly confirmed move-to-beginning editing with preflight/read-back, stale-order errors and reload instead of mutation replay. video-queue traverses 321 entries; video-queue-ui uses real main.js remote events past 200 duplicate-key entries, failures/retry, cancellation, credits, stale versions, cleanup and background/no-autoplay. Music regressions remain intact. Authorized disposable-PMS ordering/edit/read-back and named-TV AVPlay/remote/lifecycle/memory acceptance remain open; no backend/device operation performed. |
| REQ-MU-01 | Complete server-backed music queues. | PMS music PlayQueues, long queues, interruption/retry and native audio work with bounded resources; do not claim Plexamp parity. | music-lane | deferred | Explicit owner deferral from current release acceptance, not completed. Existing server queues, exact string IDs/revisions, bounded paging, repeat/shuffle, metadata validation, pause intent, creation/retirement interlocks and no-replay cleanup remain intact. Retain music-queue/music-queue-ui regressions covering 321 entries, >200 remote transitions, failures and cancellation. Real PMS/native audio/memory remain unaccepted; no household substitute or new optional surface. |
| REQ-PH-01 | Complete photos. | Supported formats, rotation, navigation, slideshows, large albums, memory bounds and teardown are accepted on named TVs. | photo-lane | deferred | Explicit owner deferral from current release acceptance, not completed. Existing bounded paging/rotation/slideshow, JPEG/PNG header/raster/encoded limits, EXIF/JPEG request policy, Blob release and cancellation remain intact. Retain photos/photo-api/photos-ui/media-ui coverage of 1001-entry albums, 251 transitions, stale pages, standby and Back. Actual PMS conversion, named-TV output/standby and measured memory remain unaccepted; no new optional surface. |
| REQ-WL-01 | Complete Watchlist. | Authorized disposable-profile read/add/remove/read-back, remote paging and local/shared grant matching pass; metadata access is not licensed-stream playback evidence. | Vemm | in_progress | Observed failing regression: successful PUT with unchanged membership resolved as accepted. Both catalogue/local-detail actions now share account-client identity-bound GUID read-back: one mutation, then 50-row all-Watchlist pages; add requires the exact GUID and remove requires complete observed absence. Verification stops at 200 rows with explicit uncertainty, not fabricated absence or mutation replay; browse paging is unchanged. watchlist-readback covers unchanged add/remove, second-page identity, malformed/denied/incomplete/over-limit reads and late cancelled writes; real media UI covers repeated OK and unchanged-success feedback. Existing account-token/GUID and local/shared grant contracts remain. Actual cloud profile persistence, concurrent-service behavior and named-TV remote acceptance require the unavailable disposable service/developer lane; licensed streaming is separate. |
| REQ-TV-01 | Complete personal Live TV/DVR. | Entitled tuner allocation, keepalive/release, cancellation, live output, conflicts and DVR operations pass against a disposable backend without leaking tuner ownership. | Vemm | blocked | Bundled OpenAPI checked: tune POST, session metadata and consumer-specific HLS reads exist, but a consumer allocation/keepalive/release contract is not established. No explicitly disposable entitled account/server/tuner context exists in the known program evidence. Guide/subscription source is retained; no household tuner allocated and no invented release request or synthetic success promoted to real live/DVR acceptance. platform-capabilities records the exact ownership/backend gate. |
| REQ-SO-01 | Resolve synchronized co-viewing feasibility. | Establish demand, protocol/entitlement and session-ownership evidence; determine supported synchronization/reconnect/seek/pause behavior or record a specific externally gated outcome. | Vemm | blocked | Actual public Web rooms request and official partial-withdrawal note retained; not universally dead. No supported third-party room/auth/session-ownership or sync/reconnect contract, nor disposable service account, is established. platform-capabilities records this service-contract barrier; no fake synchronization or household session used. |
| REQ-NT-01 | Define and implement supported local-first recovery. | Scoped authentication/grant policy and bounded cached metadata work during supported outages; no PIN/entitlement bypass and no conflation with media downloads. | Vemm | in_progress | RAM-only Home snapshot capped by shelf/card/serialized-size limits and five-minute TTL; explicit cached status and Retry. home-cache-ui reproduces and repairs profile-selection retention and covers authorization refusal, changed profile, expiry and no persistent storage; session-ui retains account/server recovery. Native outage/PIN journeys remain open. |
| REQ-ST-03 | Resolve styled/image subtitle feasibility. | Source/legal/device evidence and measured older/newer-TV CPU/memory/frame impact support the chosen ASS/image-subtitle renderer or truthful supported fallback. | Vemm | in_progress | Samsung subtitle/engine, libass ISC, JASSUB requirements and SubtitlesOctopus asm.js/cache/manual-canvas references assessed in platform-capabilities. WebAssembly absence does not rule out all local rendering; current modern JASSUB is not the M47 baseline and no unmeasured renderer/font service is enabled. Chosen source policy preserves ASS, SSA, PGS and VobSub selections for PMS burn-in; per-format playback sessions verify requested burn, no copied-video route, owned cleanup and Force refusal before side effects. Actual per-format output, old/new-TV CPU/memory/frame comparison and backend font/render correctness remain open, not a claimed fallback acceptance. |
| REQ-AD-01 | Resolve audio-sync/dialog/normalization controls. | Establish actual API, entitlement and output feasibility; implement supported controls or record concrete external blockers; do not confuse this with codec passthrough. | Vemm | in_progress | Documented PMS audioBoost percent-loudness control implemented with unchanged default, bounded choices and original-file exclusion; playback/preference/interop fixtures cover persistence and conversion fallback. No verified local audio-delay/dialog-isolation/normalization hook; spectrum analysis is not DSP. Server/audible native acceptance and full feasibility assessment remain open. |
| REQ-DS-01 | Complete the community-distribution adapter pilot. | An isolated synthetic pilot verifies AVPlay, privileges, auth storage, lifecycle, update/rollback and exact models; no production-app replacement or licence stripping. | Vemm | blocked | TizenBrew installer/module guides and installer source 579e2d2a assessed in platform-capabilities. Its Tizen 7+ WGT import strips signatures and resigns with configured certificates; importing a signed WGT does not prove approved-author continuity. No Vemm certificate exported or replacement identity created. The separate prepared synthetic QA workload is not that adapter pilot. Existing-author adapter/signing and model storage/API/lifecycle/update/rollback remain unfulfilled. Earlier ordinary-SDK transport failure was superseded by three Ethernet updates; current access is unattempted, not this adapter's blocker. No alternate-channel support claimed. |
| REQ-DS-02 | Resolve Samsung Store feasibility. | Establish seller/country/model eligibility, GPL/service/branding/privacy/accessibility obligations, reviewer-backend and update-identity requirements; do not claim submission or approval without evidence. | Vemm | blocked | Primary Seller Office Web-WGT/pretest and non-US partnership requirements plus TTS/caption obligations documented. Seller/countries/model groups, reviewer backend, GPL/Store terms and Plex/brand rights require an actual owner/seller/legal decision; no blanket GPL acceptance, submission or approval claimed. Existing-author TV updates remain separately authorized. |
| REQ-SV-01 | Resolve licensed Plex catalogue playback. | Verify actual authorization/DRM/advertising/rights and service availability before implementing supported playback; do not substitute personal-PMS output or bypass entitlements. | Vemm | deferred | Latest owner direction excludes Plex-distributed Movies & Shows from current release scope, not personal/shared PMS movies. No licensed catalogue playback is enabled. Retained feasibility evidence: draft AVOD guide requires issued partner rights/authorization, server-side signing/ingest, DRM and ads; none granted to Vemm and PMS tokens cannot replace them. No secret, licence bypass or new distribution claim. This deferred feature does not block current library-first search acceptance. |
| REQ-GR-01 | Retire or justify experimental artwork mode. | Keep existing acceleration; remove/relabel the default-off slower experiment or prove exact-workload gains before promotion; no language/GPU speed claims by association. | Vemm | accepted | Exact-source independent review at e0c7d7da supports this narrow relabelling criterion. Experimental artwork explicitly states no demonstrated performance benefit; default-off behavior, existing compositor/AVPlay and fallback remain unchanged. graphics-ui covers the actual copy, default and persistence. No performance/promotion or native-output acceptance is inferred. |
| REQ-MARK-01 | Make Skip Intro and Skip Credits work visibly. | Trace real metadata to focused remote prompt and seek/next action; regress no-marker/boundary/repeated-key/seek/resume/queue cases; prove behavior with synthetic media on named TVs, not only pure helper tests. | Vemm | in_progress | Observed failing DOM regression: Intro disappeared after the transport's five-second timeout. Fixed prompt lifetime; player-layout-ui, skip-markers and product-ui pass. Named-TV synthetic acceptance remains open. |
| REQ-WATCH-01 | Make watched/unwatched actions discoverable and correct. | Movie/show/season/episode actions are D-pad reachable with explicit scope/confirmation; disposable-account write/read-back updates the correct item and relevant views; cancel/failure never looks successful. | Vemm | in_progress | Observed failing regressions: HTTP success plus unchanged read-back claimed success, and a confirmed mutation left the retained library badge/resume stale on Back. Confirmation validates identity/type and leaf/aggregate state. Accepted mutations invalidate retained watch snapshots and Home outage cache; library/listing Back reloads the original bounded page/filter and restores the selected card by identity. Remote watch-readback-ui covers movie/episode/show/season, repeated OK, mark/unmark badges, cleared resume and retained cursor/focus. Real-account acceptance is explicitly blocked: owner confirms no disposable backend path exists and prohibits household profiles; named-TV acceptance also remains open. |
| REQ-WEB-01 | Investigate Plex Web interoperability and implement findings. | Identify the exact observed Plex Web version/source and lawful observation method; compare relevant metadata, markers, watched state, queues, tracks, quality, lifecycle and recovery; turn findings into independently implemented protocol fixtures/regressions and Vemm behavior. No proprietary-code copying, DRM/auth bypass or household-account writes. Missing access/evidence remains explicit. | Vemm | in_progress | docs/pms-api.md records actual public Web 4.163.0 asset integrity and isolated synthetic startup observations, separating static/request/fixture evidence. Independent marker/queue/ABR protocol fixtures and watched read-back/adaptive implementations trace findings to behavior. Authenticated disposable playback/track/lifecycle comparison remains open; no proprietary implementation or household state used. |
| REQ-REVIEW-01 | Adversarially review baseline and final delivery. | Independent review maps the entire currently approved release scope and explicit deferrals to code, behavior and evidence; material findings are corrected or genuinely blocked; final review evaluates the exact new candidate against the detailed specifications, not the old baseline or grouped headings alone. | Vemm | in_progress | Independent immutable scoped reviews and actual host/artifact checks are historical slice evidence, not final delivery. Compound-sort Major closed at eb5b6823; online no-PMS continuation finding closed at 10b16abc, with online scope subsequently deferred. Player controls, playlist lifecycle/items and DVR had their own scoped source PASSs, not combined whole-core acceptance. Next review must evaluate the complete new library-first core candidate, original detailed AUTH/BROWSE/PLAY/UI criteria, source receipts and genuine native/service gaps, preserving all original rows and explicit owner deferrals. |
| REQ-REL-01 | Prepare a reproducible Vemm 0.2.0 candidate. | Version/app metadata agree; committed clean source passes focused regressions, full Samsung host checks, ES5/M47 checks, unsigned SDK build and source/package inventory; preserve identity, notices and complete-source availability. No publication is implied. | Vemm | accepted | Independent actual-artifact verification at e0c7d7da confirms the narrow unsigned-candidate criterion: version agreement, clean full host/ES5/M47 and unsigned SDK build logs, both unsigned production/QA WGT hashes, unique exact payload bytes including all notices/licences, all 257 tracked-source ZIP files and log hashes bound by host-receipt.json. Both WGTs correctly contain zero signatures. Canonical builder rejects stripped/modified/extra/duplicate/symlink payloads before distribution; seven distribution regressions also independently pass. Earlier 4964b0fc/a238 toolkit-restaged WGTs remain retired for omitted legal payload. Every revised frozen source needs refreshed receipts; this preparation acceptance does not grant signature trust, resolve the REVISE review, or satisfy REQ-QA/DEPLOY. |
| REQ-DEPLOY-01 | Deploy and verify 0.2.0 on every available known TV. | Fresh scan and live identity match select all available saved TVs; existing-author signed updates succeed without Vemm uninstall; read back exact installed 0.2.0 on each; execute appropriate native feature acceptance and preserve receipts privately. Do not call the overall program complete while other requirements remain unmet. | Vemm | in_progress | Restored Ethernet allowed serial live-original-DUID-matched normal updates from 0.0.1 to exact retained signed c1b7b015 production 0.2.0 on MU6172, Q80C and QN70F. SDK success and bounded raw app-list version 0.2.0 were observed on each. Both distinct RU7092 units timed out on directed Ethernet discovery and were not updated. Device update acceptance is observed; historical author fingerprints, settings/sign-in preservation, loaded-runtime identity and native feature/service/performance acceptance are not inferred. Private exact package hashes and per-target receipts retained. Later source changes require new packages; no blind app restart while the owner is watching. |
| REQ-UI-TRANSPORT-01 | Remove redundant on-screen interval controls without removing remote seeking. | Actual-player HUD has Pause / Play, Subtitles, Audio and More, plus applicable marker actions; initial and expired-opener fallback focus is Pause / Play. Remote row navigation does not seek; slider/hidden-HUD held seeking and dedicated media keys retain bounds, commit and pause intent. Verify the repaired payload on the identified TV. | Vemm | in_progress | Observed failing player-layout-ui regression showed Back 10 seconds and Forward 10 seconds in the actual HUD. Source removes those controls and repairs their initial/fallback focus references. Updated player-layout-ui and product-ui pass four-control, expired Intro opener, D-pad/held scrub, media Rewind/Fast Forward and pause-preservation journeys. This source is not the previously deployed c1b7 payload; native seeking is still unverified. |
| REQ-INT-01 | Reconcile concrete interactions, not only grouped backlog headings. | Trace original recoverable feedback and binding PRODUCT/DESIGN/client criteria to implementation, observable tests and explicit missing/partial/unverified/external boundaries; implement confirmed source omissions. Do not call a missing UI device-blocked or declare the original grouped ledger exhaustive. | Vemm | in_progress | The interaction table and core-readiness reconciliation below trace AUTH/BROWSE/PLAY/UI and original detailed feedback to source contracts versus native/service gates. Explicit interval-button removal is repaired; the owner's unidentified actual-video-seeking failure is unresolved until native observation, not refuted by scrub tests. Saved playlists/music/photos and online catalogue search are now explicitly deferred, not accepted. Historical research and scoped PASSs do not establish exhaustive whole-core acceptance; next frozen adversarial review must seek omissions across the revised scope. |
| REQ-RUNTIME-01 | Resolve the reported unchanged livingroom experience. | Resolve exact saved target without guessing; use supported non-disruptive running/source evidence where available, distinguish installation from active runtime, and compare immediately visible entries against the retained original 0.0.1 payload. | Vemm | blocked | Both updated MU6172 and Q80C have saved Livingroom TV names, differing only by vendor prefix/case. The owner is unavailable to disambiguate; no target is guessed, launched, debug-restarted or terminated. Actual retained 0.0.1 main.js lacks Customize Home, Video playlists, Adaptive quality, Converted audio volume, Reduced motion and Support record; c1b7 source includes them. These are menu/behavior changes, not a default visual redesign. No evidence establishes stale running code or that the owner has seen those entries. |
| REQ-QU-EDIT-01 | Add and remove exact entries in standard saved video playlists. | Movie/episode/clip detail offers a paged standard-playlist picker and explicit item/playlist confirmation; playlist pages offer confirmed entry removal. The API validates current playlist/type and identity, uses the same client's server URI, verifies complete bounded before/after entry identity/order, rejects unchanged or concurrent results and smart playlists, and never replays a write. Cancel, repeated OK and stale views cannot issue later writes or lose focus. | Vemm | deferred | Explicit owner deferral, not completed. Existing API/UI implementation and regressions remain intact. Exact 1cfc9f08 and secondary-client ownership repair at cbf34867 passed clean full gates and independent scoped reviews; exact duplicate identity, bounded snapshots, denied/unchanged/concurrent results, cancellation and focus are covered. Native/service acceptance remains unverified; no further expansion or optional surface. |
| REQ-QU-LIFE-01 | Create, rename and delete saved video playlists. | Create empty or from a selected video with a validated name and same-client URI; rename/delete inspect fresh exact playlist identity/title and require explicit item-specific confirmation. Read back the created playlist and zero/one expected entries, exact renamed title, or a typed same-server 404 after deletion. Denied/unchanged/malformed/uncertain results never replay a write or report success. Pending work remains owned by its actual client and locked against concurrent edits. Cancel and Back preserve focus; deletion does not delete media or leave a dead detail in history. | Vemm | deferred | Explicit owner deferral, not completed. Existing implementation, named confirmations, shared scope/deadline/interlock, exact read-back, retained metadata invalidation and actual-client cancellation remain intact. Exact cbf34867 passed clean full gates and independent lifecycle/item/watched source review. Retain draft/More/Cancel/Back regressions. Real PMS/native acceptance remains unverified; no further expansion or optional surface. |
| REQ-QU-SMART-01 | Inspect and edit smart video-playlist rules independently of manual item edits. | Load the same client's exact playlist content URI and fresh advanced library metadata; offer only server-advertised video fields/operators/sorts and explicit bounded nested all/any conditions, sort and result limit. Preserve existing supported rules; never silently discard unknown rules, accept pasted network/token URIs or infer rules from artwork. Explicit named confirmation must preflight unchanged title/content, use the same freshly verified server identity, PUT the filter URI once and read back equivalent rules before success. Invalid, denied, unchanged, concurrent, cancelled and over-limit cases never replay or fabricate acceptance. Actual-main.js remote Back/Cancel/draft/focus and originating-client ownership must pass. | Vemm | deferred | Explicit owner deferral, not completed. Existing bounded grammar/editor remains intact. The cffc986b compound-sort Major is repaired at eb5b6823: complete advertised key/descKey expressions/ties, expanded bounds and shared library selector. Exact clean full host/source gates and independent frozen API/actual-UI/search/product/ES5/M47 source re-review pass; that Major is closed, not real PMS/native acceptance. Unknown/provider-specific/cross-type rules remain explicitly uneditable. No new smart scope or optional surface. |
| REQ-TV-STORAGE-01 | Choose DVR storage within the selected destination library. | After a compatible library is selected, show freshly advertised Location IDs/paths, validate bounds/identity and explicitly confirm the selected location. Encode targetSectionLocationID exactly; no guessed path, library change or automatic scheduling. If no locations are advertised, offer only an explicitly labelled Plex-default choice. Cancel/Back and stale responses cannot schedule. | Vemm | in_progress | Observed red television API: missing targetSectionLocationID; actual-main.js media-ui: missing physical-location action. Repaired both. television/media-ui verify exact selected library/location and confirmation/Cancel focus; recording-storage-ui verifies explicit default omission, invalid/duplicate/>50 locations and late response after remote Back. Exact clean 937ca455 full host/source gates and independent frozen scoped review passed, including extra malformed/removed-library probes. No account/tuner operation; real service/native acceptance remains open. |
| REQ-TV-PRIORITY-01 | Provide explicit recording-priority management for conflicts. | Scheduled recordings link to priorities; a non-first subscription can be explicitly promoted. Validate complete bounded preflight identity/order and selected title, issue one documented move, then verify exact new order. Denied/unchanged/concurrent/stale/cancelled outcomes remain explicit and never replay. State priority acceptance separately from whether Plex resolves tuner conflicts. | Vemm | in_progress | Observed red API missing prioritize; actual UI missing Recording priorities; partial total-size regression also failed before its repair. recording-priority/media-ui pass complete <=200 identity order, named preflight, denied/unchanged/concurrent/duplicate/partial data, deadline, pending-client lock and cancellation. Exact clean 937ca455 full host/source gates and independent frozen scoped review passed, including ten additional priority probes. UI retains unresolved server conflict status after verified priority change. No invented tuner lifecycle or automatic cancellation; real service/native acceptance remains open. |

| REQ-SEARCH-01 | Complete supported search kinds and retire superseded query ownership. | Server search retains the supplied hub/item order and source-client identity for supported clips and video playlists as well as existing movie/show/music/photo kinds. Playlist details use the playlist endpoint, never a library-ID substitute; no search result implicitly starts playback. Editing/clearing the query cancels outstanding reads, clears stale results and keeps the edited query in Back/Retry state. Empty queries issue no requests, denied servers remain explicit, 50-per-hub/200-global bounds and remote Back/focus behavior remain intact. | Vemm | in_progress | Binding BROWSE-3. Observed and repaired omitted clip/playlist kinds, late cleared-query results, unbounded empty headings, lost Back focus and wrong-server equal-key focus. Exact clean 49baa2ad full host/source gates and independent frozen search/product/ES5/M47 source review pass. This retains existing deferred kinds without new optional surfaces; online search is separately required below. Older-PMS/native acceptance remains unverified. |

| REQ-SEARCH-ONLINE-01 | Search Plex online catalogue as well as libraries from the main Search journey. | Use the existing evidence-grounded Discover search and validated metadata detail APIs with the linked profile's account token, distinct online/library labels and exact GUID availability matching using each library's own grant. No catalogue ID becomes a PMS rating key, title-only match, implicit playback or licensed-stream authorization. Query edit/clear, Retry, errors/empty results, partial server/cloud failures and Back preserve current query, ownership and exact focused result. Bound online results to 30 and retained results to 200; deny malformed identities and stale account/server responses. Retain standalone catalogue search without enabling deferred media workflows. | Vemm | deferred | Latest owner direction supersedes online priority. The retained implementation uses pinned Python-PlexAPI evidence, not Web cloud parity. Exact 5747511e host/build gates and source review plus 10b16abc no-PMS finding closure are recorded, not service/native acceptance. Current release source-disables catalogue search with no production setting or promoted Home/server entry. Observed failing default-query regression now passes: even with a linked account, main Search makes no Discover/metadata requests and retains the 200-library-result bound. Retained deferred contracts are tested only through explicit test-owned activation; public metadata lookup is optional, not a current release blocker. |

## Interaction-level reconciliation

This extends the same ledger. `implemented` means a source behavior with the
named synthetic contract, not product acceptance; `partial` means useful
source exists but a specific part is missing; `missing` means the named
interaction is not offered. `unverified` applies to an observation not made,
and `external-blocked` names an actual service/API/authorization dependency.
An unavailable TV does not turn absent source UX into an implemented feature.
Test references below are under `tests/tizen/`; the full host gate is still
required on each committed candidate.

Binding sources: [PRODUCT](samsung/PRODUCT.md), [DESIGN](samsung/DESIGN.md),
and [client contract](docs/samsung-tizen-client-spec.md) sections 3, 4, 5, 9A
and 10. The original gap-analysis/current-state research is historical intake,
not evidence that a current source interaction works. Exact owner quotations
are in Corrections; do not reconstruct missing quotations from old agent
summaries.

| Concrete criterion / binding source | Parent REQ | Source state and evidence | Remaining acceptance or omission |
| --- | --- | --- | --- |
| AUTH-1: short code/QR, expiry renewal during stalled polls, explicit denial Retry, background cancellation | AC-01, QA-01 | implemented: `auth-refresh-ui.test.js:75-133`; `js/auth.js` and pairing UI | Real service/linking and packaged renewal unverified |
| AUTH-2: protected PIN cannot restore the retired profile; explicit switch, sign-out and expired-grant return | AC-01 | implemented: `profile-boundary-ui`, `session-ui`, `session` | Actual selected profile, saved-sign-in deletion/relaunch and state preservation unverified |
| AUTH-3: owned/shared grants, unavailable-server Retry, TLS/relay distinctions | AC-01, NT-01 | implemented source: `server-selection`, `account`, `session-ui`; no invented TLS bypass | Packaged TLS/relay and real shared-server selection unverified |
| AUTH-4: header credentials, redirect refusal, stream-URL-only exception, no native-error token leakage | ID-01, QA-01 | implemented: `plex-api`, `response-limits`, `stream-token-exposure` | Native URL handling/redirect behavior remains unverified, not an assertion of cryptographic protection |
| AUTH-5: optional remembered sign-in, removal on sign-out, truthful unencrypted storage disclosure | AC-01, IN-01 | implemented source: `session`, `preferences`, `samsung/PRIVACY.md`; no encryption claim | Supported secure-storage investigation is not evidence of encrypted-at-rest credentials; retail persistence unverified |
| AUTH-6: no title/search/subtitle/server telemetry; separate revocable opt-in if a sender is added | PB-02 | No telemetry sender is introduced; `support-record` allowlists a local preview | Do not label a local user-invoked support preview automatic telemetry |
| BROWSE-1: PMS Continue Watching/recent shelves, favorite-library filtering and explicit hero Play/Info/cycle | UX-02 | implemented: `home-deck`, `home-hero`, `home-season-navigation`; merely focusing/cycling does not play | Named-TV source/state and D-pad behavior unverified |
| BROWSE-1 / DESIGN Layout: See all beyond 12 items, retain opening shelf/Back; optional row visibility/order/hero Save/Reset | UX-02 | implemented: `home-paging-ui`, `home-personalization-ui`, `home-layout` | Real profile/restart persistence and physical remote acceptance unverified; no default redesign is promised |
| BROWSE-2: movie/show/season/episode routes, sort/filter/unwatched/alphabet and bounded paging | UX-03 | implemented: `product-ui`, `media-ui`, `route-resilience`; 200-card retained window | Per-variant native focus/memory distributions unverified |
| BROWSE-3: remote search, reachable-server grouping, controllable query/Back and no empty-query request | UX-03 | implemented source: `product-ui`, `route-resilience`, `lg-parity-ui` | Exhaustive real-server response/media-type completeness is not established by a search entry point |
| BROWSE-4 / DESIGN Details: two-line expandable synopsis, extras/trailer, collection and related-item return | UX-03 | implemented: `detail-back-focus`, `lg-parity-ui`, `media-ui` | Real metadata availability and packaged text fit unverified |
| BROWSE-4: on-deck show Play/Resume uses episode identity; missing on-deck falls back to Seasons | UX-03, MARK-01 | implemented: `home-season-navigation`, `lg-parity-ui`; client contract section 9A | Native playback of the selected episode unverified |
| BROWSE-4: person biography/credit pages and exact local/shared GUID matching, not licensed playback | WL-01, WEB-01 | implemented: `people`, `filmography-ui`, `watchlist` | Actual account grants and incomplete-index recovery on packaged runtime unverified |
| BROWSE-5: denied/loading/empty/failure differ, Retry re-fetches, stale results cannot steal the next route | UX-01, UX-03 | implemented: `route-resilience.test.js:100-114`, `account-navigation-ui.test.js:121-159` | The reported physical Account/Settings trap itself remains unreproduced, not refuted |
| BROWSE-6: bounded pages/images/profile artwork; explicit cancellation and release | PF-01, UX-03 | implemented: `artwork-lifetime`, `profile-image`, `response-limits`, queue/photo contracts | Decoded-image/heap and long-session budgets are unverified, not zero |
| PLAY-1: UI uses the playback controller and isolated AVPlay adapter | PB-01, QA-01 | implemented: `playback`, `avplay`, `player-transitions` | Actual AVPlay behavior remains model/firmware-specific |
| PLAY-2: selected-version capability/track/subtitle negotiation; Force refuses conversion, Auto falls back | PB-01, PB-03 | implemented: `capabilities`, `playback`, `playback-metadata-ui` | Current hardware codec/HDR/audio and actual direct/transcode output unverified |
| PLAY-3 / current feedback: no on-screen interval Back/Forward; Pause first and safe expired-opener focus | UI-TRANSPORT-01 | implemented in this repair: observed red-to-green `player-layout-ui`, `product-ui` | Newly repaired source is not yet deployed; no native seek fix claimed |
| PLAY-3: slider/hidden-HUD held Left/Right, acceleration, key-up or 300 ms idle commits once, clamps bounds | UI-TRANSPORT-01, PB-01 | implemented: `product-ui.test.js:615-687`; policy unchanged by button removal | Physical repeated/released keys and landed TV seek remain unverified |
| PLAY-3: dedicated Rewind/Fast Forward use saved interval and preserve pause; row arrows navigate without seek | UI-TRANSPORT-01 | implemented: updated `product-ui`; the removed buttons are not these key handlers | Native seek responsiveness/failure is unresolved; earlier exact failure wording unavailable |
| PLAY-3: landed playhead, preparing/buffering and non-playing controls follow actual adapter state | PB-01 | implemented source: `avplay`, `playback`, `product-ui` | Keyframe snapping/actual panel position on each TV unverified |
| PLAY-4: explicit start/pause/stop/completion, string queue correlation and PMS progress/read-back | PB-01, WATCH-01 | implemented: `playback`, `progress-bounds`, queue tests | Real PMS final state/read-back and interruption persistence external-blocked by absent disposable backend |
| PLAY-5: real selected/default/forced/SDH/duplicate track variants, language grouping, safe paused switch | ST-01 | implemented: `player-layout-ui`, `player-transitions`, `account-preferences-ui` | Audible/visible selected output and real per-profile/per-Part persistence unverified |
| PLAY-6: Unicode/multiline/overlap cue timing, search/download failure and track/version cancellation | ST-02 | implemented text paths: `subtitles`, `subtitle-search`, `subtitle-api`, `player-transitions` | Visible format/timing across native/overlay/burned paths unverified |
| PLAY-6: local styled ASS/SSA, PGS and VobSub equivalence | ST-03 | partial: existing device/server routes; no equivalent local styled/image renderer | Feasibility/API/resource limits remain explicit; a host SRT pass cannot close this criterion |
| PLAY-7: actual metadata includes markers/chapters; focused Intro/Credits persist for segment; held OK acts once | MARK-01 | implemented: `plex-web-interop`, `skip-markers`, `player-layout-ui`, `product-ui` | Named-TV synthetic metadata-to-action/seek acceptance still unverified |
| PLAY-7: chapter cards seek their own time; Up Next/Watch Credits preserve pause/countdown and successor ownership | MARK-01, PB-01 | implemented: `player-layout-ui`, `video-queue-ui` | Native episode transitions, pause and standby unverified |
| PLAY-7: version/quality/source, actual versus requested facts, actionable Retry/Restart/Stop/Back | PB-01, PB-02 | implemented: `playback-metadata-ui`, `player-layout-ui`, `support-record` | Physical output is explicitly not measured |
| PLAY-8: aspect preservation/display mode, per-format HDR/picture expectations | PB-01, QA-01 | adapter source and `avplay` contracts exist | Current source non-16:9 composition/HDR acceptance is unverified; engine tables are not acceptance |
| PLAY-9: recoverable timeout/refusal/unsupported stream, no silent black-screen success | PB-01 | implemented controller error/cancel/retry paths: `playback`, `player-transitions`, `player-layout-ui` | Real interruption, native decoder failure and long-session recovery unverified |
| PLAY-10 / section 5: direct/transcode, subtitles, HDR/audio and model-specific workload register | QA-01, PF-01 | Host fixtures are implemented, not a completed format matrix | Missing current-artifact runtime observations/budgets; package counts are not functional passes |
| UI-1 / DESIGN: cinematic loop, no heavy Home focus frame, safe margins, legible text and lower-width grids | AU-01, UX-03 | implemented layout contracts: `blue-calm-theme`, `card-focus-layout`, `icon-layout` | Static/synthetic geometry is not physical couch text-fit, contrast or current model performance |
| UI-2 / PRODUCT: profile/server/Home/library/search/detail/person/photo/Watchlist/DVR/settings/confirmation routes | UX-01, UX-03 | source routes plus `route-resilience` loading/empty/error/Retry/Back coverage | Route presence is not exhaustive interaction or service acceptance |
| UI-3: short/held OK distinction, Tools/Info context menu, no repeated mutation, Cancel returns card | AU-01, WATCH-01 | implemented: `lg-parity-ui`, `watch-readback-ui`, `product-ui` | Actual Samsung key-up/repeat behavior unverified |
| UI-4 / DESIGN: Back restores media identity/filter/cursor/focus/scroll, not another library's globals | UX-03, AC-01 | implemented: `detail-back-focus`, `account-navigation-ui`, `route-resilience` | Packaged player return, transient suspension and restart acceptance unverified |
| UI-4 / DESIGN: first-page Back offers Exit app with Stay focused; only explicit Exit terminates | UX-01, AU-01 | implemented: `home-season-navigation`, `session-ui`, `lg-parity-ui` | Native app termination/foreground restoration unverified |
| UI-5: English/Spanish/Belarusian app text, placeholders/errors, reduced motion and larger interface text | AU-01 | implemented: `localization`, `dynamic-localization`, `interface-preferences-ui` | Old-engine formatting, caption contrast, panel text-fit and Voice Guide/Store obligations unverified |
| UI-6: standby/wake/background/no-auto-play and separate The Frame Art Mode contract | PB-01, QA-01 | hidden-state cancellation/no-auto-play source exists; Frame contract not accepted | Standby/process kill/Art Mode are unverified, not inferred from DOM visibility |
| DESIGN watch state: explicit scoped confirmation, unchanged read-back is unconfirmed, Back reloads badges/resume | WATCH-01 | implemented: `watch-actions`, `watch-readback-ui`, `home-cache-ui` | Disposable-account mutation/read-back external-blocked; household profiles forbidden |
| PRODUCT video queues: playlist pages, move-to-beginning confirmation/read-back, previous/next/shuffle/repeat | QU-01 | implemented: `video-queue`, `video-queue-ui`, `plex-api` | Real server/native order, cleanup and playback unverified |
| Original full-client goal / QU-01 editing: saved-playlist item add/remove | QU-EDIT-01, INT-01 | implemented source with observed red-to-green API/actual-UI regressions; complete bounded read-back and exact entry identity | Real PMS/native acceptance unverified; an already-sent write is not undone by leaving verification |
| Original full-client goal / QU-01 editing: saved-playlist create/rename/delete | QU-LIFE-01, INT-01 | implemented source: empty/seeded creation, name validation, named confirmation, exact result/absence read-back and cache/focus restoration; exact cbf34867 clean gates and independent scoped PASS | Real PMS/native behavior remains unverified |
| Original full-client goal / QU-01 editing: smart-playlist rules | QU-SMART-01, QU-01, INT-01 | implemented bounded structured editor with advertised fields/operators/sorts, nested all/any groups, limit, same-client URI, exact preflight/equivalent read-back and actual-UI regressions | Unknown/provider-specific or over-limit grammar is explicitly not editable, not silently discarded or called accepted. Current source awaits full committed gates/review; real PMS/native acceptance remains open |
| PRODUCT music: server audio queue, >200 entries, transactional next, shuffle/repeat and retryable cleanup | MU-01 | implemented: `music-queue`, `music-queue-ui`; not Plexamp parity | Real server ordering, native audio, interruption and memory unverified |
| PRODUCT photos: cross-page albums, rotate/slideshow, bounds, download/decode cleanup and return focus | PH-01 | implemented: `photos`, `photo-api`, `photos-ui` | Actual source formats/PMS conversion, panel output and old-engine resource limits unverified |
| Watchlist: account GUID read/add/remove verification, bounded paging and explicit unchanged-success feedback | WL-01 | implemented: `watchlist-readback`, `watchlist`, `media-ui` | Actual account persistence/concurrency external-blocked; not licensed streaming |
| Client section 9A DVR: destination library/storage, server preferences, explicit schedule/cancel and manual priorities | TV-01, TV-STORAGE-01, TV-PRIORITY-01 | implemented source: template-derived writes, fresh bounded location choices/explicit default, exact complete priority read-back and unchanged-conflict disclosure | Actual recording persistence, entitlement, conflict outcomes and native operation unverified; priority ordering is not a resolved-conflict claim |
| Client section 9A Live TV: consumer allocation, keepalive, release on cancel/exit and real live output | TV-01 | missing lifecycle implementation | external-blocked: supported ownership contract and disposable entitled tuner/server not established; no speculative tune/write |
| Original NT-01: same-scope outage metadata, bounded cache, auth/PIN safety and explicit stale-state indication | NT-01 | partial: `home-cache-ui`, scoped Home cache and retry; not downloads or a full offline client | Broader cloud-independent authentication/grant behavior is not established or silently promised |
| Research ST-03/AD-01/SO-01: styled subtitles, audio sync/dialog/normalization, synchronized co-viewing | ST-03, AD-01, SO-01 | partial/feasibility: converted-audio percentage is implemented; no local PCM/dialog/sync control or room implementation | API/service/performance prerequisites remain named; volume boost is not normalization/dialog isolation or shared-room support |
| Client section 9/9A licensed catalogue, distribution/Store and author-preserving installer recovery | SV-01, DS-01, DS-02, IN-01, ID-01 | partial: catalogue metadata and canonical packages; ordinary signed update accepted on three TVs | Licensed service/DRM/ads, Store/seller/legal, community adapter and Windows/Linux journeys remain independently gated |
| Original GR-01/PF-01: retain acceleration, default-off experiment, no invented speed comparison | GR-01, PF-01 | implemented experimental disclosure; host resource bounds and earlier probe evidence only | Current per-model raw cold/warm/focus/artwork/large-library/long-session distributions missing; no official-Plex A/B claim |
| Current "I see no change": visible features versus actual original 0.0.1, exact target and running code | RUNTIME-01, QA-01 | Offline comparison confirms new menu entries; default artwork/layout largely inherited | Livingroom target ambiguous; current running source/UI unverified. Do not diagnose stale runtime from installed version alone |
| REQ-WEB-01 lawful Plex Web interoperability | WEB-01 | implemented observed-request-derived marker/string-queue/opt-in-ABR/volume fixtures: `plex-web-interop`; documented primary-client observation | Not proprietary-code copying, full Web parity or actual entitled-service acceptance |

## Corrections and authorization

| Date | Type | Scope | Owner direction / consequence |
| --- | --- | --- | --- |
| 2026-10-25 | revise | All requirements | The previous research/rebrand/install slices did not complete the functional backlog. Recover every requested item; do not silently narrow delivery to identity work or skip controls. |
| 2026-10-25 | retract | Legacy cleanup | The owner reported deleting old Plx and directed "from now just focus on vemm". No further old-app cleanup, certificate cleanup or repeated uninstall attempts. |
| 2026-10-25 | add | REQ-WEB-01, REQ-REVIEW-01, REQ-REL-01 | Owner requests the full adversarial review and implementation of "0.2" including Plex Web investigation; use semantic version 0.2.0. |
| 2026-10-25 | add | Source implementation | "you have my approval to oimplement it please". Proceed without asking again for the same implementation authorization. |
| 2026-10-25 | add | REQ-DEPLOY-01 | "start sdd, i approve implementation adn deployment. i am not inetrested in partial statususes untill the new version is deployed on all available tvs." Continue implementation and authorized rollout; no routine partial-status messages. |
| 2026-10-25 | add | Existing signing and Samsung targets | Reuse existing matching-author SDK signing and saved DUID coverage for the available known household TVs. No new identity, certificate rotation, permission bypass, TV reboot, public release/tag, main merge, telemetry or household Plex writes is authorized. Real host/security prompts remain mandatory. |
| 2026-10-25 | add | SDB recovery | Owner previously explicitly approved restarting SDB in this conversation. Reuse that limited authorization when needed; it is not TV reboot or security-bypass authorization. |
| 2026-10-25 | revise | REQ-REVIEW-01 | Independent frozen-baseline verdict is REVISE. Repair the concrete gaps without rewriting working inherited behavior; retain all 34 rows and require a separate final-candidate review. |
| 2026-10-25 | revise | Execution while SDK access is blocked | After the observed five-TV connection failure and the approved SDB-only recovery attempt, the owner selected "Continue source work while device access remains blocked". Continue source implementation; native acceptance and the authorized rollout remain open, not waived or cancelled. |
| 2026-10-25 | revise | Real-account acceptance | Owner confirms no established disposable Plex account/profile/server configuration path is known. Continue synthetic fixtures and record real-account acceptance as externally blocked. Do not repeat this request or substitute household Guest/managed profiles. |
| 2026-10-25 | revise | UI-TRANSPORT-01 | "did you fix vide skipping? remove skip left and right buttions? what exactly did you imple,enmtned?" Remove redundant on-screen interval controls; preserve remote Left/Right seeking and dedicated media keys. No exact earlier native seek failure was recovered, so do not invent a new seek policy or claim it fixed. |
| 2026-10-25 | add | INT-01 | "thayt means you missed a lot fo specs". The grouped 34-row list is not exhaustive interaction reconciliation. Check original recoverable feedback and binding PRODUCT/DESIGN/client criteria, retain concrete gaps and implement confirmed actionable omissions; missing source UX is not device-blocked. |
| 2026-10-25 | add | RUNTIME-01 | "honmestly i see no change" and "i am in livingroom". Installed version does not refute the report. Saved fleet names match two updated sets; exact target is unresolved while the owner is unavailable. No guessed target, blind launch/debug restart or household navigation/playback. |
| 2026-10-25 | revise | DEPLOY-01, ID-01 | Restored intended Ethernet and live identity allowed normal signed updates on three sets. Observed update acceptance supersedes the earlier blanket transport blocker, not historical fingerprint, saved-state or native feature acceptance. Both distinct RU7092 sets remain unreachable/unmodified. |
| 2026-10-25 | supersede | All shipping authorization | "ok, listen man, stop releasing" followed by "do all". Stop shipping, including signing/distribution, device install/restart/launch, push/publication, PR edit, merge/tag/release. Continue all approved local source/tests/spec implementation and interaction reconciliation. No shipping/device command was in flight at this correction; no new signing or delivery occurred. Existing artifacts are preserved and no Samsung lease is held. |
| 2026-10-25 | supersede | Conditional automatic Samsung release | "release automatically onece you finish and run an adversarial review against the specs. do this automatically". Finish all reconciled approved specs, freeze the exact candidate and obtain independent adversarial acceptance against the original detailed specifications and expanded ledger; correct/re-review material findings. Only then automatically execute the applicable authorized Samsung WGT release/signing/deployment workflow without renewed routine approval. Scoped slice PASS or host-green is not this condition. Unmet/external criteria are not waived; account, exact target, author/certificate, privacy and no-bypass boundaries remain. No shipping is authorized now, and no LG release steps apply. |
| 2026-10-25 | revise | Release priority/scope: QU-01 saved playlists, QU-EDIT-01, QU-LIFE-01, QU-SMART-01, MU-01, PH-01 | "i do no tuse playlists, though, and music and photos, so i woul not enabled/prioritize this just yet". Explicitly defer these workflows from current release priority/acceptance, not mark them completed. Preserve existing code/behavior; add or enable no new optional surfaces. The in-flight frozen compound-sort correctness review may finish. Prioritize movie/TV browsing, actual video playback/seek/remote controls, subtitles/audio selection and relevant core acceptance. Automatic release remains conditional on revised in-scope completion and adversarial acceptance, without waived native/safety evidence. |
| 2026-10-25 | revise | SEARCH-01, SEARCH-ONLINE-01, UX-03, WEB-01 | "malke sur ethe search works. i like how [pe searches", clarified as "online, not only libraries. can we do that? hasnt this come up when reverse eng plex. web??". Online Plex/Discover catalogue search, details and exact local availability association are core release scope, separate from licensed streaming rights. Preserve query/results/focus and cancellation/error/retry ownership. Recover lawful Web/protocol evidence rather than invent endpoints or reference-client UX equivalence. Existing frozen search/sort review may finish; do not expand deferred media scope. |
| 2026-10-25 | supersede | SEARCH-01, SEARCH-ONLINE-01, SV-01, UX-03, WEB-01 | "do not search and run plex own distributions please. focus on a godd own search. from library for now and at most public search like plex does. no plex movies". Library-first Vemm search is current core scope. No automatic Discover/Plex-distributed Movies & Shows queries, promotion or playback, and no downloading/running Plex client distributions. Retain online code/regressions deferred, without default search entry points; optional separate public metadata is not a release blocker. Legitimate Plex authentication/library grants remain. Conditional release evaluates revised core scope, not deferred cloud completion. |
| 2026-10-25 | revise | QA-01, PF-01, RUNTIME-01, REVIEW-01 | "If native acceptance is next cheapest action, prepare authorized serial synthetic-content/account-safe plan and execute within existing grants, without guessing ambiguous livingroom identity or writing household progress." Bounded synthetic QA may produce the missing native evidence under existing author/exact-target grants; do not require completed native acceptance before its authorized creation. Production release remains conditional on revised core completion and whole-candidate review. Earlier transport failures are dated history, not a current blanket blocker. |

## Execution and acceptance

- Start useful end-to-end implementation after the short requirements intake.
  Existing code must be repaired/completed where appropriate, not rewritten
  solely because it predates the rebrand.
- Include every row above in the work. Real dependencies, unavailable services
  and feasibility results must not disappear behind an optimistic version bump.
- Preserve the ES5 DOM/CSS plus AVPlay architecture, existing acceleration,
  package/application/storage identity and author continuity.
- Use existing repository tests. New reported defects start with an observed
  failing regression and end with that regression passing.
- Only the Vemm coordinator owns device work. Use one Samsung lease, exact
  saved/live identity matching and serial operations. Release the lease while
  building or waiting. Other review/implementation lanes have no device access.
- Use synthetic media and explicitly disposable test records. Normal user
  sign-in is not permission to mutate household profiles or viewing state.
- No partial progress reports requested by the owner. Ask only for an actual
  human-only decision or access barrier that cannot be resolved safely.
- Final acceptance requires behavior and deployment, not completed research,
  source-presence inventories, screenshots alone or a successful install alone.

## Core reconciliation and next acceptance

The revised core source candidate is not an assertion that every defect has
been found. The original 34 rows and detailed interaction table remain recorded,
with explicit owner deferrals above. Do not aggregate scoped PASSs into final
acceptance: the next independent frozen review must assess the whole revised
core against PRODUCT, DESIGN and the original concrete client criteria.

| Active core slice | Concrete source evidence | Remaining observation / next action |
| --- | --- | --- |
| Movie/show/season/episode browse, Home and Account/Settings | `product-ui`, `home-season-navigation`, `account-navigation-ui`, `home-paging-ui`, retained per-library page/filter/cursor closures | Current-artifact native D-pad, focus/Back, text-fit, large-library/decoded-image memory and cold/warm measurements are unattempted. |
| Vemm personal/shared-library search | `search-completeness-ui` covers movie/show/episode detail/Back, exact source-server identity, edited/cleared query ownership, empty and bounded results; `online-search-ui` now proves linked-account default has no catalogue requests/promotions and keeps 200 library results | Whole-core source review pending; actual PMS responses/grants and native search/input/focus remain unverified. No online catalogue completion is required. |
| Video skipping / HUD / remote seeking | `player-layout-ui` and `product-ui`: four transport actions, Pause/Play first, expired marker opener, row arrows versus slider/hidden-HUD seek, dedicated media keys, held acceleration, bounds, key-up/300 ms idle single commit and pause intent | Highest-priority unresolved report: actual native landed seek/latency/error behavior. The old exact failure wording is unavailable; do not claim the native problem fixed from host tests or installed version. |
| Core video episode transitions and recovery | `video-queue-ui`, `player-transitions`, `playback`, `progress-bounds`: fresh metadata/markers, string queue identity, pause-preserving credits/Up Next, bounded ownership, Retry/Cancel and final cleanup | Account-free synthetic HTTP can observe native AVPlay and owned fixture timeline/cleanup; real PMS viewing-state read-back separately requires disposable records. |
| Audio/subtitle selection and text/format handling | `player-layout-ui`, `account-preferences-ui`, `subtitles`, `subtitle-search`, `subtitle-api`, `player-transitions`: language/forced/default/SDH/duplicates, Unicode/overlap/delay, selected stream and burn-in/Force boundaries | Native audible/visible output and timing/seek/version changes remain unobserved. Styled/image output and PMS font/burn correctness cannot be accepted from SRT/DOM tests. |
| Quality/source, identity/privacy and lifecycle | `capabilities`, `playback-metadata-ui`, `stream-token-exposure`, `support-record`, `session-ui`, `profile-boundary-ui`, packaging/ES5/M47 contracts | Decoder/HDR/aspect/output, physical remote, standby, real PIN/profile persistence and author/state continuity remain separate native/service gates. Existing host capabilities are not model-wide certification. |

No additional actionable core source defect is currently reproduced beyond
the corrected review findings and latest default-search revision. That is a
candidate for whole-core adversarial inspection, not exhaustive-coverage PASS.
Remaining source/service boundaries are explicit: no speculative Live TV
consumer ownership; no unsupported audio DSP; scoped RAM-only outage metadata
does not promise offline authentication/grant bypass. No household account may
be used to close a missing disposable-backend criterion.

Next native acceptance is a serial, account-free synthetic workload, not a
production release or a claim that transport is currently blocked:

1. Freeze the complete core candidate for the requested whole-core adversarial
   review; correct material source findings and rebind native evidence after
   relevant changes. Synthetic acceptance may proceed under existing grants
   while independent review runs. Keep publication/production rollout conditional.
2. Stage the exact clean HEAD with `tools/tizen/native-fixture.py stage`, retain
   original product code and notice/payload hashes, and use only the existing
   `VemmQaApp0.NativeQa` identity and approved author/profile. Bind generated
   synthetic media and fixture receipts to that source; no Plex account,
   household media or progress writes.
3. Acquire the sole Samsung lane, rediscover intended Ethernet endpoints and
   live-match each saved original identity before any mutation. Start with an
   unambiguous saved QN70F target rather than guessing which Livingroom TV the
   owner meant. Check exact target/current operation and existing grants;
   do not terminate household apps, reboot, uninstall or change certificates.
4. Use the existing explicitly bound/private-client-allowlisted fixture server
   and owned QA inspector to test real AVPlay play/pause, slider/hidden-HUD
   Left/Right and media-key seeks, landed positions, marker actions, four-control
   HUD/focus, audio/subtitle output, recovery and stop/fixture read-back. Record
   actual failures first and repair reproduced defects before expanding.
   Inspector-dispatched input is not proof of physical remote repeat behavior.
5. After the first functioning target, repeat applicable old/new-engine cases
   serially, using raw per-model timing/memory distributions rather than DOM
   proxies. Distinct RU7092 units require distinct live identities; previous
   timeouts are history, not a current availability claim. Remove only owned
   forwards/processes/fixture resources and release the lane.

Unresolved Livingroom identity remains a blocker to attributing the owner's
specific running experience, not permission to skip an unambiguous synthetic
target. Unsupported inspector access, identity mismatch, host prompts or an
actual grant boundary must be reported specifically; do not revive the old
blanket SDK blocker or silently accept unmeasured behavior.

## Handoff

Online Search at exact clean `5747511e` passed the full host/28-file ES5/M47
gate and temporary unsigned source build, clean afterward. Independent frozen
review also ran the full host gate and additional edit/Back, cloud-401 and
actual profile-token transition probes, but returned REVISE for one real
continuation defect: with no known/connected PMS, online details > Find in my
libraries used a null client, exposed an exception and offered ineffective
Retry. A new actual-main.js regression reproduces that continuation failure.
The repair admits no fallback target without a real current client and shows
an explicit no-server availability state, without requests, errors or Retry.
It retains Back to catalogue details and the original query/GUID focus.
The parent's immutable 10b16abc inspection and actual UI rerun returned scoped
PASS, closing that null-client finding. The later owner scope now defers online
search; the current default-search revision and complete core still require
frozen gates/whole-core adversarial review, not aggregation of these scoped
PASSs. Real PMS/native and revised full-spec acceptance remain open.

The player source correction at `8e5b94cd` removes only the redundant interval
buttons, starts on Pause / Play and returns there when a scrub opener expires.
The exact clean commit passed the full host gate, temporary unsigned source
build and the parent's separate frozen player-layout/product-UI source review.
This does not establish native seeking or exhaustive requirements acceptance.

The current release defers saved playlists (including smart editing), music
and photos under the owner's later explicit scope correction. Preserve their
existing implementation and regression protection without new optional
surfaces. Core movie/TV browse/search, playback/seek/remote controls and
subtitle/audio selection remain prioritized. Source-slice evidence below
records work already performed, not continued playlist/music/photo priority.

Current `QU-EDIT-01` adds/removes standard saved-playlist entries with complete
bounded identity/order verification, same-client URI ownership and explicit
confirmation/cancellation. Exact `1cfc9f08` passed clean full host/source gates
and the parent's frozen API/actual-UI source review. A stronger actual-UI
regression then exposed late add and removal writes after cancelling a
secondary server's confirmation (the primary client was different). Registering
the actual mutation client in confirmation ownership repairs both observed
failures. Exact `cbf34867` passed clean full host/source gates and the parent's
separate frozen lifecycle/item API/actual-UI/watched-readback review.
The shared read-only Refresh discards the completed confirmation's history
entry; Watchlist and DVR journeys assert the resulting Back destinations.
`QU-LIFE-01` now implements named empty/seeded creation and playlist-detail
rename/delete, verifies exact results and typed deletion absence, and shares
scope/deadline/edit interlocks with item edits. Its actual UI also exposed and
repaired lost draft/Continue focus and collapsed More after Cancel. Metadata
revision invalidation refreshes retained lists after changes; actual Back into
a previously empty list displays the newly created playlist.
Current `TV-STORAGE-01` and `TV-PRIORITY-01` implement fresh physical/default
storage selection and explicitly confirmed manual priority management with
complete identity/order verification, limits, cancellation and no replay.
Focused API/actual-UI regressions pass, including partial-priority rejection
and unchanged tuner-conflict status. Exact clean `937ca455` also passed the full
host/ES5/M47 gate and temporary unsigned source build, clean afterward. The
parent independently reviewed the frozen DVR delta, reran its four focused
suites and additional priority/storage probes: scoped source-semantic PASS,
not actual PMS/tuner/native/full-spec acceptance.
Current `QU-SMART-01` has an independent bounded content grammar and
server-advertised structured editor. API and actual-main.js regressions
observed missing inspection/action before implementation and now pass nested
all/any, typed values, ordered sorts/limit, named confirmation, stale/
unchanged/denied read-back, cancellation and draft/focus restoration.
Exact clean `cffc986b` passed the full host/28-file ES5/M47 gate and temporary
unsigned source build. Independent frozen smart review returned REVISE:
advertised compound sort expressions/descKey are not preserved. Repair that
finding before any source acceptance; the initial six focused green suites
did not cover it.
The current repair now preserves complete advertised key/descKey expressions,
groups compound choices without dropping ties, rejects truncated choices and
counts expanded components. New API and actual-UI regressions independently
reproduced the loss with a limit; a compound Show key without selected sorting
also failed before repair. A coupled actual browse regression observed an
extra `:asc` appended to a compound; it now reuses the validated selector.
Exact clean `eb5b6823` passed the full host/28-file ES5/M47 gate and temporary
unsigned source build, clean afterward. The parent's narrower frozen re-review
returned scoped source PASS; the compound Major is closed. This does not reopen
deferred smart scope or establish actual PMS/native acceptance.
Current `SEARCH-01` observed and repaired missing clip/video-playlist results,
stale results after query clearing, 1000 empty headings despite a 200-card cap,
premature consumption of Back focus and duplicate-key wrong-server focus.
`search-completeness-ui` exercises the actual source, existing playlist route,
typed/cleared pending queries, bounds and two distinct clients with key 7.
Exact clean `49baa2ad` search source passed full host/source gates and the
independent frozen scoped review. The separate online search requirement now
has observed-red/green API and actual-main.js source corrections: main-entry
cloud requests, no-server entry, cancellation/partial errors/Retry, exact GUID
local availability and GUID/server-key Back. It still needs committed gates
and scoped independent review, not a real-cloud/native claim. Continue active core
video/search requirements under the revised release scope, not further
playlist/music/photo expansion or a full-spec readiness claim.
Styled/image subtitle equivalence, Live TV consumer ownership, broader
offline auth/grants, audio sync/dialog/normalization, co-viewing, installer and
native/service acceptance remain explicitly in scope.
The first `7de5110f` full gate stopped at the small detail-back-focus DOM
double, which has `document.querySelector` but not `screen.querySelector`.
Capturing More through the existing document selector seam preserves identical
browser behavior without adding unsupported test-only production fallbacks.
Shipping is now conditionally authorized only after all reconciled, currently
in-scope core specifications
are finished and an independent full-spec frozen-candidate adversarial review
accepts them. That condition is not met; continue source work, not signing or
shipping now. These local corrections are not deployed fixes.

The interaction reconciliation above records omitted explicit transport/focus
criteria and other source gaps. Continue those source-ready omissions, not just
the button correction. Earlier short grouped rows and the historical baseline
audit are not exhaustive owner-feedback reconciliation.

Latest production observation: c1b7b015 signed 0.2.0 updated MU6172, Q80C and
QN70F normally, with raw version confirmation. Both RU7092 units remain
unreachable and not updated. Scoped independent c1b7 Watchlist source/prose/
artifact review and full clean host gate passed. Runtime/feature/service/
performance acceptance remains open. Both MU6172 and Q80C carry Livingroom TV
names; no current-target disambiguation exists and the owner is unavailable.
Do not guess or restart either while investigating the reported unchanged UI.

Historical slices and evidence follow; their SDK-blocked observations were
superseded by the Ethernet restoration and three normal updates above.

The latest additional host-implementable slices are `b4e6d56d` (profile/server
grant and PIN Back ownership), `d9d7c44e` plus `463c5290` (deterministic explicit
track variants), `1e422f55` (library-specific retained pages) and `fb20fac7`
(identity-bound Watchlist mutation read-back). Each began with an observed
failing production/API regression. Independent exact-463c source/prose/artifact
review and full clean host gate passed, scoped to those bytes and not delivery.
The later Watchlist/ledger candidate still needs its own complete frozen gates,
receipts and scoped independent review.

The single fresh read-only five-TV recheck after the 13ef source repairs still
found all developer ports reachable and all SDB connections failed before
live identity. No server restart, host setting change, app mutation or signing
was attempted. There is no new native version or functional acceptance.
The owner has explicitly confirmed no disposable Plex account/profile/server
configuration exists: do not repeat the request or use household profiles.

The four e0c7d7da review defects are corrected by `f9f2c330` (watched
retained-view reload/focus), `9511b361` (paused credits and successor intent),
and `566f50e7` (music metadata validation and creation/retirement ownership,
integrated from child `0789e586`). Their new regressions were observed failing
before the fixes and passing afterward. Refresh the full clean-source gates,
unsigned package/source receipts and independent repaired-delta review on the
new frozen candidate; e0c7d7da is not acceptance of these later bytes.

The prior frozen `884b828d` includes ISO language-group correction,
exact final-WGT payload gate and remote-only Account navigation regression.
Its full host gate (including 10 Python contracts), strict ES5/M47 gate and
unsigned SDK source build pass with the tree clean before/after.
Private matching-source artifacts include
separate unsigned production/QA WGTs, unchanged toolkit static audits, exact
payload inventories and complete tracked-source archive/checksum. Packaging
retains all four root notices and the explicit 16-file licence inventory.
These receipts replace the stripped unsigned candidates as package evidence,
not as SDK-signing trust, native acceptance or production deployment.

Playback diagnostics session `6e881844-fa5a-4679-b6dd-d38c12dcbf00` delivered
`127e3998`, integrated as `2f416d4e` after the Unicode/overlap fixes. The full
host gate and unsigned product build passed on that exact clean combined
candidate. Support preview/copy uses a bounded allowlist, separates requested
from PMS/native output and has explicit clipboard failures; it remains
unaccepted on retail TVs. No implementation child remains active. Do not
duplicate earlier music/photo/Home/video/diagnostics implementations; the
coordinator retains the single device lane.

Continue this ledger on `dragoshont-vemm-product-backlog`; do not restart the
requirements intake. Skip/watched regressions, Home paging/personalization,
adaptive policy, scoped outage recovery, accessibility preferences, converted
audio volume, bounded music/photo journeys and version agreement are integrated.
`0d211396` integrates the completed video playlist/queue slice after those
changes. The full combined host gate and unsigned product build passed on that
clean commit; neither is native or real-PMS acceptance. No implementation child
from the earlier music/photo/Home/video slices is still active. The original
34 rows remain recorded; explicitly deferred saved-playlist/music/photo work
is outside current release acceptance, not completed.

The earlier credential-free QA widget was prepared from `a2383fdb` with app ID
`VemmQaApp0.NativeQa`, not the production Vemm ID. Its unsigned package passed
the actual toolkit audit and unsigned SDK build. An unnecessary synthetic token
was removed after the audit rejected it; no audit bypass was used. Later actual
WGT inspection found that toolkit packing stripped root notices and all
`licenses/` entries from that package despite retaining them in the stage.
It is retired and must not be reused for rollout. Keep the original ownership
receipt, repair payload packaging and verify the final WGT byte inventory;
a green static audit alone missed this omission. A freshly
original-DUID-matched `tv-edcfc1` reported a successful QA install, but the
app-list parser did not establish its version. The subsequent read-only retry
failed to reconnect, so version and native behavior remain unconfirmed. Only
this owned QA identity was installed; production Vemm was not updated or
uninstalled. Freshly rediscover and identity-match before every new process;
retain private ownership/install receipts and resolve read-back before claiming
acceptance. The last complete discovery matched all five saved original TVs.
The parent confirmed the proven raw command is `sdb -s SERIAL shell 0 vd_applist`:
start each record at `app_id`, normalize hyphen-decorated keys/values, and retain
title/version fields that precede `app_tizen_id`. The private install helper's
parser now passes that synthetic record-order regression; no fresh native
version read-back was possible. Do not invent an alternative app-info command.

Preserve private session artifacts and generated synthetic media. Continue all
local source/feasibility rows, concrete interaction reconciliation and the
independent frozen-source review. Do not run signing/distribution, device or
publication work under the current shipping hold. Real cloud/tuner/account-write
acceptance still has no established disposable backend; household profiles are
not a substitute. Service/seller/legal barriers remain explicit blocked rows.

Latest access correction: the intended Ethernet interface returned and enabled
three normal signed production updates. The two missing RU7092 targets timed
out on bounded directed Ethernet discovery. No TV was rebooted or security
setting bypassed; the serial lane and owned links were released. Do not repeat
connections without new evidence, count QA as production, or substitute an
installed-version receipt for runtime/native functional observations.

Failed approaches: branding-only delivery, interpreting research as implemented
features, treating old host receipts as current TV acceptance, and repeatedly
retrying legacy-app removal after supported commands failed. Do not repeat them.

Verify: confirm canonical `dragoshont/vemm`, the intended isolated branch and
this committed ledger; read `AGENTS.md` and the governing client/product/design
contracts. Use focused `tests/tizen` regressions while iterating, then
`tools/tizen/test.sh` and `tools/tizen/build-source.sh samsung/Vemm` on the
committed clean candidate. Device/signing/distribution/publication work is on
hold; do not act on older shipping grants. Retain existing source/package
hashes and actual per-target installed-version/native evidence without
promoting it to current-source acceptance. No adopted Architrave config or gate runner existed at intake;
do not invent one as a prerequisite to product work.
