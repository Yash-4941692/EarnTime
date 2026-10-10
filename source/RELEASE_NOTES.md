# EarnTime 2.4.3

## Chrome-installed web apps and window shortcuts now count

EarnTime previously requested only normal Chrome windows, so a site opened through an installed web app or an **Open as window** shortcut could be missed. It now includes Chrome's popup and app window types when looking for the focused window. The same site rules, earning, spending, blocking and per-site screen-time accounting apply to the active page in those windows.

Only the focused, non-minimised window counts. Idle/locked time, background tabs, devtools and unrelated applications still do not count. The app must be visible to EarnTime in the same Chrome profile; other browsers or profiles are outside the extension's reach. No new permissions are needed.

## Verification

`npm test` passes 226 tests (134 unit, 47 DOM, 45 simulated-browser flows), including app and popup window focus, worker restart, idle and devtools exclusion. The real-Chrome checklist is in `docs/TESTING.md`; it was not run here because no Chrome/Chromium binary is installed.
