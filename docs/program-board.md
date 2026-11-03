# Program board: bilingual menus

## Scope

**REQ-1 (original proposal phase):** Finish the Account and Playback options HTML proposals in English and Romanian. That phase was proposal-only. The accepted implementation and deployment follow-up is recorded below.

**Owner/session:** dragoshont / `a3b58acc-3f03-4da1-8817-2524eef782bd`

## Sources and candidate dispositions

| Candidate | Disposition | Evidence needed |
|---|---|---|
| `files/account-menu-proposal.html` | In scope; fix responsive overflow and verify both languages | Browser geometry, footer visibility, remote-focus behavior |
| `files/playback-menu-proposal.html` | In scope; verify conditional actions, translations, scrolling, focus | Browser state observations in video/music and subtitle-cue conditions |
| `SPEC.md` | In scope; record corrections, evidence, and final review | Requirement and correction rows |
| `docs/program-board.md` | Workflow record; retained to preserve this task's scope, candidate inventory, and review outcome | Scoped board read before implementation and updated with final evidence |
| `.playwright-mcp/*-ro.png` | Temporary rendered evidence; not a product deliverable and removed after independent inspection | Six screenshots inspected by the independent reviewer |
| `samsung/Vemm/main.js`, `samsung/Vemm/css/style.css`, `samsung/DESIGN.md`, `samsung/PRODUCT.md`, `docs/samsung-tizen-client-spec.md` | Read-only product truth and design references; not candidates for modification | Source-action/condition comparison |

## Work and review

| Lane | Requirement | Owner | Status | Outcome |
|---|---|---|---|---|
| Proposal verification and correction | REQ-1 | Current session | Done | Account drawer bounds/footer and focus-driven list scrolling were checked at 1280x720 and 569x777. Playback's video/music and external-subtitle combinations were exercised at both sizes; source-note/panel/footer geometry and list scrolling were checked. Six final PNG renders were inspected. The design detector returned no findings; no shipped product files changed. |
| Independent delivery review | REQ-1 | `5f975a84-10e9-45f7-9e40-073b8464379a` | Done | PASS; reviewer independently inspected all six renders, confirmed no Blocker/Major findings and no uncovered acceptance criteria. Original owner screenshot, Plex settings article contents, and physical Samsung behavior remain unverified and are not claimed. |

## Boundaries

The original proposal task did not authorize product or device changes. The owner
subsequently accepted the proposals and requested deployment to "all tvs that are on".

## Approved implementation and deployment follow-up

REQ-2 implements the approved Account/Playback grouping, readable focus, truthful
chevrons, fixed help and internal scrolling, with English and Romanian menu copy.
Existing Spanish/Belarusian support remains; Settings explicitly labels Romanian
as menu-only coverage. No playback capability or account-write behavior is added.

REQ-3 targets currently awake Samsung TVs only. Bounded Samsung discovery found
QE55QN70FAUXXH and QE65Q80CATXXH; both developer TCP ports were reachable, but SDB
reported "failed to connect to remote target" for each. No package was installed
or launched, no TV was woken/rebooted, and no Plex state was written. Firmware and
current runtime remain unverified. The owner's requested fresh discovery/connection
retry produced the same SDB failures. The owner selected the commit/push/rebuild
fallback and directed work to stop; no further device work is scheduled.

Host checks and an unsigned SDK build passed on the uncommitted implementation.
Desktop renders use existing synthetic host journeys and the actual production
DOM/CSS, not Samsung hardware. The owner explicitly authorized committing and
pushing this implementation, followed by another build and stopping. No release
or published signed package is authorized.

Independent read-only implementation review
`6485efab-176f-49cb-87b2-faf49c67c874` returned PASS for REQ-2: no
high-confidence meaningful bugs or unmet source acceptance criteria. The review
supports source readiness only; REQ-3 remains deferred, not deployed.
