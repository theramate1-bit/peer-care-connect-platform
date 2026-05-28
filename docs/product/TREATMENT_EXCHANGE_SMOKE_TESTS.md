# Treatment Exchange — Smoke Tests & E2E

**Date:** 2026-03-18

---

## What’s Available

### 1. Playwright E2E (web)

**This checkout:** There is **no** `playwright.config` or `*.spec.ts` under the repo root in the default layout. If your branch adds Playwright, colocate config with the web package and document `npm run test:e2e` there.

When present, typical layout is:

- **Spec:** search for `treatment-exchange-flow.spec.ts` or `playwright.config.*`
- **Command:** `npx playwright test` (from the directory that contains `playwright.config`)
- **Base URL:** match your web dev server port (often `http://localhost:5173` or `3000`)

| Test group             | Coverage                                     |
| ---------------------- | -------------------------------------------- |
| Complete Exchange Flow | Send request, accept, view session, cancel   |
| Request Management     | Send, **Reschedule** (was Decline), expired  |
| Dashboard Integration  | Pending requests, accepted sessions, buttons |
| Session Detail View    | Badge, Cancel, Start Session hidden          |
| Cancellation Flow      | Refund tiers (24h+, 2–24h, &lt;2h)           |
| Error Handling         | Insufficient credits, expired, disabled      |

**Note:** Many tests may be placeholders (`expect(true).toBe(true)`) and depend on test users/data. CI may run them with `continue-on-error: true`.

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

### 3. Staging RPC E2E (recommended)

**`test-scripts/treatment-exchange-staging-e2e.js`** — two authenticated practitioners against staging Supabase:

| Scenario       | What it verifies                                                                                                                                                                              |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Happy path     | `create_treatment_exchange_request` → `accept_exchange_request` → `get_exchange_reciprocal_available_slots` → `book_exchange_reciprocal_session` → `credits_deducted` + `credit_transactions` |
| Reschedule cap | Two `decline_exchange_request` succeed; third raises `RESCHEDULE_CAP_EXCEEDED`                                                                                                                |

```bash
# .env (repo root)
EXCHANGE_REQUESTER_EMAIL=...
EXCHANGE_REQUESTER_PASSWORD=...
EXCHANGE_RECIPIENT_EMAIL=...
EXCHANGE_RECIPIENT_PASSWORD=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_ANON_KEY=...   # or VITE_SUPABASE_PUBLISHABLE_KEY

npm run test:exchange:e2e
# Dry-run (sign-in + tier/credits check, no RPC writes): npm run test:exchange:e2e:dry
# Without EXCHANGE_* in .env the script exits 0 with a skip message.
```

### 4. Maestro (mobile UI)

See **`theramate-ios-client/.maestro/README.md`**. Flows use `testID`s: `exchange-segment-discover`, `exchange-send-request`, `exchange-accept`, `exchange-reschedule`, `exchange-reciprocal-slot`.

### 5. Other Node scripts

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
# 1. Treatment exchange staging E2E (RPC — primary)
npm run test:exchange:e2e

# 2. Maestro (mobile UI — optional)
cd theramate-ios-client && maestro test .maestro/exchange-happy-path-requester.yaml

# 3. Playwright (web — not in this checkout; see e2e/README.md)

# 4. Backend Jest (present in backend/package.json)
cd backend
npm run test:unit
npm run test:integration
npm run test:ci

# 3. Web Jest — root package.json may expose test:web when the web workspace exists
cd ..   # repo root
npm run test:web   # verify in root package.json; fails if workspace package is missing
```

For **manual** checks, use the **cursor-ide-browser** MCP (section 2) or run Node scripts under `test-scripts/` (section 3).

---

## Production URLs

- **App:** https://theramate.co.uk
- **Exchange requests:** https://theramate.co.uk/practice/exchange-requests
- **Dashboard:** https://theramate.co.uk/practice/dashboard

Manual smoke checks: log in as two practitioners, run through Accept → Book return and Reschedule flows.
