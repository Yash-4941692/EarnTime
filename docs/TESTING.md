# Testing report

**Status: partially verified.** Everything below was run in the sandbox described in *Environment*. The extension was **not** run in a real Chrome browser, because the sandbox could not obtain a Chromium build that supports extensions (see *Real-browser gap*). Chrome-specific behaviour must be checked with the manual checklist before release.

## Environment

- Debian 12 sandbox, Node 22.22.3, npm 10.9.8, 2 CPU, no display.
- Tests run with `TZ=Asia/Kolkata`. The simulated clock starts at 2026-10-08 09:00 local.
- Browser tests use **Chromium 153.0.8010.0** (headless shell extracted from `@sparticuz/chromium`), driven through `playwright-core` 1.64.0. That build has **no extension support** (see *Real-browser gap*).
- Build and source: TypeScript 5.9 (strict), esbuild 0.25, React 18.3, Tailwind 3.4.

## Results

| Suite | Command | Result |
| --- | --- | --- |
| Type check (strict, `noUnusedLocals`) | `npm run typecheck` | **pass** |
| Build (root artifacts) | `npm run build` | **pass** |
| Unit tests | `npm run test:unit` | **92 / 92 pass** |
| Flow tests (simulated browser) | `npm run test:sim` | **28 / 28 pass** |
| Browser tests (headless Chromium) | `npm run test:browser` | **14 / 14 pass** |
| Real Chrome extension end-to-end | manual checklist below | **not run** |

The type checker and the build report no warnings. The extension logs a warning only on a failure path (for example, a failing history query).

## What each suite covers

### Unit tests (`source/test/unit`, 92)

- **Host handling**: input normalisation (`https://www.` stripped, punycode, rejects `chrome://`, `javascript:` and malformed names), subdomain matching, most-specific entry wins, strictest list wins on ties, migration de-duplication.
- **Time**: local day keys, splitting intervals at local midnight, compact formatting.
- **Matchers**: YouTube channel rule (substring, case and NFKC normalisation, fails closed on unknown names), WhatsApp exact-name rule, YouTube path classification, filter selection.
- **Engine**: 60 productive minutes earn exactly 5 minutes; unproductive use drains but never creates debt live; background, minimised, unfocused, locked and internal pages are not counted; a 15-second idle detection window is not charged; audible media counts while idle; half-productive pending and degraded states; a backwards clock never produces negative time and charges only observed monotonic time; gaps over 120 seconds are handed to reconciliation; ledger merging; midnight splits.
- **Reconciliation**: the specification example (balance 10 min, 40 min of unproductive use gives debt 30 min); the single-visit cap; the continuation cap; productive time repaying debt first; half-productive visits charged during interruptions; the 7-day window; browser-start cut; neutral sites never charged.
- **Roles and blocking**: role for every observation state; block predicates for zero balance and debt; the half-productive session rules; page directives; the declarativeNetRequest rule builder (allow outranks block-all); guarded `chrome://` URLs; the exact required wording of the limitation sentence.
- **Tasks**: once per local day for recurring tasks, once ever for one-off tasks, undo does not revoke, re-tick does not pay twice, rewards repay debt first.
- **Protection and commands**: setup once only, setup validation (including the 30-minute starting-balance cap), free changes before setup, costs for each loosening change, refusal when the balance cannot pay (with no side effect), refusal while in debt, cost of lowering the unlock cost, audit export contains hosts but no URLs.
- **Migration**: legacy root-extension and React-prototype storage; balance and ratio preserved; the nuclear password is not carried over; corrupted storage is sanitised.
- **Invariants**: 25 seeded random sequences (200 steps each) of checkpoints, reconciliations, task toggles and backwards clock jumps. Balance and debt stay non-negative, debt origin never falls below debt, and net worth moves exactly by credits minus charges. A ledger-size limit test.

### Flow tests on a simulated browser (`source/test/sim`, 28)

