# EarnTime 2.6.0

## Whole-Day Screen-Time Access & Categorized Initial Balance/Debt Evaluation

**You asked, we built it.**
* **Whole-Day History Access on Install & Turn-On**: Setup now explicitly requests permission for your **whole screen-time history of the day**. When setup finishes or when the extension is turned on / screen-time access is granted, EarnTime inspects your entire browsing history since local midnight (`00:00`).
* **Initial Screen Time or Debt Mode Based on Your Websites**:
  * Prior visits to **productive websites** earn screen-time credit at your earn ratio (e.g. 60:5), giving you an earned initial screen-time cushion.
  * Prior visits to **unproductive websites** consume your starting balance. If unproductive time exceeds your starting balance, EarnTime immediately places you into **Debt Mode** (`DEBT` badge, blocking unproductive and unlisted sites until repaid through study).
  * Prior visits to **half-productive websites** (e.g. YouTube) without a verified study mode are charged as unproductive (fail closed).
  * **Neutral/unlisted websites** are tracked in screen-time analytics without incurring charges or debt.
* **Seamless Re-enabling**: When browser starts up or when the extension is enabled after being off, unmonitored browsing since midnight or since the last checkpoint is evaluated against your website lists.
* **Updated UI & Setup Wizard**: Step 4 of the setup wizard and Settings → Analytics now clearly describe whole-day history access and explain how prior browsing today initializes your spendable screen time or debt.

## Implementation details

* Added `startOfLocalDay` helper in `source/src/core/time.ts` to compute midnight epoch ms in the user's local timezone.
* Added `reconcileDayHistory` in `source/src/background/controller.ts` which runs on `setup.complete`, `onStartup`, `onInstalled`, and when granting screen-time access (`ui.screenTimeAccess` / `ui.reconcileNow`).
* Updated setup wizard text in `source/src/ui/setup/Setup.tsx` and settings analytics in `source/src/ui/settings/Settings.tsx`.
* Unit and simulation tests added in `source/test/unit/time.test.ts` and `source/test/sim/flows.test.ts` verifying whole-day history evaluation, debt mode entry from prior unproductive browsing, and credit earned from prior study.
* Total test suite: 242 tests passing (136 unit, 58 DOM, 48 sim).

## Verification

`npm run build`, `npm run typecheck`, `npm run test:unit`, `npm run test:dom`, and `npm run test:sim` all pass on this checkout.

# EarnTime 2.5.0

## Collaboration (Collab) + Shorts — YouTube Productive Mode now handles every channel

**You asked, we built it.**
* YouTube's native **Collaboration** feature (late 2025, up to 10 credited channels per video, each with Subscribe button below the player) was unreadable — `readChannelName()` returned only the first `ytd-channel-name` and collab videos were always `Channel not verified`. EarnTime now **reads every visible channel name** — primary + every collaborator via the `Collaboration channels` container, `avatarStack`, `yt-content-metadata-view-model` and `yt-reel-channel-bar-view-model`, plus modern watch metadata — and **allows the video if ANY collaborator matches** your study keywords (substring, case-insensitive, NFKC). Concatenated titles like `"A and B"` / `"A • B"` are split so each name is checked. `anyChannelAllowed()` / `matchingChannels()` helpers are unit-tested.
* **Trust-based fallback for Collab** (as requested): if a Collaboration is detected (`aria-label="Collaboration channels"` / `yt-avatar-stack-view-model` / `and 2 more` truncation) but **no name can be parsed** — e.g. truncated DOM or an unseen YouTube layout — the video is **allowed on trust** instead of failing closed. A dismissible `Collaboration — not fully verified (trust-based)` cover explains `Continue (trust)` and is remembered for that page. The same applies to the `and 2 more` truncation. Browsing a channel/playlist whose header is a collab stays open; only playback is gated.
* **Shorts are now mode-aware** (as requested): in **Productive Mode** a Short (`/shorts/<id>` or the active `ytd-reel-video-renderer[is-active]`) is allowed only when its channel — or any collaborator — matches your keywords, using `getShortsChannelNames()` (`ytd-reel-player-overlay-renderer`, `yt-reel-channel-bar-view-model`, `#shorts-player`, `ytd-shorts`). A non-study or unreadable Short is covered with `Shorts are off` and paused. The channel's **Shorts tab** (`/@handle/shorts`) stays browsable as a grid; the cover appears only when a non-study Short actually starts playing, with `Keep browsing` to stay on the tab. In **Unproductive Mode** (no YouTube filter) Shorts play unrestricted — "considering modes". Shorts shelves on Home/Search remain hidden and not charged/credited when covered.

## Shorts & Collab implementation details

* New: `readAllChannelNames()`, `isCollaborationDetected()`, `getWatchChannelNames()`, `getShortsChannelNames()`, `getBrowsingChannelNames()` (splits `and/&/+/·/•`), expanded `WATCH_CHANNEL_SELECTORS`, new `SHORTS_CHANNEL_SELECTORS` + `COLLAB_CHANNEL_SELECTORS`, `extractChannelNamesFromJson()` fallback for truncated `"and X more"`.
* Trust cover reports `health: { ok: true, detail: 'collab-trust' }` (counts as productive once continued) vs `detail: 'covered'` for intentional blocks.
* Updated `docs/KNOWN_LIMITATIONS.md` (§4) and `README.md` YouTube Productive Mode bullet to document collab/shorts and trust.
* Tests: +11 DOM tests (collab watch, collab shorts, channel shorts tab, trust fallback, `readAllChannelNames`) +2 unit tests (`anyChannelAllowed`, `matchingChannels`) — total 58 DOM + 136 unit + 45 sim = 239. All green.

## Verification

`npm run typecheck` + `npm run test:unit` + `npm run test:dom` + `npm run test:sim` all pass on this checkout. `npm run build` regenerates `content.js`/`background.js`/...

# EarnTime 2.4.3

## Chrome-installed web apps and window shortcuts now count

EarnTime previously requested only normal Chrome windows, so a site opened through an installed web app or an **Open as window** shortcut could be missed. It now includes Chrome's popup and app window types when looking for the focused window. The same site rules, earning, spending, blocking and per-site screen-time accounting apply to the active page in those windows.

Only the focused, non-minimised window counts. Idle/locked time, background tabs, devtools and unrelated applications still do not count. The app must be visible to EarnTime in the same Chrome profile; other browsers or profiles are outside the extension's reach. No new permissions are needed.

## Verification

`npm test` passes 226 tests (134 unit, 47 DOM, 45 simulated-browser flows), including app and popup window focus, worker restart, idle and devtools exclusion. The real-Chrome checklist is in `docs/TESTING.md`; it was not run here because no Chrome/Chromium binary is installed.
