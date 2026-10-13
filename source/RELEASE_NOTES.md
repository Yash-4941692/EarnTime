# EarnTime 2.6.1

## Device-source control and same-day debt enforcement

- History imports now default to **This device only**, excluding synced and unknown-source visits. Choose **All devices with synced Chrome history** in **Settings → Analytics → Devices used for history estimates** if desired.
- Chrome exposes local versus synced visits, not the identities of individual remote devices. A named remote-device picker is therefore not supported. Live tracking always remains local.
- Adding or moving a website to **Unproductive** now charges its recorded use earlier today. With 20 recorded minutes on `arena.ai` and 10 minutes available, EarnTime immediately creates 10 minutes of debt, updates the badge, blocks the open tab and enforces navigation restrictions.
- Per-host billing prevents repeat charges when removing, re-adding or moving sites. More-specific site rules and local-day boundaries are respected.
- Existing balances and debt are preserved. Changing the history source affects future imports only and does not undo prior accounting.

## Verification

TypeScript checking, **256 tests** (144 unit, 58 DOM, 54 simulated-browser) and the production build pass. Real Chrome sync and installation behavior were not tested in the development environment; see `docs/TESTING.md` for manual checks.

## Install or update

Download `EarnTime-2.6.1.zip`, extract it, and load the folder containing `manifest.json` via Chrome's **Load unpacked** option. For an existing unpacked installation, replace its files with the extracted release and reload the extension to retain its local data. Do not uninstall if you want to keep your existing data.