The simulator (`test/sim/fakeBrowser.ts`) exposes a `chrome`-shaped object and runs the **real** Chrome adapter, event wiring and controller. Time is virtual. It models: tabs and windows, focus, minimise, idle with a 15-second detection interval, audible tabs, history, declarativeNetRequest main-frame rules with priorities, service-worker suspension and restart, extension disable and enable, browser restart with new tab ids, wall-clock changes, and incognito gating. It does **not** model Chrome's own internals.

Scenarios: install and setup; one productive hour (exact 5 minutes); unproductive use until the balance is empty and blocking of open and new tabs; background tabs and multiple or minimised windows; switching tabs; idle time and audible media; worker restart mid-session; browser restart; **disable for 40 minutes, re-enable, debt of about 30 minutes** (balance 10); debt restrictions and repayment (7 hours at 60:5 clears 30 minutes of debt); `chrome://extensions` redirect including typed navigation; YouTube mode choice and health (credit only with a healthy filter, charge when unhealthy); Unproductive Mode on a half-productive site; leaving a half-productive site asks again; Unproductive sessions ending at zero balance; recurring task once per day; legacy migration with the legacy keys removed; backwards clock; forward clock jump reconciled; incognito invisible unless allowed; audit export has no URLs; costs for loosening and refusal with no side effect; tab replacement keeps its session; closing a tab ends its session; a fresh install opens the setup wizard and an update does not; repeated worker restarts do not duplicate rules.

### Browser tests (`source/test/browser`, 14)

These run the **built** extension pages and the **built** content script in headless Chromium. Each page gets an in-page harness that runs the same simulated browser and controller. Fixture pages stand in for YouTube and WhatsApp Web (Playwright routes `https://www.youtube.com/**` and `https://web.whatsapp.com/**`).

- Popup: dashboard after setup; DEBT MODE with the amount, repayment progress and required study time; task toggle pays once.
- Setup wizard: all eight steps, one save, default ratio and default half-productive sites stored.
- Settings: loosening changes are refused at zero balance with the cost shown; adding an unproductive site is free; the exact limitation wording is shown; the YouTube keyword checker.
- Block page: exhausted, debt, and the extensions variant with the exact wording.
- YouTube: mode chooser; Productive Mode shows only keyword channels and hides unknown channels and Shorts; blank homepage replaced by study search; a non-keyword watch page is covered, the stored status becomes degraded (so the time is not credited), and no second prompt is shown on the same site; Unproductive Mode is disabled at zero balance and greys the page when chosen; a missing YouTube layout fails closed after the grace period.
- WhatsApp: only allowed chats visible, unreadable row hidden; an open conversation not on the list is covered.
- All browser tests fail on any uncaught page error.

## Bugs found and fixed during testing

These were found by the tests above and fixed before this report was written:

1. Adding an unproductive site charged the unlock cost. Adding to a stricter list must be free. (Unit test added.)
2. Intervals that did not count still created empty day records. (Fixed; the test now checks for absence.)
3. The mode chooser showed `www.youtube.com` instead of the list entry `youtube.com`, so its accessible name and heading were wrong. (Browser test caught it.)
4. A covered YouTube watch page kept reporting a healthy filter, so audio playing behind the cover was credited as productive. Covered pages now count as unproductive and pause media. (Browser test asserts the degraded status.)
5. A health change waited for the next 30-second checkpoint, and a startup report could overwrite a covered-page report. Health changes now trigger a checkpoint, and the startup report reflects the filter's current state.
6. Debt started at the end of the charged interval instead of when the balance ran out. (Unit test now checks the start.)
7. The "Debt cleared" notification implied unproductive sites were open again, which is not true at zero balance. Reworded.
8. Setup could grant up to 600 minutes. Capped at 30 minutes, because reinstalling restarts setup.
9. The README and user guide said setup opens on first run, but nothing opened it. A fresh install now opens the setup wizard (flow test added).

Simulator defects (not product bugs) were also corrected while writing the tests: new tabs were placed in the first window rather than the focused one, declarativeNetRequest rules were not applied to tabs opened directly at a blocked address, and the settle logic could return before a queued job had saved. Each was fixed in the simulator to match Chrome's behaviour; no expectation was loosened to make a test pass.

## Real-browser gap

