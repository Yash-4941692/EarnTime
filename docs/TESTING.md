# Test report

**Status: source logic, simulated flows and jsdom tests verified on 2026-10-31; build passed.** The current Playwright/Chromium suite and the manual checklist with an installed Chrome extension and live YouTube have not been run because no Chromium binary is available.

> `cd source && npm test` passes **294 tests**: 157 unit + 79 jsdom DOM + 58 simulated-browser flow tests, plus the strict TypeScript check. The current separate Playwright/Chromium suite was not run. These browser fixtures run the built content script and real controller, not a real Chrome extension installation.

## Environment

- Debian 12 sandbox, Node 22.22.3, npm 10.9.8, 2 CPU, no display.
- Tests run with `TZ=Asia/Kolkata`. The simulated clock starts at 2026-10-08 09:00 local.
- Browser tests use `playwright-core` with Chromium 153.0.8010.0, supplied temporarily via `@sparticuz/chromium` in the ignored test-output directory. The binary and its libraries are not extension dependencies or release assets. Set `CHROME_PATH` to your own compatible binary when reproducing the tests.
- Build and source: TypeScript 5.9 (strict), esbuild 0.25, React 18.3, Tailwind 3.4.

## Results

| Suite | Command | Result |
| --- | --- | --- |
| Type check (strict, `noUnusedLocals`) | `npm run typecheck` | **pass** |
| Build (root artifacts) | `npm run build` | **pass** |
| Unit tests | `npm run test:unit` | **157 / 157 pass** |
| DOM tests (jsdom: load-time gate, page lifecycle, YouTube filter, Shorts trust) | `npm run test:dom` | **79 / 79 pass** |
| Flow tests (simulated browser) | `npm run test:sim` | **58 / 58 pass** |
| Complete source suite | `npm test` | **294 / 294 pass**, including type check |
| Browser tests (Playwright + Chromium) | `npm run test:browser` | **not run for this change** (needs a Chromium binary) |
| Real Chrome extension end-to-end | manual checklist below | **not run** |

The release build is verified separately with `npm run build`; browser-specific behaviours still need a real Chrome profile before relying on them.

## What each suite covers

### Unit tests (`source/test/unit`, 157)

- **Host handling:** input normalisation, subdomain matching, most-specific entry wins, strictest list wins on ties, and list de-duplication.
- **Time and accounting:** local day keys, splitting at midnight, formatting, the 60:5 earning example, unproductive spending, idle/background/internal pages, audible media, clock changes, checkpoints, and reconciliation boundaries.
- **Half-productive roles:** mode selection and YouTube-only filter selection; pending or failed YouTube filters fail closed. An intentional `covered` YouTube state is distinct from failure and neither earns nor spends time.
- **Half-time estimates:** a history stretch on a half-productive host is split half study / half unproductive; the study half credits at the current ratio, the other half charges (spending the balance first and creating debt past it), and closed intervals never produce a question. Repeated visits to one host merge into a single question with per-day parts, stretches under a minute are not questioned, at most 20 questions are kept (unanswered first), and a verified mode before the interruption keeps its own charge instead of being estimated.
- **Answering an estimate:** `review.set` is free (the unlock cost is untouched), validated against the estimate (unknown id → `not-found`; an answer above the estimate → `invalid` with no side effect), re-prices the same local days, and updates balance, debt and the day totals in both directions; `review.keep` accepts the default and changes nothing. Corrections pay debt before the balance when they add credit, take the balance before creating debt when they remove it, and are audited with a `review` ledger entry that is exposed (minutes estimated, answer, credited and charged) in the audit export.
- **Schema 8:** the adult-site guard is fixed and always on; upgrading from schema 7 drops the former user-editable enable/domain/exception preferences while preserving the wallet, rules, reviews and `historyGranted`.
- **Migration:** old storage formats and sanitisation, plus a realistic v2.1.1 state fixture proving balance, debt, daily totals, ledger, tasks, settings and non-retired site rules survive schema-3 migration. The retired integration settings/state and its old default half-list entry are removed.
- **Protection and commands:** setup-once validation, starting-balance cap, free versus paid rule changes, confirmation before a paid change, debt restrictions, task rules, keyword matching, the fixed hostname-only adult-site policy, rejection of legacy adult-site edit commands, and audit export without page URLs.
- **Worker message retry:** bounded retry timing, explicit refusal, eventual success when the worker starts late, and repeated asking (last pause held) until the budget runs out.
- **Screen-time accounting:** per-site recording inside `chargeSlice` (present roles only, covered and mode-pending time counted but unbilled), the `MAX_DAY_HOSTS` eviction order, `screenMs >= estimatedScreenMs` sanitising, day pruning, and the `historyGranted` migration rule (a pre-schema-5 state keeps access; a fresh install does not have it yet).
- **Analytics view model (`src/core/analytics.ts`):** today's totals, per-site grouping and `www` collapsing, "other sites" roll-up, the 14-day trend with empty days marked, deltas against yesterday and the average, study share, and the `partlyEstimated` flag.
- **Worker-free page verdict (`src/content/local.ts`):** rule narrowing to the shared `DirectiveInput` shape, half-site chooser verdicts, productive/unproductive/neutral verdicts, the 30-second gate-cache TTL, the 100-entry cache limit, and cache read/write failure being non-fatal.
- **Invariants:** 25 seeded random sequences (200 steps each) keep balance and debt non-negative and conserve value; a ledger-size limit test.

