# Jest coverage scope (web + backend + mobile)

**Reality check:** Jest layout differs by branch. **Before trusting paths below**, run `dir` / `find` / your editor search for `jest.config` and `*.test.ts` in this checkout. Older copies of this doc listed suites (for example `booking-flow-type.test.ts`, `tests/unit/lib/*`) that **do not exist** on some trees where the web app already lives at repo-root **`src/`** but no root Jest project is wired yet.

---

## Backend (`backend/`)

- **Config:** [`backend/jest.config.js`](../../backend/jest.config.js)
- **Scripts:** [`backend/package.json`](../../backend/package.json) — `test`, `test:unit`, `test:integration`, `test:ci`, `test:coverage`
- **Suites (this repo):** under [`backend/tests/`](../../backend/tests/) — e.g. `unit/validation.test.ts`, `unit/booking-email-data.test.ts`, `unit/security-headers.test.ts`, `integration/cors.integration.test.ts`

**Run from repo root:** `npm run test:backend` (see root [`package.json`](../../package.json)).

---

## Mobile (`theramate-ios-client/`)

- **Config:** [`theramate-ios-client/jest.config.js`](../../theramate-ios-client/jest.config.js)
- **Scripts:** [`theramate-ios-client/package.json`](../../theramate-ios-client/package.json) — use the workspace’s `test` / `test:ci` entries.

**Run from repo root:** `npm run test:mobile` (verify in root `package.json`).

---

## Web (repo-root `src/`)

Root [`package.json`](../../package.json) may still name the web workspace **`peer-care-connect`** for `npm run dev`, `npm run build`, and `npm run test:web`. That folder can be **missing** in some checkouts while **`src/`** still holds the app — in that case **web Jest may not be configured** until a `jest.config` and test tree are added next to the web package.

When a web Jest project **does** exist, common patterns are:

- `src/**/__tests__/**/*.test.ts`
- `tests/unit/**`, `tests/integration/**`
- `collectCoverageFrom` globs for `src/lib`, `src/services`, etc.

There is **no** guaranteed single file like `src/lib/booking-flow-type.ts` for booking rules; eligibility is split across `src/components/booking/`, marketplace helpers, and native code (see [Clinic, mobile & hybrid flows](../features/clinic-mobile-hybrid-flows.md)).

---

## Supabase Edge Functions

Handlers that import Deno URLs or `Deno.env` are usually exercised with **Supabase CLI**, **integration/E2E**, or by extracting **pure** helpers into `_shared/` modules that Jest can import from **`backend`** or a dedicated Node package — not assumed covered by web Jest.

---

## Expanding coverage

1. **Web:** Add `jest.config` + tests colocated with repo-root `src/`, or restore the npm workspace package that owns the web build/tests.
2. **Backend:** Add suites under `backend/tests/` and wire them in `backend/package.json`.
3. **Mobile:** Add colocated `*.test.ts` under `theramate-ios-client/` following existing Jest config.
