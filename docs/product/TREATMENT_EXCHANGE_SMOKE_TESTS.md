# Treatment Exchange — Smoke Tests & E2E

**Date:** 2026-03-18

---

## What’s Available

### 1. Playwright E2E (peer-care-connect)

- **Location:** `peer-care-connect/tests/e2e/treatment-exchange-flow.spec.ts`
- **Command:** `npm run test:e2e` (or `npx playwright test treatment-exchange-flow.spec.ts`)
- **Config:** `peer-care-connect/playwright.config.ts`
- **Base URL:** `http://localhost:3000` (dev server started automatically unless `SKIP_E2E_SERVER` is set)

| Test group             | Coverage                                     |
| ---------------------- | -------------------------------------------- |
| Complete Exchange Flow | Send request, accept, view session, cancel   |
| Request Management     | Send, **Reschedule** (was Decline), expired  |
| Dashboard Integration  | Pending requests, accepted sessions, buttons |
| Session Detail View    | Badge, Cancel, Start Session hidden          |
| Cancellation Flow      | Refund tiers (24h+, 2–24h, &lt;2h)           |
| Error Handling         | Insufficient credits, expired, disabled      |

**Note:** Many tests are placeholders (`expect(true).toBe(true)`) and depend on test users/data. CI runs them with `continue-on-error: true`.

### 2. cursor-ide-browser MCP (manual smoke)

With the built-in **cursor-ide-browser** MCP you can:

- Navigate to the app (e.g. `https://theramate.co.uk`)
- Take snapshots
- Click, type, fill forms
- Check elements (Accept, Reschedule, Book return)

Useful for ad‑hoc checks like:

1. Accept an exchange → Book return
2. Reschedule flow (recipient uses Reschedule instead of Decline)
3. Request extension → Approve extension

### 3. Node smoke scripts

- **`test-scripts/qa-email-guest-location-smoke.js`** – Email + guest/location (no treatment exchange)
- **`test-scripts/user-journey-tests.js`** – Payment user journeys (no treatment exchange)

---

## Recent changes

### Reschedule vs Decline

- UI: Recipient sees **Reschedule** instead of **Decline** (fraud prevention).
- Tests updated to match:
  - `should reschedule request` (was `should decline request`)
  - Dashboard assertion: `button:has-text("Reschedule")` instead of `"Decline"`

### Reschedule cap (2026-03-18)

- Max **2 reschedules per pair per 30 days** (configurable via `app_config`)
- Prevents infinite reschedule loop
- When exceeded: RPC raises `RESCHEDULE_CAP_EXCEEDED`; frontend shows user-friendly message

---

## Running smoke tests

```bash
# 1. Playwright (from peer-care-connect)
cd peer-care-connect
npm run test:e2e                              # all E2E
npx playwright test treatment-exchange-flow  # treatment exchange only
npx playwright test --project=chromium        # chromium only (faster)

# 2. Dev server must be running for full E2E
npm run dev &   # or use SKIP_E2E_SERVER if app is already up
npm run test:e2e
```

---

## Production URLs

- **App:** https://theramate.co.uk
- **Exchange requests:** https://theramate.co.uk/practice/exchange-requests
- **Dashboard:** https://theramate.co.uk/practice/dashboard

Manual smoke checks: log in as two practitioners, run through Accept → Book return and Reschedule flows.