### DOM tests (`source/test/dom`, 79)

**Load-time gate (`gate.test.ts`) and page lifecycle (`page.test.ts`)** run the real content-script code against jsdom with injected globals and a virtual clock:

- a half-productive page carries `data-et-gate="closed"` from `document_start` and its gate stylesheet is already in the DOM before the body exists;
- local rules alone produce the chooser with **zero** worker round-trips (the fix for the first-visit bypass);
- unreadable rules show "Checking this site…" immediately — no 300 ms grace — and the page never opens itself;
- the worker's answer replaces the local verdict, and a refusal keeps the page closed while showing the reason;
- only `isAlive() === false` (the watchdog) releases a page that cannot be classified;
- the persisted state is unreadable **and** the worker never answers ⇒ the page stays covered instead of being released;
- SPA/in-page URL changes re-ask within one watch tick, and a tab left abandoned is disposed.

**YouTube filter tests** exercise the real `src/content/youtube.ts` against jsdom YouTube fixture layouts:

- all search results stay visible, including classic and modern Shorts shelves, cards and links;
- channel and playlist pages stay open for browsing whatever their owner is, including an owner EarnTime cannot read, and videos the homepage had hidden are shown again on arrival;
- playback on a channel or playlist page whose owner is non-matching or unreadable is covered and paused, *Keep browsing* clears that cover, and pressing play again is refused again;
- a playback refusal belongs to its page (navigating to another channel opens it), and playlist titles alone cannot qualify an unrelated owner;
- navigating from a browsed channel to a non-matching video still closes that video;
- the homepage shows no videos; non-study Shorts, unsupported sections, and non-matching watch pages report deliberate covers;
- deliberate covers pause media where applicable and report a healthy `covered` status;
- matching watch pages remain usable while the related shelf stays hidden;
- an absent page layout waits through the grace period, then fails closed and reports unhealthy; a layout appearing during the grace period is not treated as failure;
- stopping the filter disconnects its observer, clears its cover and restores its own display overrides;
- a Shorts player remains visible through cached homepage navigation, author hydration and existing-session startup before `<html>` exists;
- only the active reel can qualify Shorts playback, and a new reel requires a new collaboration trust decision;
- an unreadable Short is no longer refused outright: the card shows `Shorts channel not verified` with `Continue (trust)`, the page pauses until the answer, continuing reports a healthy trust state, and the next reel asks again;
- the channel name is read from the channel bar, the link's `title`/`aria-label`, the page's own data for the video id in the address bar, or the channel handle before the trust card appears — while prefetched reels, cached search/watch authors and handles belonging to other reels stay invisible to the check.

