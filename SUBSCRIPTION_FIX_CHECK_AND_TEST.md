# Subscription back-button fix — check and test report

**Date:** 2026-02-27

---

## 1. Implementation checks (verified)

| Check | Result | Where verified |
|-------|--------|----------------|
| create-checkout success_url | OK | `success_url` = `/subscription-success?session_id={CHECKOUT_SESSION_ID}` in `supabase/functions/create-checkout/index.ts` |
| Webhook `customer.subscription.deleted` | OK | Uses `status: "cancelled"` (matches DB CHECK) in `stripe-webhook/index.ts` |
| get-subscription response | OK | Returns `hasActiveSubscription` (active \|\| trialing) and `Cache-Control: no-store` in `get-subscription/index.ts` |
| SubscriptionSuccess page | OK | Exists at `src/pages/SubscriptionSuccess.tsx`; polls `get-subscription`, redirects when active; no entitlement logic |
| Route /subscription-success | OK | In `AppContent.tsx` with `SimpleProtectedRoute` (no requireSubscription) |
| SubscriptionContext access | OK | Only `status === 'active' \|\| 'trialing'` set `subscribed = true` in `SubscriptionContext.tsx` |
| RLS: subscriptions INSERT | OK | No public INSERT policy on `subscriptions` (only SELECT + UPDATE for own row); `has_active_subscription(uuid)` exists in DB |

---

## 2. Lint

- **Result:** No linter errors on edited files (`SubscriptionSuccess.tsx`, `AppContent.tsx`, `SubscriptionContext.tsx`).

---

## 3. Build

- **Command:** `npm run build` (Vite)
- **Result:** **Passed** (exit 0). Build completed in ~11.5s.
- **Note:** Existing Vite warnings (dynamic vs static imports) are unchanged; no new errors from subscription changes.

---

## 4. Unit / integration tests

- **Command:** `npm run test:unit` (with stripe/subscription pattern) — run timed out; failures observed are **pre-existing**:
  - Jest/jsdom: `window.location` assignment triggers "Not implemented: navigation" in `src/test/setup.ts`.
  - TypeScript errors in `src/lib/notification-system.ts` (Supabase type inference) and `src/lib/__tests__/e2e-onboarding.test.ts` (vitest import).
- **Conclusion:** No tests were run that target the new subscription-success or get-subscription behavior. The subscription back-button fix does not touch notification-system or e2e-onboarding; test failures are unrelated.

---

## 5. Manual test checklist (recommended)

Run these in a dev environment with Stripe (test mode) and Supabase:

1. **Initial subscribe**
   - Log in as practitioner → Pricing → choose plan → Checkout.
   - Complete payment on Stripe Checkout.
   - **Expect:** Redirect to `/subscription-success?...` → “Setting up your subscription…” → after webhook runs, redirect to dashboard. No access before DB shows active.

2. **Back button**
   - After reaching dashboard from step 1, click browser Back to subscription-success.
   - **Expect:** Page shows spinner and re-polls; if already active, redirects again. No “free” access from URL alone.

3. **Upgrade / downgrade (portal)**
   - Subscription → Manage (customer portal) → change plan or cancel.
   - **Expect:** Return to `/settings/subscription`. Access reflects webhook-updated DB (upgrade/downgrade unchanged).

4. **get-subscription**
   - With valid session, call `get-subscription` (e.g. from SubscriptionSuccess or devtools).
   - **Expect:** `hasActiveSubscription` and `status`; response headers include `Cache-Control: no-store, no-cache, must-revalidate`.

---

## 6. Summary

- **Implementation:** All subscription back-button fix items are present and consistent with the design (webhook = source of truth, success page only polls, no entitlement on success URL).
- **Build:** Passes.
- **Lint:** Clean on changed files.
- **Automated tests:** Existing test env issues; no subscription-specific tests run. Manual testing (above) is recommended before release.