Attempts to obtain an extension-capable Chromium in the sandbox:

- `@sparticuz/chromium` 153: headless shell. Verified in this sandbox: no extension targets, `chrome://extensions` renders blank, and the binary has no `load-extension` switch.
- npm and PyPI scans for full Chromium builds: none found that are usable.
- GitHub release assets (ungoogled-chromium 154, Electron): the download host resets the TLS connection from this sandbox.

As a result the following have **not** been verified with a real Chrome extension runtime. See `KNOWN_LIMITATIONS.md` section 9.

## Manual checklist (run in real Chrome before release)

Use a dedicated Chrome profile. Because EarnTime redirects `chrome://extensions`, reloading or removing the extension during development means using **Remove from Chrome** (toolbar right-click) and **Load unpacked** again, which resets its data.

1. **Load unpacked** from the folder that contains `manifest.json`. The setup wizard opens. Finish setup with defaults.
2. **Study rate**: open `khanacademy.org` as the active tab for 2 minutes. Remaining increases by 10 seconds (60:5).
3. **Spend**: open `instagram.com` as the active tab for 2 minutes. Remaining drops by about 2 minutes. The badge follows.
4. **Background and windows**: leave Instagram in a background tab, or in a minimised window, for 2 minutes. Nothing changes.
5. **Idle**: stop all input on Instagram for 1 minute. Nothing changes after about 15 seconds. Start a silent-audio tab and check counting resumes only when audible.
6. **Worker restart**: open `chrome://extensions`, the EarnTime card, *Inspect views: service worker*, and stop it while Instagram is active. Time continues from the same balance without a double charge.
7. **Chrome restart**: quit and reopen Chrome. Balance persists. Sessions are cleared. No time is charged for the closed period.
8. **Redirect**: type `chrome://extensions` and `chrome://settings/extensions` in tabs. Each redirects to the EarnTime block page. Note the flash, if any. Check the "Manage extensions" route from the extensions menu too.
9. **Known bypass check**: right-click the toolbar icon, choose *Remove from Chrome*. Confirm it removes the extension (documented limitation).
10. **Interruption and debt (real sleep)**: with balance 10 minutes, keep Instagram as the active tab, close the laptop lid for 40 minutes, then reopen it. Chrome's worker is not running during sleep, so the next checkpoint reconciles from history. Expected: the audit export records a reconciliation for the window with the charged minutes and the debt added. Because a single visit is capped at 15 minutes, a long continuous visit produces a smaller debt than the time away (see `KNOWN_LIMITATIONS.md`, section 3). Open Instagram tabs go to the block page, and the popup explains the debt. Disabling EarnTime from `chrome://extensions` is not possible while the redirect is active, so the disable-and-re-enable path is covered by the simulator tests only.
11. **Debt**: only productive sites open. New tabs to Instagram or unlisted sites are redirected. Study 7 hours at 60:5 (or set a short test ratio in a test profile). Debt clears and rules return.
12. **YouTube**: open a watch page with a non-keyword channel; choose Productive Mode; the cover appears and audio pauses. Search `jee`; only keyword channels remain. Homepage shows study search. Shorts are closed. Unproductive Mode is disabled at zero balance.
13. **WhatsApp Web**: log in with a real account. Only allowed chats show. Open a non-allowed chat; it is covered. Confirm the chat list reads correctly after a reload.
14. **Incognito**: with access off, incognito Instagram does not count. Allow EarnTime in incognito and confirm it counts.
15. **Clock**: while Instagram is active, set the system clock back 5 minutes. Balance never goes negative and the ledger records the clock change.
16. **Notifications**: reaching zero and reaching debt each show one OS notification.
17. **Export**: download the audit JSON. Confirm it contains hostnames and minutes, and no page addresses. Confirm the reconciliation entry from step 10.
18. **Uninstall and reinstall**: confirm a fresh setup, and that the starting balance is limited to 30 minutes (known bypass).
19. **Layout**: check the popup, settings and setup pages at 100% and 125% zoom, and the chooser and cover on a narrow window.

Record the result of each step, the Chrome version and the date in the pull request.
