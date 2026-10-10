# EarnTime 2.4.1

## YouTube Productive Mode: browse productive channels and playlists

Productive Mode no longer blocks a channel or playlist page just because it is not a search or watch page. You can now open and browse a channel or playlist without starting a video when its owning channel name matches one of your YouTube keywords.

- Channel and playlist owners are checked as soon as YouTube renders their name. An unverified or non-matching owner remains covered (fail closed).
- Playlist titles do not bypass the channel rule: the playlist's owner must match.
- Videos are still checked against the video creator when opened/played, including navigation from an allowed channel or playlist.
- Shorts, subscriptions, the homepage feed and other unsupported sections remain unavailable in Productive Mode.
- The YouTube settings and setup guidance now explain the channel/playlist rule.

## Verification

`npm test` passes **219 tests**: 134 unit, 43 jsdom DOM and 42 simulated-browser flow tests, plus the strict TypeScript check. Regression coverage includes productive and non-matching channel pages, playlist browsing without playback, unreadable owners, SPA navigation from an allowed channel to a non-matching video, and keeping playlist titles from qualifying an unrelated owner. The Playwright suite and real-Chrome checklist were not run because this environment has no Chromium binary.
