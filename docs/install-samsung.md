# Install Vemm for Samsung Tizen

**No Vemm package has been released.** The
[canonical releases page](https://github.com/dragoshont/vemm/releases) is the
only Vemm release source. There is no current Vemm download or Samsung Store
listing; source readiness is not signed-package or TV acceptance.

Vemm is a **separate install**, with package `VemmTvApp0`, application
`VemmTvApp0.Vemm` and `vemm-tizen-*` local data. It does not update, uninstall
or import credentials/preferences from the historical Plx app. You must link
Plex again. Preserve an existing app and its author certificate; do not
uninstall it to work around a signing-author mismatch.

## Build the current source

Developers can use the [source/build guide](building.md) and
[Samsung development guide](samsung-getting-started.md). Host checks and an
unsigned SDK build do not create an installable release. Signing, certificate
access, installation and launch require the owner's authorization for an exact
TV. Keep certificates, DUIDs, account tokens and server locations private.

Vemm uses public Tizen Web APIs and Samsung AVPlay; no root is required.
The manifest requires Tizen 3.0, but that is not a compatibility promise for
every TV or media format. Existing model-specific observations concern earlier
builds; consult the [readiness register](samsung-upstream-readiness.md) and
[named-device evidence](samsung-graphics-device-matrix.md). A future Vemm release
must publish its own accepted models, firmware and limitations.

## When a Vemm package is published

Use only the exact versioned Vemm asset and its matching complete-source archive
and checksums from the canonical release. Follow that release's reviewed
instructions and the current
[Tizen TV Builder documentation](https://github.com/dragoshont/tizen-tv-builder).
The toolkit is separate software; its installed plugin and current checkout may
offer different commands. Do not substitute a historical package or use an
unverified download URL.

Developer installation needs Samsung Developer Mode, an authorized target and
the appropriate author/distributor signing profile. Retain the Vemm author for
future Vemm updates. An SDK acknowledgement or app-list entry is not proof of
installed version, successful playback or Samsung Store approval.

## Historical Plx users

The [historical Plx 0.2.7 installation guide](install-samsung-historical.md)
retains the old package URL, identity and update cautions. Those assets are not
Vemm and do not establish Vemm compatibility.

Report Vemm problems to
[dragoshont/vemm Issues](https://github.com/dragoshont/vemm/issues), with the
source/release and model/runtime, using synthetic or redacted evidence.
For sensitive reports, follow the [security policy](../SECURITY.md).
