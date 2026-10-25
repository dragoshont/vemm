# Vemm for Samsung Tizen

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users and purpose

A Samsung TV owner browsing and playing personal and shared Plex Media Server libraries from
the couch with a TV remote. Plex remains the authority for media identity, permissions, watch
state and progress. This is a full client in development, not a replacement media server.

## Operating context

The owner's TVs are a 2017 UE55MU6172, two 2019 UE43RU7092, a QE65Q80C and a 2025 QE55QN70F. The wider investigation includes
2018+ televisions and The Frame; those models are not certified by this device's results.
The app is an ES5 Tizen Web application with AVPlay. The former LG native tree
is available in history, not maintained as a second app here.
Host DOM tests use synthetic accounts, servers and AVPlay. Browser renders prove layout, not
Samsung decoding, HDR, performance or panel output.

## Capabilities and constraints

Keep sign-in/QR renewal, profiles, server discovery, Home, libraries, search, details, people,
music/photos, Watchlist/catalogue, DVR, playback, settings and explicit confirmations available.
Preserve remote focus and Back behavior, bounded image/metadata retention and lifecycle cleanup.
Do not initiate playback or account writes merely to display or inspect a screen.
Do not add private APIs or unsupported playback claims to make the interface seem complete.
Licensed catalogue streaming and verified live tuning remain acceptance gaps.

Video playlists are server-backed: browse existing playlists, play/shuffle them,
page their items, and explicitly confirm moving an entry to the beginning.
Playback's More menu provides previous/next video, shuffle and repeat; queue
transitions preserve entry identity and marker/chapter metadata without creating
another queue. Metadata or cleanup failures remain visible and retryable.
Movie/episode/clip More offers a paged standard-playlist picker. Adding a video
or removing its exact saved entry requires item/playlist confirmation and
complete bounded identity/order read-back, not HTTP success alone. Duplicate
media entries remain distinct. Smart playlists do not expose manual item edits.
Create a named standard playlist from the selected video through that picker,
or create an empty playlist from Video playlists.
Playlist details > More provides confirmed rename and deletion, with a fresh
identity/title check and independent read-back. Deletion removes the playlist,
not its media. Pending confirmations own the actual source server; leaving
preflight prevents a late write even when another server is globally selected.
Cancel restores the opening field/control and expanded More state. Changes
invalidate retained metadata so Back cannot reuse an old name or deleted card.
Smart video-playlist details > More > Edit smart rules loads the saved content
URI and fresh server-advertised fields/operators/sorts. Remote forms preserve
supported nested all/any groups, ordered sorts and a result limit. Rule changes
require named confirmation, unchanged-title/content preflight and independent
equivalent-rule read-back; HTTP success alone is not confirmation. Unsupported,
unknown or over-limit rules stop editing rather than being silently removed.
No arbitrary network/filter URI can be pasted, and artwork is not rule data.
Synthetic host coverage does not establish live-PMS or Samsung-native acceptance.

DVR scheduling offers fresh storage locations within the chosen library, or an
explicit Plex-default choice when none are advertised; it never picks a hidden
default or creates a recording while browsing. Scheduled recordings link to
confirmed manual priority management with complete bounded order read-back.
Changing priority is not a claim that Plex resolved a tuner conflict. Existing
subscription cancellation/preferences remain explicit; actual scheduling,
comprehensive conflicts and tuner allocation/lifecycle still need acceptance.

## Brand commitments

Vemm (`/vem/`) is the working product brand and **Your media. At its best.** is
the working tagline. Keep the existing cinematic, remote-first layout as the
product reference. Blue Calm uses quiet navy surfaces and mist/pale-blue
focus, selection and progress cues rather than mass-redesigning every screen.
Keep controls text-first and avoid decorative iconography; retain compact
transport glyphs only where visible text would harm playback operation.
Do not borrow Plex, Samsung, Microsoft or upstream PlxNative branding or imply
endorsement. Vemm is a separate install and must not read/migrate historical
Plx credentials or settings.

## Evidence

The historical LG images/components remain at the immutable
[pre-migration source](https://github.com/dragoshont/plx-native/tree/f74610c8e8fda765245f548adcc6565becdca31b).
They are not current Samsung assets or build dependencies. Samsung implementation and acceptance truth
live in `docs/samsung-tizen-client-spec.md` and the Samsung feasibility/test register.

## Accessibility

Remote-first operation, visible focus, couch-legible text, visible labels for
ordinary controls, accessible names for compact playback glyphs,
English/Spanish/Belarusian copy and scrollable long content. Focus must not
imply selection or permission, and unavailable actions must remain explicitly
disabled or explained.
