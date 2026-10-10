# EarnTime 2.4.2

## YouTube Productive Mode: browse every channel and playlist; check at play time

Channel and playlist pages were covered whenever their owning channel name did not match a keyword — including the very common case where EarnTime could not read the owner at all, which closed **every** playlist. Those pages are now always browsable: the channel rule is applied to playback, which is the moment it can actually be trusted.

- Every channel and playlist page stays open whatever its owner is. No channel name is read to decide whether a page may be seen, so an unreadable owner no longer blocks anything.
- The check moves to the moment media starts playing. On a channel or playlist page the owner is read then (the video's own owner first, the page's owner as fallback); non-matching or unreadable playback is refused, explained and paused.
- That cover offers **Keep browsing**, so the refusal never locks the page — and starting playback again is checked again. A refusal belongs to its page: moving on to another channel or playlist opens it.
- A playlist title still cannot qualify an unrelated owner, and a video opened from any channel or playlist is still checked against its own channel on the watch page. Shorts, subscriptions, the homepage feed and other unsupported sections are unchanged.
- Settings, the setup wizard, the user guide, the README and the known-limitations list now describe the play-time rule.

## Verification

`npm test` passes **223 tests**: 134 unit, 47 jsdom DOM and 42 simulated-browser flow tests, plus the strict TypeScript check. New DOM coverage: a non-matching channel page browsable with only its playback refused, `Keep browsing` clearing the refusal and playback being refused again, an unreadable channel name no longer blocking its page, a playlist whose owner cannot be read staying browsable, playlist titles still not qualifying an unrelated owner at play time, a refusal not leaking to the next channel page, and the homepage's hidden videos reappearing on arrival at a playlist. The Playwright suite and real-Chrome checklist were not run because this environment has no Chromium binary.
