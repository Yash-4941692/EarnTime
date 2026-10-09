# EarnTime 2.2.0

EarnTime now filters only YouTube in half-productive Productive Mode. Intentional YouTube covers are reported separately from a broken filter: expected covers neither earn nor spend time, while an unrecognised or unavailable filter continues to fail closed and is counted as unproductive.

## WhatsApp removal and upgrade data

WhatsApp support has been removed. On the first start after upgrading from v2.1.1, **WhatsApp settings and auto-reply rules are discarded**, including the chat/group allowlists, queued messages, auto-reply activity log, and send history.

EarnTime's **balance and history are preserved**: your balance, debt, daily totals, ledger, tasks, YouTube keywords, and all other site rules remain. The obsolete default `web.whatsapp.com` half-productive rule is removed.

## Verification

`npm test` passes **148 tests** (105 unit, 11 DOM, and 32 simulated-browser flow tests) and the strict TypeScript check. The real-Chrome checklist remains necessary; see `docs/TESTING.md`.
