# Vemm 0.2.0 requirements

Status: implementation authorized; not delivered.
Baseline: `2b50628cd9a346dbe1d374e103124665b749b260`.
Owner: the Vemm product-backlog session.

The owner approved the entire previously researched product backlog, recovery
of earlier functional feedback, an adversarial review, Plex Web interoperability
investigation, implementation, and deployment to every available known TV.
Branding, source presence, host tests, package creation and installation are
different outcomes; none substitutes for functional acceptance.

The existing [client specification](docs/samsung-tizen-client-spec.md),
[product contract](samsung/PRODUCT.md) and [design contract](samsung/DESIGN.md)
remain binding. This file is the implementation and acceptance ledger, not a
replacement that reduces their scope.

## Requirements

`pending` means not accepted, including features whose source already exists.
An `accepted` row needs evidence identifying the tested source and actual
behavior. A real external dependency is `blocked`, never silently omitted or
called implemented. Feasibility rows retain their original research scope;
negative findings require evidence, not speculation.

| ID | Requirement | Testable acceptance | Owner | Status | Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-ID-01 | Preserve the independent Vemm identity. | Current app, package, assets, settings, support and distribution use the approved identity; GPL/protocol/provenance remain intact; updates preserve Vemm state and author continuity. | Vemm | pending | |
| REQ-FB-01 | Provide working Samsung feedback/support. | Logged-out support destination works; Samsung-specific report fields, privacy guidance and response ownership are correct. | Vemm | pending | |
| REQ-UX-01 | Complete Account/Settings remote access. | Regression reproduces the reported trap; D-pad journeys from Home and libraries reach Account/Settings and return without DOM-click shortcuts. | Vemm | pending | |
| REQ-QA-01 | Establish current-artifact acceptance. | Bind source/package/model/firmware/runtime; exercise linking, focus, playback, seek, tracks, subtitles, resume, standby and update; record actual pass/fail/skip using synthetic or disposable records. | Vemm | pending | |
| REQ-IN-01 | Complete fresh install/update journeys. | Supported Windows/macOS/Linux paths have observed stage-specific recovery; same-author updates preserve settings/sign-in without uninstalling Vemm; documentation matches the actual toolkit. | Vemm | pending | |
| REQ-PF-01 | Measure and guard performance. | Cold/warm Home, focus, artwork, large-library and long-session fixtures have raw per-model distributions and evidence-based budgets; no unmeasured official-Plex speed claim. | Vemm | pending | |
| REQ-UX-02 | Complete Home shelves and personalization. | See-all/paging retains row/item/focus/Back state beyond the first 12 entries; provide evidence-backed optional row/order/hero controls without mandatory customization. | Vemm | in_progress | Observed failing Home D-pad regression beyond card 12; See all now expands a hub through documented /hubs/items in 50-item pages with the existing 200-card retention bound. home-paging-ui covers 75 titles and Back to the same shelf action. Personalization/native acceptance outstanding. |
| REQ-PB-01 | Complete playback recovery/lifecycle. | Network/PMS interruption supports retry/cancel, preserves intended pause/resume and selected tracks, avoids unintended autoplay, and passes stop/read-back, long-session and standby cases. | Vemm | pending | |
| REQ-PB-02 | Explain playback and export safe diagnostics. | Plain-language reason/next action, actual versus requested output, and previewable redacted support record work without token, DUID, server or title leakage. | Vemm | pending | |
| REQ-ST-01 | Finish audio/subtitle ranking and persistence. | Multi-language, forced/default/SDH and duplicate cases have deterministic ranking and clear per-item/profile persistence; verify actual selected output. | Vemm | pending | |
| REQ-ST-02 | Finish subtitle reliability. | Unicode/multiline timing survives seek, pause and version changes; native/overlay/burned paths and download failure/recovery have per-format visible acceptance. | Vemm | pending | |
| REQ-AC-01 | Complete safe profile/server switching. | Explicit profile changes preserve PIN boundaries and correct library/watch state; denied/unavailable servers recover; restart and saved-sign-in behavior match settings. | Vemm | pending | |
| REQ-UX-03 | Finish large-library browse/search return. | Detail/player return retains item identity, filter and cursor; bounded large synthetic libraries meet measured memory ceilings; stale requests cannot replace the current view. | Vemm | pending | |
| REQ-AU-01 | Complete remote accessibility/legibility. | Focus, Back and held/repeated keys work throughout; text/captions fit; reduced motion and text-size feasibility are resolved; Samsung TTS/Caption obligations are assessed for intended Store targets. | Vemm | pending | |
| REQ-PB-03 | Add adaptive quality and local/remote policy. | A bounded negotiation/rebuffer policy adapts while preserving explicit quality choice; Original labels remain truthful; disposable local/remote interruption cases pass. | Vemm | in_progress | Independent opt-in controller, documented ABR/location requests, remote initial ceiling and bounded rebuffer downgrades implemented. Controller and real-UI/fake-adapter tests cover grace/cooldown, fixed/Force choices, tracks/playhead, stale owners and no paused autoplay. Native/disposable-backend acceptance outstanding. |
| REQ-QU-01 | Complete video playlists/queues. | PMS identity, order, paging, repeat/shuffle, next-item and cleanup are verified; editing/paged playlist workflow is usable without duplicating the existing video queue. | Vemm | pending | |
| REQ-MU-01 | Complete server-backed music queues. | PMS music PlayQueues, long queues, interruption/retry and native audio work with bounded resources; do not claim Plexamp parity. | music-lane | in_progress | Claimed for isolated source implementation; coordinator retains device acceptance and integration ownership. |
| REQ-PH-01 | Complete photos. | Supported formats, rotation, navigation, slideshows, large albums, memory bounds and teardown are accepted on named TVs. | photo-lane | in_progress | Claimed for isolated photo implementation; coordinator retains device acceptance and integration ownership. |
| REQ-WL-01 | Complete Watchlist. | Authorized disposable-profile read/add/remove/read-back, remote paging and local/shared grant matching pass; metadata access is not licensed-stream playback evidence. | Vemm | pending | |
| REQ-TV-01 | Complete personal Live TV/DVR. | Entitled tuner allocation, keepalive/release, cancellation, live output, conflicts and DVR operations pass against a disposable backend without leaking tuner ownership. | Vemm | pending | |
| REQ-SO-01 | Resolve synchronized co-viewing feasibility. | Establish demand, protocol/entitlement and session-ownership evidence; determine supported synchronization/reconnect/seek/pause behavior or record a specific externally gated outcome. | Vemm | pending | |
| REQ-NT-01 | Define and implement supported local-first recovery. | Scoped authentication/grant policy and bounded cached metadata work during supported outages; no PIN/entitlement bypass and no conflation with media downloads. | Vemm | in_progress | RAM-only Home snapshot capped by shelf/card/serialized-size limits and five-minute TTL; explicit cached status and Retry. home-cache-ui reproduces and repairs profile-selection retention and covers authorization refusal, changed profile, expiry and no persistent storage; session-ui retains account/server recovery. Native outage/PIN journeys remain open. |
| REQ-ST-03 | Resolve styled/image subtitle feasibility. | Source/legal/device evidence and measured older/newer-TV CPU/memory/frame impact support the chosen ASS/image-subtitle renderer or truthful supported fallback. | Vemm | pending | |
| REQ-AD-01 | Resolve audio-sync/dialog/normalization controls. | Establish actual API, entitlement and output feasibility; implement supported controls or record concrete external blockers; do not confuse this with codec passthrough. | Vemm | in_progress | Documented PMS audioBoost percent-loudness control implemented with unchanged default, bounded choices and original-file exclusion; playback/preference/interop fixtures cover persistence and conversion fallback. No verified local audio-delay/dialog-isolation/normalization hook; spectrum analysis is not DSP. Server/audible native acceptance and full feasibility assessment remain open. |
| REQ-DS-01 | Complete the community-distribution adapter pilot. | An isolated synthetic pilot verifies AVPlay, privileges, auth storage, lifecycle, update/rollback and exact models; no production-app replacement or licence stripping. | Vemm | pending | |
| REQ-DS-02 | Resolve Samsung Store feasibility. | Establish seller/country/model eligibility, GPL/service/branding/privacy/accessibility obligations, reviewer-backend and update-identity requirements; do not claim submission or approval without evidence. | Vemm | pending | |
| REQ-SV-01 | Resolve licensed Plex catalogue playback. | Verify actual authorization/DRM/advertising/rights and service availability before implementing supported playback; do not substitute personal-PMS output or bypass entitlements. | Vemm | pending | |
| REQ-GR-01 | Retire or justify experimental artwork mode. | Keep existing acceleration; remove/relabel the default-off slower experiment or prove exact-workload gains before promotion; no language/GPU speed claims by association. | Vemm | in_progress | Relabelled Experimental artwork and explicitly states no demonstrated performance benefit. Default-off, existing compositor/AVPlay and fallback remain unchanged; graphics-ui validates the new copy and persistence. Final exact-candidate verification outstanding. |
| REQ-MARK-01 | Make Skip Intro and Skip Credits work visibly. | Trace real metadata to focused remote prompt and seek/next action; regress no-marker/boundary/repeated-key/seek/resume/queue cases; prove behavior with synthetic media on named TVs, not only pure helper tests. | Vemm | in_progress | Observed failing DOM regression: Intro disappeared after the transport's five-second timeout. Fixed prompt lifetime; player-layout-ui, skip-markers and product-ui pass. Named-TV synthetic acceptance remains open. |
| REQ-WATCH-01 | Make watched/unwatched actions discoverable and correct. | Movie/show/season/episode actions are D-pad reachable with explicit scope/confirmation; disposable-account write/read-back updates the correct item and relevant views; cancel/failure never looks successful. | Vemm | in_progress | Observed failing regression: HTTP success plus unchanged read-back claimed success. Confirmation now checks selected identity, type and leaf/aggregate watched state; unchanged state remains an explicit error. watch-readback-ui covers movie/episode/show/season, repeated OK and resume clearing; disposable-backend/native acceptance outstanding. |
| REQ-WEB-01 | Investigate Plex Web interoperability and implement findings. | Identify the exact observed Plex Web version/source and lawful observation method; compare relevant metadata, markers, watched state, queues, tracks, quality, lifecycle and recovery; turn findings into independently implemented protocol fixtures/regressions and Vemm behavior. No proprietary-code copying, DRM/auth bypass or household-account writes. Missing access/evidence remains explicit. | Vemm | in_progress | docs/pms-api.md records actual public Web 4.163.0 asset integrity and isolated synthetic startup observations, separating static/request/fixture evidence. Independent marker/queue/ABR protocol fixtures and watched read-back/adaptive implementations trace findings to behavior. Authenticated disposable playback/track/lifecycle comparison remains open; no proprietary implementation or household state used. |
| REQ-REVIEW-01 | Adversarially review baseline and final delivery. | Independent review maps the entire approved scope to code, behavior and evidence; material findings are corrected or genuinely blocked; final review evaluates the exact new candidate, not the old baseline. | Vemm | in_progress | Frozen-baseline rubber-duck review fccb26ab-825d-42d8-b6be-dbd64f75d8d7: REVISE. Material gaps: Home limited to 12 items; fixed quality only; missing Web observation/implementation evidence and feasibility deliveries; version mismatch. Existing skip/watch/account host paths are real, not native acceptance. Final-candidate review outstanding. |
| REQ-REL-01 | Prepare a reproducible Vemm 0.2.0 candidate. | Version/app metadata agree; committed clean source passes focused regressions, full Samsung host checks, ES5/M47 checks, unsigned SDK build and source/package inventory; preserve identity, notices and complete-source availability. No publication is implied. | Vemm | pending | |
| REQ-DEPLOY-01 | Deploy and verify 0.2.0 on every available known TV. | Fresh scan and live identity match select all available saved TVs; existing-author signed updates succeed without Vemm uninstall; read back exact installed 0.2.0 on each; execute appropriate native feature acceptance and preserve receipts privately. Do not call the overall program complete while other requirements remain unmet. | Vemm | pending | |

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

## Handoff

Next: continue this same ledger in the Vemm product-backlog session and begin
the functional fixes, incorporating the independent baseline review. Resolve
the reported skip/watched-state journeys first while keeping all other
requirements active. Investigate Plex Web behavior as interoperability work,
not as a source-code copying exercise.

Failed approaches: branding-only delivery, interpreting research as implemented
features, treating old host receipts as current TV acceptance, and repeatedly
retrying legacy-app removal after supported commands failed. Do not repeat them.

Verify: confirm canonical `dragoshont/vemm`, the intended isolated branch and
this committed ledger; read `AGENTS.md` and the governing client/product/design
contracts. Use focused `tests/tizen` regressions while iterating, then
`tools/tizen/test.sh` and `tools/tizen/build-source.sh samsung/Vemm` on the
committed clean candidate. Before deployment load the installed Tizen skill,
verify existing private signing/target coverage and use the Samsung lane.
Retain source/package hashes and actual per-target installed-version/native
acceptance. No adopted Architrave config or gate runner existed at intake;
do not invent one as a prerequisite to product work.
