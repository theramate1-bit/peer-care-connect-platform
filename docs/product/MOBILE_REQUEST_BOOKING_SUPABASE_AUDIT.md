# Mobile Request Booking – Supabase MCP Audit Report

**Date:** 2026-03-15  
**Scope:** `mobile_booking_requests`, `slot_holds`, notifications, RPCs, cron

---

## Summary

| Area                     | Status            | Notes                                                                                                                   |
| ------------------------ | ----------------- | ----------------------------------------------------------------------------------------------------------------------- |
| RPC permissions          | OK                | `accept_mobile_booking_request` and `decline_mobile_booking_request` have GRANT EXECUTE for authenticated, service_role |
| Accepted → session link  | OK                | All accepted requests have valid `session_id` → `client_sessions`                                                       |
| Pending TTL              | OK                | No pending requests with null `expires_at`                                                                              |
| Cron                     | OK                | `expire-mobile-requests` runs every 5 min (`expire_mobile_requests()` DB function)                                      |
| **Data inconsistencies** | **Issues found**  | See below                                                                                                               |
| **Expiry vs Stripe**     | **Potential gap** | Cron runs DB function only; Edge Function (Stripe cancel) may not be invoked                                            |

---

## Data Inconsistencies

### 1. `expired` + `payment_status = 'captured'` (1 row)

- **ID:** `d37ebc04-7be4-4494-9cf4-b44d0dfb6163`
- **Issue:** Request is `status = 'expired'` but `payment_status = 'captured'`. No session was created (`session_id` null, `accepted_at` null). Expired requests should have payment released, not captured.
- **Impact:** Data inconsistency; client may have been charged without a session. Needs manual review.
- **Fix:** Migration sets `payment_status = 'released'` for this row for DB consistency. Stripe reconciliation should be done separately if refund needed.

### 2. `expired` + `payment_status = 'pending'` (10 rows)

- **Issue:** These expired before payment reached `held`. Leaving as `pending` is reasonable.
- **Action:** No change needed.

### 3. Stale notifications (20+)

- **Issue:** "New Mobile Booking Request" notifications remain undismissed for requests that are expired/accepted/declined.
- **Mitigation:** Dashboard now hides Accept/Decline and shows "Expired" with Dismiss for expired requests. Practitioners can dismiss manually.
- **Future:** Optional background job to auto-dismiss when request expires.

### 4. Slot holds linked to expired requests (2 rows)

- **Status:** Both have `hold_status = 'released'`, so slot holds were released.
- **Conclusion:** No action needed.

---

## Potential Gap: Stripe Hold Release on Expiry

**Current setup:**

- **Cron (every 5 min):** Runs `SELECT public.expire_mobile_requests();` (DB function).
- **DB function:** Updates `status = 'expired'`, `payment_status = 'released'` where applicable, creates client notifications. Does **not** call Stripe.
- **Edge Function `expire-mobile-requests`:** Selects pending expired requests, cancels Stripe PaymentIntent for `held` payments, then updates DB. Must be invoked explicitly (e.g. Supabase Edge Function cron or HTTP).

**Risk:** If only the DB cron runs and the Edge Function is never invoked, Stripe holds for expired requests are never cancelled. Funds stay on hold until Stripe’s built‑in expiry (often ~7 days).

**Recommendation:** Invoke the Edge Function on the same schedule as the DB cron (e.g. every 5 minutes) or have the cron trigger the Edge Function, so both DB state and Stripe state stay in sync.

---

## Accept/Decline Flow Consistency (Fixed 2026-03-15)

**Inconsistency found:** TherapistDashboard’s Accept handler did **not** call `capture-mobile-payment` before the RPC. It went straight to `accept_mobile_booking_request`, which updated the DB to `payment_status='captured'` without actually capturing the Stripe PaymentIntent. As a result, the practitioner would not be paid.

**MobileRequestManagement** had the correct flow: capture first, then RPC.

**Fixes applied:**

1. **Accept:** Call `mobile-payment` with `action: 'capture-mobile-payment'` before calling the RPC. Check and throw on capture error.
2. **Decline:** Check the `release-mobile-payment` response and throw if it fails (previously proceeded to RPC without checking).

---

## Schema Checks

- `mobile_booking_requests.session_id` correctly links to `client_sessions`
- `slot_holds.mobile_request_id` links to `mobile_booking_requests`
- Trigger `release_mobile_request_slot_hold` releases slot holds when request status moves to declined/expired/cancelled

---

## Applied Fixes

1. **Migration `20260315120000_grant_mobile_booking_accept_decline.sql`** – GRANT EXECUTE for accept/decline RPCs (already applied).
2. **Migration `20260315130000_fix_expired_captured_inconsistency.sql`** – Corrects the single `expired` + `captured` row.