### Flow tests on a simulated browser (`source/test/sim`, 58)

The simulator (`test/sim/fakeBrowser.ts`) exposes a Chrome-shaped object and runs the real Chrome adapter, event wiring and controller. Time is virtual. It models tabs and normal/popup/app/devtools windows, focus, minimise, idle with a 15-second detection interval, audible tabs, history, declarativeNetRequest rules, service-worker suspension and restart, extension disable and enable, browser restart, wall-clock changes, and incognito gating. It does not model Chrome's own internals.

Scenarios cover install and setup; 60:5 earning; spending; fixed adult-domain motivational redirects, neutral content and rejected legacy edit commands; background tabs, focus, idle and audible media; worker/browser restarts; interruption reconciliation and debt; extension-management confirmation plus one-time continuation; YouTube mode choice, intentional covers (no credit or charge), and actual filter failure (charged fail-closed); half-productive mode lifetimes; recurring tasks; legacy migration; clock changes; incognito; audit export; unlock quotes; tab replacement; and setup reopening.

The v2.4.0 scenarios add: gate-cache publication for half-classified tabs (first visit publishes `choose`, following a choice publishes `active`, leaving and returning republishes `choose`, non-half tabs publish nothing); per-site screen time for a whole foreground day including unbilled neutral time; idle time not counting as screen time; history-reconstructed gaps recorded as estimated screen time against the right site; no reconstruction and no invented sites when access is absent; granting and removing access through the worker route with a ledger line for each; a revoked permission being noticed on the next worker start; setup recording the access answer and the worker correcting it against Chrome; and the popup heartbeat keeping the timer (and the charging) alive while the popup holds OS focus, then stopping once it closes.

The simulator also models two behaviours Chrome has and earlier versions of the harness did not: `windows.getLastFocused` stops reporting the browser window as focused while a popup is open, and `enableExtension()` re-fires `onInstalled` so permissions are re-read from Chrome rather than trusted from storage.

### Browser tests (`source/test/browser`, 15)

The Playwright harness builds the extension pages and content script, serves fixture pages for YouTube, and injects a simulated-browser/controller harness. It covers popup, settings, setup, mode chooser, the adult-site motivational page, extension-management confirmation and cover presentation. It does **not** load the extension into Chrome and does not replace the real-browser checks below. The suite also checks visible Shorts links, click-through to a player receiving real canvas-stream video frames, non-study swipe/pausing, mode changes, covered-time reporting and usable cover-card actions. The harness accepts the array storage keys used by real content scripts; stale setup-step and rule-cost expectations have also been updated.

## Regression checks added for this change (v2.4.2)

- Every channel and playlist page is browsable whatever its owner: no channel name is read to decide whether the page may be seen, and an owner EarnTime cannot read no longer covers the page.
- The channel rule is applied to playback instead. Media starting on a channel or playlist page whose owner is non-matching or unreadable is covered and paused, the cover offers *Keep browsing*, and starting playback again is refused again.
- A playback refusal belongs to its page: navigating on to another channel or playlist opens it, and a playlist title still cannot qualify an unrelated owner.
- A video opened from a browsed channel or playlist is still checked against that video's own channel on the watch page.

These supersede the v2.4.1 checks, which covered a channel or playlist page whose owner did not match or could not be read — the exact behaviour that made every playlist EarnTime could not parse unreadable.

### Existing regression checks from v2.4.0

- A half-productive site is gated at `document_start` from local rules only, so the first visit cannot be used before the chooser is answered — verified in jsdom (gate + page lifecycle) and in the simulator (gate cache published before the content script asks).
- SPA and in-page navigations re-ask, and a revisit to the same site re-asks when the previous choice is no longer current.
- An unanswered worker plus unreadable rules fails closed rather than releasing the page (a real bug found by the new DOM tests: the old fallback called `release(rt, 'none')`, which opened exactly the page the gate exists to hold).
- Screen time is recorded for every foreground site, billed or not; away roles (background, idle, locked) are excluded; internal and covered time counts as screen time with zero billing.
- The popup heartbeat keeps counting while the popup holds focus (`UI_OPEN_MS = 2500`, driven by `ui.tick`), and stops charging once the popup closes.
- Screen-time access is an optional permission verified against Chrome at startup, install, window focus and worker restart; `historyGranted` is never trusted from storage alone.

