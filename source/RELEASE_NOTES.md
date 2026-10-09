# EarnTime 2.3.0

Everything in this release is about **first-visit correctness, a live timer, and trust-based half-productive sites**.

## First visit counts — no reload needed

- Every message to the background worker now has its own timeout, `page.init` is retried for up to a minute (the pause repeats after the initial growth), and until the answer arrives the page shows a fail-closed **"Checking this site…"** cover. The mode chooser and the YouTube filter therefore attach on the **first** page load — the old behaviour (open until you reload, chooser only after reload) is gone.
- If the extension is disabled mid-load, that cover removes itself and the page is left alone.

## YouTube, exactly when content plays

- The page kind (homepage / search / watch / …) is re-read on **every** scan, so an in-page navigation from a channel page or the homepage to a video is judged as a watch page immediately.
- A video **starting to play triggers the channel check synchronously**: an unproductive channel's video is covered and paused the moment it plays, on the first visit. No reload, no waiting.
- **Search results are no longer filtered.** Unproductive-channel results stay visible in search; they are judged only while the content plays.
- The homepage no longer shows a blocking "study search" banner in Productive Mode. It simply shows **no videos**; the rest of the page works normally.

## WhatsApp is back as a trust-based half-productive site (storage schema 4)

- `web.whatsapp.com` is on the default half-productive list again. It is **fully visible in both modes** — nothing blanked, nothing removed — with the same Productive/Unproductive chooser as other half-productive sites.
- Your choice is what the time counts as: Productive earns at your ratio, Unproductive is charged to your balance.
- Upgraded installs get the entry back once (schema ≤3 → 4); afterwards the stored list is authoritative and you can remove it in Settings.
- The old WhatsApp auto-reply/chat data stays discarded.

## Greyscale removed

- Unproductive Mode no longer greys out pages. The `grayscale` directive field and its style are gone entirely.

## Live, exact timer in the popup

- While the popup is open it asks the worker for a checkpoint **every second**. Remaining, Earned/Used and the live role advance in real time instead of freezing between 30-second alarm ticks.
- The big **Remaining** figure now always shows seconds, and a new **"This visit"** row shows the current half-productive session's elapsed time, ticking every second.
- Accounting stays exact: one second of use charges exactly one second — never two (covered by a new simulation test that checkpoints 30 simulated seconds and asserts a ~30s charge).
- Between checkpoints the display interpolates in **both** directions: spending subtracts the elapsed time, earning adds credit at your ratio.

## Verification

`npm test` passes **152 tests** (106 unit, 13 DOM, 33 simulated-browser flow tests) and the strict TypeScript check. The real-Chrome checklist remains necessary; see `docs/TESTING.md`.
