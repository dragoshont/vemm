# Vemm requirements

## Requirements

| ID | Requirement | Acceptance | Owner | Status | Evidence | Review |
|---|---|---|---|---|---|---|
| REQ-1 | Propose evidence-grounded visual improvements to the Account and Playback options menus in switchable English and Romanian HTML previews; use Figma only if it adds value | At 1280x720 and 569x777, previews show readable grouped actions, remote-first focus, and no clipped drawer/panel/footer; English and Romanian switches work; all source actions and conditional states are accurately represented; drill-ins alone use chevrons; shipped product code remains untouched | dragoshont | accepted | Owner requests `8201c27e-475f-4ade-a9ea-cccf3497adc5`, `6c3dcbd1-ad9f-4459-b17d-0c83bd3541c4`, and `f9442a34-7f2c-4955-b919-39a51be736fa`; menu sources `samsung/Vemm/main.js` and `samsung/Vemm/css/style.css`; local guidance `samsung/DESIGN.md`, `samsung/PRODUCT.md`, and `docs/samsung-tizen-client-spec.md`; official references: [Samsung Smart TV Design Principles](https://developer.samsung.com/smarttv/design/design-principles.html), [Samsung UX Checklist](https://developer.samsung.com/smarttv/design/ux-checklist.html), [Plex for Apple TV settings](https://support.plex.tv/articles/settings-plex-for-apple-tv/), and [Plex Apple TV Experience Preview notes](https://forums.plex.tv/t/release-notes-for-plex-experience-preview-apple-tv/903004). Browser observations: Account at 1280x720 bounds x=51..531/y=96..700, action list scrolls 51px, last focused row is visible, footer stays inside drawer; at 569x777 bounds x=23..503/y=96..757 with all rows/footer visible and no document overflow. Playback was exercised at both sizes in video/music and external-subtitle on/off states: subtitle timing is cue-gated, music rows are track-gated, long states scroll with an indicator, and the source note/panel/footer remain in bounds. Stop focus computes to #0f2747 on #d6e6f5. Six final screenshots at both sizes and video/music states were independently inspected. Plex settings article text was not verified (consent-only retrieval), the original owner screenshot was unavailable, and no physical Samsung hardware was tested. No shipped app files changed. | review: 5f975a84-10e9-45f7-9e40-073b8464379a PASS |

## Corrections

| ID | Type | Target | Change |
|---|---|---|---|
| C-01 | revise | REQ-1 | Owner, 2026-11-03: "but propose improbvements" — present the design direction as a proposal before changing the shipped menu |
| C-02 | revise | REQ-1 | Owner, 2026-11-03: "this one as well" with a second attached menu image — include the Playback options menu alongside the Account drawer |
| C-03 | revise | REQ-1 | Owner: "plese do not invent yourself. get some guidance from the og samsung tizen guiidance alls, apple tv polex app...be creative" — ground interaction patterns in official Samsung TV guidance and documented Plex Apple TV patterns; do not imply unsupported Vemm actions |
| C-04 | revise | REQ-1 | Owner: "aand also makseure ismultilanguiange, at least ormaninain abnd english" — provide a working English/Romanian preview switch in both HTML proposals |
| C-05 | revise | REQ-1 | Owner-provided review verdict: REVISE — correct the Account preview's Romanian clipping, preserve conditional/source-accurate actions and focus contrast, avoid false drill-in chevrons, and keep TV-sized text/help readable |
| C-06 | add | REQ-2, REQ-3 | Owner: "i accept", "deploy", "please stop getting blocked" — implement the approved bilingual menus and prepare deployment; exact TV target remains unspecified |
| C-07 | revise | REQ-3 | Owner: "all tvs that are on" — discover and target awake Samsung TVs; do not wake, reboot or operate on unrelated devices |
| C-08 | revise | REQ-3 | Owner requested another connection attempt, then commit, push, rebuild and stop if it still failed. The bounded retry again discovered both Samsung models but established no SDB connection. Deployment is deferred; no further device work is scheduled. |

## Implementation requirements

| ID | Requirement | Acceptance | Owner | Status | Evidence | Review |
|---|---|---|---|---|---|---|
| REQ-2 | Implement the approved grouped Account and Playback options menus in the shipped app, including English and Romanian menu copy | Preserve source actions and availability conditions, distinguish drill-ins from immediate actions, keep focus contained and restore it on Back, scroll long lists with visible position, preserve readable Blue Calm styling and ES5 compatibility; host tests and unsigned build pass | dragoshont | claimed | Approved session HTML proposals; production-DOM desktop renders in English/Romanian at 1280x720 and 1920x1080; linked-account and music scrolling checked at 1280x720 after the final nowrap correction; targeted regressions, full host suite and unsigned source build passed. Romanian is explicitly menu-only, with English fallback elsewhere | Independent read-only implementation review `6485efab-176f-49cb-87b2-faf49c67c874`: PASS; no high-confidence meaningful bugs or unmet REQ-2 criteria. Source readiness only, not physical-TV acceptance |
| REQ-3 | Install and launch the updated Vemm on all owner's Samsung TVs that are currently on and reachable | Discover awake Samsung targets without waking/rebooting others; confirm exact models/serials and exclusive Samsung lanes; preserve the Vemm update author; install and launch on each reachable authorized target; distinguish device results from host checks; no Plex viewing-state writes | dragoshont | blocked | Latest owner-requested retry discovered QE55QN70FAUXXH and QE65Q80CATXXH with reachable developer ports; SDB connection failed for both again. No install or launch occurred. Owner selected commit/push/rebuild-and-stop fallback. Tizen CLI 2.5.25, SDB 4.2.36; firmware/runtime remain unverified | not accepted on hardware |

## Handoff

Next: Commit and push the source implementation, run the final host gate and unsigned source build on that commit, then stop as directed. Deployment needs a separate resumed attempt after developer connectivity is restored.
Failed approaches: Bounded Samsung discovery found awake targets, but repeated SDB connections failed; no device mutation was attempted.
Verify: The proposal evidence remains historical. Current production evidence covers synthetic host journeys and desktop-rendered production DOM/CSS, not Samsung hardware acceptance, signing, install/update or physical remote operation.