### Earlier regression checks (still passing)

- Schema-3 migration loads a realistic v2.1.1 state, preserves the wallet and history fields (including the ledger and task records), keeps non-retired rules, removes obsolete messaging data, and drops the old default half-list entry.
- An expected YouTube cover reports `detail: 'covered'`; controller accounting does not charge it as a filter failure or credit it as study time.
- A genuinely unrecognised YouTube layout still fails closed after its grace period and is charged as unproductive.
- The DOM tests exercise both state transitions on representative pages; the simulator tests verify their accounting effects.

## Real-browser gap

The automated source and fixture-browser tests passed, but the installed-extension manual checklist was not run. The fixture-based Playwright harness is not a Chrome extension runtime. The following require a real Chrome profile:

- `chrome.permissions.request` from the setup page (needs a real user gesture) and revoking `history` from `chrome://extensions`;
- `chrome.storage.session` availability and lifetime across worker restarts;
- service-worker suspension/restart and real idle transitions;
- declarativeNetRequest blocking, Chrome-page redirects, and any redirect flash;
- disabling, reloading and removing the extension, followed by real-history reconciliation;
- real history visits, OS notifications, incognito gating and the current live YouTube layout;
- a real upgrade from v2.1.1 storage.

## Manual checklist (run in real Chrome before release)

Use a dedicated Chrome profile. EarnTime redirects `chrome://extensions`, so reloading or removing the extension during development means using **Remove from Chrome** (toolbar right-click) and **Load unpacked** again; removing it resets extension data.

1. **Load unpacked and setup:** select the folder containing `manifest.json`, finish the eight-step wizard (it now asks for screen-time access), and verify the setup tab closes.
2. **Study rate:** keep `khanacademy.org` active for 2 minutes. Remaining should increase by about 10 seconds at 60:5.
3. **Spend:** keep `instagram.com` active for 2 minutes. Remaining should drop by about 2 minutes and the badge should follow.
4. **Background and windows:** leave an unproductive page in a background tab or minimised window for 2 minutes. Nothing should change.
5. **Idle and audible media:** stop all input for 1 minute; counting should stop after the idle threshold. Audible media should continue to count while away.
6. **Worker restart:** stop the service worker while an unproductive page is active. Time should continue without a duplicate charge.
7. **Chrome restart:** quit and reopen Chrome. Balance should persist, sessions should clear, and the closed period should not be charged live.
8. **Extension-management confirmation:** type `chrome://extensions` and `chrome://settings/extensions`; both should show the confirmation page. Test **Go back** and **Open EarnTime settings**, then explicitly continue once and verify the requested Chrome page opens. Note any flash and test the extensions-menu route.
9. **Known bypass:** remove EarnTime from Chrome using the toolbar menu; confirm the documented limitation.
10. **Interruption and debt:** in a test profile with 10 minutes, leave Instagram active and interrupt Chrome for 40 minutes. Check the reconciliation audit entry, debt explanation, and blocking (noting the per-visit cap). Repeat the interruption with YouTube (half-productive) open instead: half of the estimated minutes must be credited as study and half charged, the popup must show the *Was that study time?* card, and a notification must say the same.
11. **Debt repayment:** verify only productive sites open while in debt; productive time should repay debt before growing the balance.
12. **YouTube:** choose Productive Mode. Verify study search and homepage shortcuts; open any channel and any playlist without starting a video and confirm both stay browsable; confirm study-channel Shorts play visibly, Shorts shelves and links stay visible in search, and non-study Shorts are covered and paused. Swipe between study and non-study Shorts and check that each active author is rechecked. Play a video from a channel that does not match, and one whose owner cannot be read, and verify the playback is refused and paused and that *Keep browsing* returns the page. Covers should not change charged or credited totals. Verify Unproductive Mode is unavailable at zero balance. Then check the trust card: simulate an unreadable Short (or use a channel whose bar does not render) and confirm `Shorts channel not verified` appears with *Continue (trust)*, that continuing allows the Short and counts its time as productive, and that swiping to the next Short asks again.
13. **Incognito:** with incognito access off, activity should not count; allow EarnTime in incognito and verify it does.
14. **Clock change:** move the system clock backwards while a tracked page is active. Usage must not be erased; inspect the clock ledger entry.
15. **Notifications:** verify the notifications for reaching zero and entering debt.
16. **Audit export:** download the JSON and verify it has hostnames/minutes but no page addresses.
17. **Upgrade migration:** upgrade a v2.1.1 profile and verify balance, days, ledger, tasks, YouTube keywords and other site rules remain intact; removed integration settings are absent.
18. **Uninstall/reinstall:** verify a reinstall opens setup and the starting balance is capped at 30 minutes.
19. **Layout:** inspect popup, settings and setup at 100% and 125% zoom, plus the chooser and cover in a narrow window.
20. **Setup recovery:** close setup unfinished and restart Chrome; setup should reopen. Finish it and restart again; it should not reopen.

