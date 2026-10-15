# Vemm repository and release migration plan

The canonical source is now maintained in
[`dragoshont/vemm`](https://github.com/dragoshont/vemm). A live GitHub read on
2026-10-15 confirmed that it is populated, non-fork, unarchived and has Issues
enabled; it has no published releases. The predecessor
[`dragoshont/plx-native`](https://github.com/dragoshont/plx-native) is archived
and remains a fork, preserving its review, history and historical releases.
This document does not authorize a package release, signing or device access.

## Source transition

The source transition established:

- Vemm in current source, docs and future release presentation;
- a separate Vemm package, storage and build identity;
- accurate historical Plx release names and links;
- original brand assets and tests;
- improvements to existing architecture seams.

## Approved technical identity

Vemm is a separate application:

- package `VemmTvApp0`;
- application `VemmTvApp0.Vemm`;
- source path `samsung/Vemm/`;
- storage/device keys `vemm-tizen-*`;
- artifacts `Vemm-X.Y.Z.wgt`;
- complete source `Vemm-source-<sha>.zip`;
- tags `vX.Y.Z`;
- environment/config/profile names `VEMM_*`, `~/.config/vemm/` and
  `vemm-build`.

There is no automatic import of old credentials or preferences. The historical
Plx application remains a separate install.

## Repository preservation

Canonical population is complete, not a pending source task. For any future
repository rename or fork-network change:

1. Re-audit live fork status, redirects, release/download URLs, Actions,
   issues/PRs, security reporting, source offers and external links.
2. Keep Vemm changes reviewable in the canonical repository. Do not
   delete/recreate either repository to simulate detachment.
3. Preserve all tags, releases, assets, checksums, issues, PR metadata and Git
   history.
4. Update source/documentation links only after the provider operation and
   verify redirects plus release downloads.
5. Announce the migration separately from an application release.

Domain registration, trademark filing, repository ownership transfer and fork
detachment require explicit human decisions outside this source change.

## Separately approved application release

A future first Vemm Samsung release must:

1. use a new immutable `vX.Y.Z` tag;
2. use `VemmTvApp0` / `VemmTvApp0.Vemm` and establish a Vemm author certificate
   that is retained for later Vemm updates;
3. publish `Vemm-X.Y.Z.wgt` and `Vemm-source-<sha>.zip`;
4. include matching complete source, checksums, GPL/notices and build guidance;
5. pass exact-candidate host CI and named-model update/launch/playback checks;
6. verify the new Vemm install and preserve any historical Plx installation;
7. distinguish source readiness, signed package verification, developer
   installation and Samsung Store approval.

Source integration does not satisfy the release gate. No release is authorized
until human review accepts the exact Vemm candidate and separate device/release
authorization is granted. See the [current installation status](../install-samsung.md).
