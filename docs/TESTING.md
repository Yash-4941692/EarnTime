# Test report

**Status: source logic and simulated flows verified; not yet exercised in real Chrome.** The complete source test command passed on 2026-10-09 (v2.4.0). The separate Playwright/Chromium suite and the manual extension checklist were not run because this environment has no Chromium binary.

> `cd source && npm test` passes **213 tests**: 134 unit + 37 jsdom DOM + 42 simulated-browser flow tests. It includes the strict TypeScript check. The browser suite contains 12 tests but requires `CHROME_PATH`; those results are not included in the 213.

## Environment

- Debian 12 sandbox, Node 22.22.3, npm 10.9.8, 2 CPU, no display.
- Tests run with `TZ=Asia/Kolkata`. The simulated clock starts at 2026-10-08 09:00 local.
- Browser tests use `playwright-core` and require a separately installed Chromium/Chrome binary. No compatible binary was available (`CHROME_PATH` unset, nothing on `PATH`).
- Build and source: TypeScript 5.9 (strict), esbuild 0.25, React 18.3, Tailwind 3.4.

## Results

| Suite | Command | Result |
| --- | --- | --- |
| Type check (strict, `noUnusedLocals`) | `npm run typecheck` | **pass** |
| Build (root artifacts) | `npm run build` | **pass** |
| Unit tests | `npm run test:unit` | **134 / 134 pass** |
| DOM tests (jsdom: load-time gate, page lifecycle, YouTube filter) | `npm run test:dom` | **37 / 37 pass** |
| Flow tests (simulated browser) | `npm run test:sim` | **42 / 42 pass** |
| Complete source suite | `npm test` | **213 / 213 pass**, including type check |
| Browser tests (Playwright + Chromium) | `npm run test:browser` | **12 available; not run** |
| Real Chrome extension end-to-end | manual checklist below | **not run** |

The release build is verified separately with `npm run build`; browser-specific behaviours still need a real Chrome profile before relying on them.

## What each suite covers

### Unit tests (`source/test/unit`, 134)

- **Host handling:** input normalisation, subdomain matching, most-specific entry wins, strictest list wins on ties, and list de-duplication.
- **Time and accounting:** local day keys, splitting at midnight, formatting, the 60:5 earning example, unproductive spending, idle/background/internal pages, audible media, clock changes, checkpoints, and reconciliation boundaries.
- **Half-productive roles:** mode selection and YouTube-only filter selection; pending or failed YouTube filters fail closed. An intentional `covered` YouTube state is distinct from failure and neither earns nor spends time.
- **Migration:** old storage formats and sanitisation, plus a realistic v2.1.1 state fixture proving balance, debt, daily totals, ledger, tasks, settings and non-retired site rules survive schema-3 migration. The retired integration settings/state and its old default half-list entry are removed.
- **Protection and commands:** setup-once validation, starting-balance cap, free versus paid rule changes, confirmation before a paid change, debt restrictions, task rules, keyword matching, and audit export without page URLs.
- **Worker message retry:** bounded retry timing, explicit refusal, eventual success when the worker starts late, and repeated asking (last pause held) until the budget runs out.
- **Screen-time accounting:** per-site recording inside `chargeSlice` (present roles only, covered and mode-pending time counted but unbilled), the `MAX_DAY_HOSTS` eviction order, `screenMs >= estimatedScreenMs` sanitising, day pruning, and the `historyGranted` migration rule (a pre-schema-5 state keeps access; a fresh install does not have it yet).
- **Analytics view model (`src/core/analytics.ts`):** today's totals, per-site grouping and `www` collapsing, "other sites" roll-up, the 14-day trend with empty days marked, deltas against yesterday and the average, study share, and the `partlyEstimated` flag.
- **Worker-free page verdict (`src/content/local.ts`):** rule narrowing to the shared `DirectiveInput` shape, half-site chooser verdicts, productive/unproductive/neutral verdicts, the 30-second gate-cache TTL, the 100-entry cache limit, and cache read/write failure being non-fatal.
- **Invariants:** 25 seeded random sequences (200 steps each) keep balance and debt non-negative and conserve value; a ledger-size limit test.

### DOM tests (`source/test/dom`, 37)

**Load-time gate (`gate.test.ts`) and page lifecycle (`page.test.ts`)** run the real content-script code against jsdom with injected globals and a virtual clock:

- a half-productive page carries `data-et-gate="closed"` from `document_start` and its gate stylesheet is already in the DOM before the body exists;
- local rules alone produce the chooser with **zero** worker round-trips (the fix for the first-visit bypass);
- unreadable rules show "Checking this site…" immediately — no 300 ms grace — and the page never opens itself;
- the worker's answer replaces the local verdict, and a refusal keeps the page closed while showing the reason;
- only `isAlive() === false` (the watchdog) releases a page that cannot be classified;
- the persisted state is unreadable **and** the worker never answers ⇒ the page stays covered instead of being released;
- SPA/in-page URL changes re-ask within one watch tick, and a tab left abandoned is disposed.

**YouTube filter tests** exercise the real `src/content/youtube.ts` against jsdom YouTube fixture layouts:

- search results keep keyword channels and hide other, unreadable, and Shorts content;
- dynamic channel-name changes are rescanned;
- the homepage becomes a study search with keyword shortcuts;
- Shorts, unsupported sections, non-study watch pages, and unreadable channel names report deliberate covers;
- deliberate covers pause media where applicable and report a healthy `covered` status;
- matching watch pages remain usable while the related shelf stays hidden;
- an absent page layout waits through the grace period, then fails closed and reports unhealthy; a layout appearing during the grace period is not treated as failure;
- stopping the filter disconnects its observer.