### Additional checks for the current change

- Visit a built-in adult-only hostname and a subdomain; both should show the motivational pause page without explaining why. **Back to my goal** should open a productive target.
- Confirm Settings → Protection discloses that the fixed guard is always on and that there is no Focus guard toggle, custom-domain editor or exception editor.
- Visit a mixed-use health/education site, an unlisted domain, and an ordinary domain with words such as `explicit` or `porn` in the URL path/query; none should match the hostname-only list.
- Upgrade a schema-7 profile with adult-site preferences and verify the fixed guard remains on while balance, rules and history are preserved.
21. **Free changes:** after setup, add a productive site and a YouTube keyword; neither should ask for the unlock cost. Removing an unproductive site should ask for confirmation.
22. **First-visit gate (v2.4.0):** open `youtube.com` in a brand-new tab with no prior choice for it. The chooser must appear over the page immediately — the video list must never be usable or scrollable first, and answering must not require a reload. Repeat in a second window and after restarting Chrome.
23. **SPA re-check (v2.4.0):** inside `web.whatsapp.com`, click through chats, and inside YouTube navigate by clicking rather than reloading. Each in-page navigation that changes the classification must re-ask or re-cover without a reload.
24. **Live timer (v2.4.0):** with an unproductive page in front of you, open the popup and watch it. The remaining time must fall second by second while the popup stays open, and the per-day figures must move too. Close the popup and confirm counting resumes normally.
25. **Screen-time analytics (v2.4.0):** grant access in setup, browse three or four sites, and check Settings → Analytics and the popup breakdown: today's screen time, per-site minutes, the 14-day trend, and the earned/used/debt figures must all derive from that day's screen time. Then revoke `history` in `chrome://extensions`, focus another window and come back: the UI must report access as removed, the ledger must contain the change, and gaps must no longer be reconstructed site by site.
26. **YouTube channel/playlist browsing (v2.4.2):** open a channel that does not match your keywords, a playlist whose title contains a keyword but whose owner does not, and a playlist whose owner EarnTime cannot read; all three must stay fully browsable and none may be covered. Start a video on one of them: the playback must be refused, paused and explained, *Keep browsing* must bring the page back, and pressing play again must refuse it again. Then open a video that navigates to a watch page and verify the video-level check still covers it.

27. **Installed web apps / window shortcuts (v2.4.3):** in the same Chrome profile, install or create a shortcut for a productive site and an unproductive site with *Open as window* enabled. Focus each standalone window for 2 minutes: check earned/used balance and per-site screen time. Switch between each and a regular browser window: only the foreground site should count. Minimise the app, focus an unrelated application, idle, then restart Chrome and verify those periods are not counted. Repeat with a shortcut opened in a tab (it should continue to count normally).

