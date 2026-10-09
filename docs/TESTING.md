# Test report

**Status: source logic and simulated flows verified; not yet exercised in real Chrome.** The complete source test command passed on 2026-10-09. The separate Playwright/Chromium suite and the manual extension checklist were not run because this environment has no Chromium binary.

> `cd source && npm test` passes **152 tests**: 106 unit + 13 jsdom DOM + 33 simulated-browser flow tests. It includes the strict TypeScript check. The browser suite contains 12 tests but requires `CHROME_PATH`; those results are not included in the 152.

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
| Unit tests | `npm run test:unit` | **105 / 105 pass** |
| DOM tests (jsdom, YouTube filter) | `npm run test:dom` | **11 / 11 pass** |
| Flow tests (simulated browser) | `npm run test:sim` | **32 / 32 pass** |
| Complete source suite | `npm test` | **148 / 148 pass**, including type check |
| Browser tests (Playwright + Chromium) | `npm run test:browser` | **12 available; not run** |
| Real Chrome extension end-to-end | manual checklist below | **not run** |

The release build is verified separately with `npm run build`; browser-specific behaviours still need a real Chrome profile before relying on them.

## What each suite covers

### Unit tests (`source/test/unit`, 105)

- **Host handling:** input normalisation, subdomain matching, most-specific entry wins, strictest list wins on ties, and list de-duplication.
- **Time and accounting:** local day keys, splitting at midnight, formatting, the 60:5 earning example, unproductive spending, idle/background/internal pages, audible media, clock changes, checkpoints, and reconciliation boundaries.
- **Half-productive roles:** mode selection and YouTube-only filter selection; pending or failed YouTube filters fail closed. An intentional `covered` YouTube state is distinct from failure and neither earns nor spends time.
- **Migration:** old storage formats and sanitisation, plus a realistic v2.1.1 state fixture proving balance, debt, daily totals, ledger, tasks, settings and non-retired site rules survive schema-3 migration. The retired integration settings/state and its old default half-list entry are removed.
- **Protection and commands:** setup-once validation, starting-balance cap, free versus paid rule changes, confirmation before a paid change, debt restrictions, task rules, keyword matching, and audit export without page URLs.
- **Worker message retry:** bounded retry timing, explicit refusal, eventual success when the worker starts late, and repeated asking (last pause held) until the budget runs out.
- **Invariants:** 25 seeded random sequences (200 steps each) keep balance and debt non-negative and conserve value; a ledger-size limit test.

### DOM tests (`source/test/dom`, 11)

These exercise the real `src/content/youtube.ts` filter against jsdom YouTube fixture layouts:

- search results keep keyword channels and hide other, unreadable, and Shorts content;
- dynamic channel-name changes are rescanned;
- the homepage becomes a study search with keyword shortcuts;
- Shorts, unsupported sections, non-study watch pages, and unreadable channel names report deliberate covers;
- deliberate covers pause media where applicable and report a healthy `covered` status;
- matching watch pages remain usable while the related shelf stays hidden;
- an absent page layout waits through the grace period, then fails closed and reports unhealthy; a layout appearing during the grace period is not treated as failure;
- stopping the filter disconnects its observer.

### Flow tests on a simulated browser (`source/test/sim`, 32)

The simulator (`test/sim/fakeBrowser.ts`) exposes a Chrome-shaped object and runs the real Chrome adapter, event wiring and controller. Time is virtual. It models tabs and windows, focus, minimise, idle with a 15-second detection interval, audible tabs, history, declarativeNetRequest rules, service-worker suspension and restart, extension disable and enable, browser restart, wall-clock changes, and incognito gating. It does not model Chrome's own internals.

Scenarios cover install and setup; 60:5 earning; spending and blocking; background tabs, focus, idle and audible media; worker/browser restarts; interruption reconciliation and debt; protected Chrome-page redirects; YouTube mode choice, intentional covers (no credit or charge), and actual filter failure (charged fail-closed); half-productive mode lifetimes; recurring tasks; legacy migration; clock changes; incognito; audit export; unlock quotes; tab replacement; and setup reopening.

### Browser tests (`source/test/browser`, 12 available)

The Playwright harness builds the extension pages and content script, serves fixture pages for YouTube, and injects a simulated-browser/controller harness. It covers popup, settings, setup, mode chooser and cover presentation. It does **not** load the extension into Chrome and does not replace the real-browser checks below. The current suite was not run because no Chromium executable was available.

## Regression checks added for this change

- Schema-3 migration loads a realistic v2.1.1 state, preserves the wallet and history fields (including the ledger and task records), keeps non-retired rules, removes obsolete messaging data, and drops the old default half-list entry.
- An expected YouTube cover reports `detail: 'covered'`; controller accounting does not charge it as a filter failure or credit it as study time.
- A genuinely unrecognised YouTube layout still fails closed after its grace period and is charged as unproductive.
- The DOM tests exercise both state transitions on representative pages; the simulator tests verify their accounting effects.

## Real-browser gap

The automated source tests passed, but the browser suite and manual checklist were not run. The fixture-based Playwright harness is not a Chrome extension runtime. The following require a real Chrome profile:

- service-worker suspension/restart and real idle transitions;
- declarativeNetRequest blocking, Chrome-page redirects, and any redirect flash;
- disabling, reloading and removing the extension, followed by real-history reconciliation;
- real history visits, OS notifications, incognito gating and the current live YouTube layout;
- a real upgrade from v2.1.1 storage.

## Manual checklist (run in real Chrome before release)

Use a dedicated Chrome profile. EarnTime redirects `chrome://extensions`, so reloading or removing the extension during development means using **Remove from Chrome** (toolbar right-click) and **Load unpacked** again; removing it resets extension data.

1. **Load unpacked and setup:** select the folder containing `manifest.json`, finish the seven-step wizard, and verify the setup tab closes.
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

Record the result of each step, Chrome version and date before release.