### Flow tests on a simulated browser (`source/test/sim`, 42)

The simulator (`test/sim/fakeBrowser.ts`) exposes a Chrome-shaped object and runs the real Chrome adapter, event wiring and controller. Time is virtual. It models tabs and windows, focus, minimise, idle with a 15-second detection interval, audible tabs, history, declarativeNetRequest rules, service-worker suspension and restart, extension disable and enable, browser restart, wall-clock changes, and incognito gating. It does not model Chrome's own internals.

Scenarios cover install and setup; 60:5 earning; spending and blocking; background tabs, focus, idle and audible media; worker/browser restarts; interruption reconciliation and debt; protected Chrome-page redirects; YouTube mode choice, intentional covers (no credit or charge), and actual filter failure (charged fail-closed); half-productive mode lifetimes; recurring tasks; legacy migration; clock changes; incognito; audit export; unlock quotes; tab replacement; and setup reopening.

The v2.4.0 scenarios add: gate-cache publication for half-classified tabs (first visit publishes `choose`, following a choice publishes `active`, leaving and returning republishes `choose`, non-half tabs publish nothing); per-site screen time for a whole foreground day including unbilled neutral time; idle time not counting as screen time; history-reconstructed gaps recorded as estimated screen time against the right site; no reconstruction and no invented sites when access is absent; granting and removing access through the worker route with a ledger line for each; a revoked permission being noticed on the next worker start; setup recording the access answer and the worker correcting it against Chrome; and the popup heartbeat keeping the timer (and the charging) alive while the popup holds OS focus, then stopping once it closes.

The simulator also models two behaviours Chrome has and earlier versions of the harness did not: `windows.getLastFocused` stops reporting the browser window as focused while a popup is open, and `enableExtension()` re-fires `onInstalled` so permissions are re-read from Chrome rather than trusted from storage.

### Browser tests (`source/test/browser`, 12 available)

The Playwright harness builds the extension pages and content script, serves fixture pages for YouTube, and injects a simulated-browser/controller harness. It covers popup, settings, setup, mode chooser and cover presentation. It does **not** load the extension into Chrome and does not replace the real-browser checks below. The current suite was not run because no Chromium executable was available.

## Regression checks added for this change (v2.4.0)

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

The automated source tests passed, but the browser suite and manual checklist were not run. The fixture-based Playwright harness is not a Chrome extension runtime. The following require a real Chrome profile:

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
8. **Protected-page redirects:** type `chrome://extensions` and `chrome://settings/extensions`; both should redirect to the block page. Note any flash and test the extensions-menu route.
9. **Known bypass:** remove EarnTime from Chrome using the toolbar menu; confirm the documented limitation.
10. **Interruption and debt:** in a test profile with 10 minutes, leave Instagram active and interrupt Chrome for 40 minutes. Check the reconciliation audit entry, debt explanation, and blocking (noting the per-visit cap).
11. **Debt repayment:** verify only productive sites open while in debt; productive time should repay debt before growing the balance.
12. **YouTube:** choose Productive Mode. Verify study search, keyword-only channels and homepage shortcuts. Shorts, unsupported sections and a non-matching video should be covered without changing charged or credited totals. Verify Unproductive Mode is unavailable at zero balance.
13. **Incognito:** with incognito access off, activity should not count; allow EarnTime in incognito and verify it does.
14. **Clock change:** move the system clock backwards while a tracked page is active. Usage must not be erased; inspect the clock ledger entry.
15. **Notifications:** verify the notifications for reaching zero and entering debt.
16. **Audit export:** download the JSON and verify it has hostnames/minutes but no page addresses.
17. **Upgrade migration:** upgrade a v2.1.1 profile and verify balance, days, ledger, tasks, YouTube keywords and other site rules remain intact; removed integration settings are absent.
18. **Uninstall/reinstall:** verify a reinstall opens setup and the starting balance is capped at 30 minutes.
19. **Layout:** inspect popup, settings and setup at 100% and 125% zoom, plus the chooser and cover in a narrow window.
20. **Setup recovery:** close setup unfinished and restart Chrome; setup should reopen. Finish it and restart again; it should not reopen.
21. **Free changes:** after setup, add a productive site and a YouTube keyword; neither should ask for the unlock cost. Removing an unproductive site should ask for confirmation.
22. **First-visit gate (v2.4.0):** open `youtube.com` in a brand-new tab with no prior choice for it. The chooser must appear over the page immediately — the video list must never be usable or scrollable first, and answering must not require a reload. Repeat in a second window and after restarting Chrome.
23. **SPA re-check (v2.4.0):** inside `web.whatsapp.com`, click through chats, and inside YouTube navigate by clicking rather than reloading. Each in-page navigation that changes the classification must re-ask or re-cover without a reload.
24. **Live timer (v2.4.0):** with an unproductive page in front of you, open the popup and watch it. The remaining time must fall second by second while the popup stays open, and the per-day figures must move too. Close the popup and confirm counting resumes normally.
25. **Screen-time analytics (v2.4.0):** grant access in setup, browse three or four sites, and check Settings → Analytics and the popup breakdown: today's screen time, per-site minutes, the 14-day trend, and the earned/used/debt figures must all derive from that day's screen time. Then revoke `history` in `chrome://extensions`, focus another window and come back: the UI must report access as removed, the ledger must contain the change, and gaps must no longer be reconstructed site by site.

Record the result of each step, Chrome version and date before release.