28. **Estimate questions (v2.6.3):** create an interruption that includes YouTube, then open the popup: the card must show the estimated minutes, the host and the last mode you chose. Answer "all study" and verify the charge is refunded and the extra credit repays debt first; answer "none" and verify the whole stretch is charged and debt appears if the balance cannot cover it; press *Keep half & half* and verify nothing changes. Check the audit export contains the question and the answer. Also verify the debt block page mentions the estimate while the question is unanswered.

Record the result of each step, Chrome version and date before release.

## Device-source and same-day debt regression checks

`npm test` passes: **144 unit, 58 DOM, and 54 simulated-browser tests** (256 total), plus TypeScript checking. `npm run build` also passes.

New checks cover local versus synced visits (including mixed visits to the same URL and unknown sources), opt-in all-device history and persistence, excluding synced visits during interruptions, 20 minutes of `arena.ai` use against a 10-minute balance, immediate badge/notification/open-tab/DNR enforcement, exact-balance exhaustion, per-host billing across live/history accounting, remove/re-add/move idempotence, subdomain exceptions, migration and local-day boundaries.

The actual Chrome sync API and installation were not exercised during the earlier v2.6.1 verification; no Chromium binary was available for that run. Manual checks: reload the unpacked extension, verify **Settings → Analytics → Devices used for history estimates**, compare local and synced visits on a signed-in profile, and add a previously neutral site after its recorded use exceeds the remaining balance. Confirm the existing tab is redirected and productive sites remain available for repayment.


## Shorts visibility regression checks (2026-10-14)

- Reproduced missing search Shorts and blank allowed players with failing ancestor-visibility tests before the fix.
- Homepage-only hiding is reversed for cached search/player DOM and when switching mode or disabling EarnTime. Original display values, CSS priority and YouTube's own hidden elements are preserved.
- Shorts author checks exclude prefetched reels and cached search/watch metadata. Active-flag changes and in-place channel-text hydration trigger rescans; collaboration trust is reset for a new reel, even before the URL changes.
- A selected Productive Mode session can start at `document_start` without a document element. The observer attaches to the document and handles later parser output without throwing.
- Chromium tests confirm that search links can be clicked, allowed players receive and display video frames, blocked media is paused, *Study search* is clickable, and switching to Unproductive Mode clears the old cover and allows non-study playback.
- `npm test`, `npm run build` and `CHROME_PATH=<chromium> npm run test:browser` pass (272 source tests + 15 browser tests). No live YouTube request or installed-extension end-to-end test was performed.

Manual update check: reload EarnTime on `chrome://extensions`, refresh existing YouTube tabs, search for Shorts, open one from a study channel, swipe to a non-study channel and confirm the Productive/Unproductive behavior. Do not uninstall; reloading preserves local settings and balance.

## Half-time estimate and Shorts trust regression checks (v2.6.3)

Two user-reported problems drove this change: a half-productive site charged *entirely* as unproductive after an interruption (a debt the user could not correct), and a Shorts player that refused to play whenever the channel name could not be read.

- The reconciliation split, the question records, the symmetric correction engine, the popup/block-page cards and the notifications are covered by unit tests (`halfReview`, `reconcile`, `commands`, `migrate`), simulated-browser flow tests (interruption → default split → answer → refund or re-charge → debt) and jsdom tests for the trust card. The estimate is derived from the same history visits as before; only the role of a history-sourced half-productive segment changed, so existing reconciliation windows, per-visit caps and day boundaries are unaffected.
- Answering an estimate cannot be used as a bypass: it is free but strictly bounded by the estimated total, it changes only the days the estimate came from, and it is written to the ledger and the audit export.
- The Shorts trust flow was added *after* the deeper readers: `test/dom/youtube.test.ts` pins that a prefetched reel, a cached watch-page owner and a cached search author can never qualify the active Short, that a non-study Short with a readable name is still covered, and that trust is per reel.
- `npm test` (291 source tests) and `npm run build` pass. No live YouTube request or installed-extension end-to-end test was performed for this change, and the Chromium fixture suite was not re-run.
