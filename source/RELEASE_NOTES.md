# EarnTime 2.6.2

## YouTube Shorts search and playback fixes

- **Shorts show up in search again.** Classic and modern Shorts shelves, cards and links stay visible in search results and on channel pages.
- **Allowed Shorts have a visible player.** The homepage-only hiding rules no longer hide the Shorts player or its reel after playback is allowed. Cached content is restored on navigation, mode changes and extension shutdown, while preserving YouTube's own display settings.
- **Modes still apply.** In Productive Mode, the active Short's channel or a credited collaborator must match a study keyword. Non-study or unreadable Shorts are covered and paused. In Unproductive Mode, Shorts remain unrestricted.
- Only the active reel can qualify playback; prefetched study Shorts cannot authorise a different non-study Short. Active-reel and author-text changes trigger fresh checks, and collaboration trust is reset for a new reel.
- Returning in an existing Productive Mode session no longer crashes when the content script starts before the page's HTML exists. Blocking-card buttons remain clickable after the load-time gate opens.
- Existing settings, balances, history-source preferences and debt accounting are preserved.

## Verification

Strict TypeScript checking, **272 source tests** (144 unit, 73 DOM, 55 simulated-browser), **15 Chromium fixture/browser tests**, and the production build pass. Browser fixtures verify visible video frames, non-study playback pausing, mode changes and clickable blocking-card actions. Live YouTube and a real installed Chrome extension still require manual verification; see `docs/TESTING.md`.

## Install or update

Download **EarnTime-2.6.2.zip**, extract it, and select the folder containing `manifest.json` via Chrome's **Load unpacked** option.

For an existing unpacked installation, replace its files with the extracted release, click **Reload** for EarnTime at `chrome://extensions`, then refresh existing YouTube tabs so they load the updated content script. **Do not uninstall** if you want to keep your settings and balance.
