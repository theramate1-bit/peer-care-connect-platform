# Mobile Booking Flow – Supabase MCP Audit

**Date:** 2026-03-16  
**Method:** Supabase MCP `execute_sql`, `list_edge_functions`  
**Scope:** Full flow from request creation → Stripe → Accept/Decline

---

## Executive Summary

| Area                              | Status      | Notes                                                                                                |
| --------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------- |
| RPC EXECUTE grants                | ✅ OK       | All mobile RPCs have EXECUTE for authenticated, service_role, anon                                   |
| mobile_booking_requests schema    | ✅ OK       | Columns align with flow                                                                              |
| RLS policies                      | ✅ OK       | Client/practitioner isolation correct                                                                |
| Slot holds & trigger              | ✅ OK       | `trg_release_mobile_slot_hold` fires on status change                                                |
| Cron jobs                         | ✅ OK       | `expire_mobile_requests()` every 5 min; `release_expired_slot_holds()` every 5 min                   |
| **pending + captured**            | ⚠️ Expected | 2 rows: auto-capture payment methods (Stripe docs); Accept flow now supports                         |
| **Stripe hold release on expiry** | 🔴 GAP      | DB function updates status only; Edge Function `expire-mobile-requests` not invoked by cron          |
| **Decline RPC param mismatch**    | ⚠️ Minor    | TherapistDashboard passes only `p_request_id`, `p_decline_reason`; RPC has 6 params (defaults cover) |
| **Stale notifications**           | ⚠️ UX       | Notifications for expired requests remain; no auto-dismiss                                           |

---

## 1. RPC Permissions

```
accept_mobile_booking_request     → authenticated, service_role, anon, PUBLIC ✓
cancel_mobile_request             → authenticated, service_role, anon, PUBLIC ✓
create_mobile_booking_request     → authenticated, service_role, anon, PUBLIC ✓
create_session_from_mobile_request→ authenticated, service_role, anon, PUBLIC ✓
decline_mobile_booking_request    → authenticated, service_role, anon, PUBLIC ✓
expire_mobile_requests            → authenticated, service_role, anon, PUBLIC ✓
get_practitioner_mobile_requests  → authenticated, service_role, anon, PUBLIC ✓
```

---

## 2. RPC Signatures (DB vs Frontend)

| RPC                              | DB Args                                                                                                                 | Frontend (TherapistDashboard)       | Frontend (MobileRequestManagement) |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ---------------------------------- |
| `accept_mobile_booking_request`  | p_request_id, p_stripe_payment_intent_id                                                                                | ✓ both                              | ✓ both                             |
| `decline_mobile_booking_request` | p_request_id, p_decline_reason, p_alternate_date, p_alternate_start_time, p_alternate_suggestions, p_practitioner_notes | p_request_id, p_decline_reason only | All except p_practitioner_notes    |

**Gap:** TherapistDashboard inline Decline passes only 2 params. Defaults apply; no runtime error. MobileRequestManagement passes full alternate-suggestion payload when user provides it.

---

## 3. Edge Functions

| Function               | verify_jwt | Used for mobile flow                                                                                            |
| ---------------------- | ---------- | --------------------------------------------------------------------------------------------------------------- |
| mobile-payment         | false      | create-mobile-checkout-session, confirm-mobile-checkout-session, capture-mobile-payment, release-mobile-payment |
| stripe-payment         | true       | Proxied by mobile-payment (uses service_role)                                                                   |
| expire-mobile-requests | true       | **Not invoked by cron** – Stripe PI cancel never runs                                                           |

**Gap:** `expire_mobile_requests()` DB function runs every 5 min via cron. It sets `payment_status = 'released'` for held payments but does **not** call Stripe. The Edge Function `expire-mobile-requests` would cancel Stripe PaymentIntents for expired held payments, but nothing invokes it. Result: Stripe holds remain until Stripe’s own expiry (~7 days).

**Fix:** Add a cron or scheduled job that invokes the `expire-mobile-requests` Edge Function every 5 min (e.g. Supabase scheduled function or external cron calling the function URL).

---

## 4. Data State (Live Snapshot)

| status      | payment_status | count |
| ----------- | -------------- | ----- |
| accepted    | captured       | 2     |
| declined    | released       | 1     |
| expired     | pending        | 10    |
| expired     | released       | 2     |
| **pending** | **captured**   | **2** |

**pending + captured:** Expected for payment methods that auto-capture (e.g. some wallets). Accept flow now handles this: skips capture call, proceeds to RPC. Decline correctly blocked (would need refund).

---

## 5. Slot Holds

- Pending requests with `payment_status = captured` have **active** slot holds until Accept.
- On Accept, `accept_mobile_booking_request` releases the slot hold.
- Trigger `trg_release_mobile_slot_hold` releases holds when status moves to accepted/declined/expired/cancelled.

---

## 6. Flow Gaps Summary

| #   | Gap                                         | Severity | Fix                                                                       |
| --- | ------------------------------------------- | -------- | ------------------------------------------------------------------------- |
| 1   | Stripe hold not cancelled on expiry         | High     | Invoke `expire-mobile-requests` Edge Function on same schedule as DB cron |
| 2   | pending + captured Accept previously failed | Fixed    | Frontend now allows Accept when payment_status = held OR captured         |
| 3   | Decline shown when captured                 | Fixed    | Dashboard fetches payment_status, hides Decline when captured             |
| 4   | Stale notifications for expired requests    | Low      | Optional: auto-dismiss or filter in UI                                    |

---

## 7. Consistency Audit (2026-03-16)

### FOR UPDATE + Outer Join

- **Error:** `FOR UPDATE cannot be applied to the nullable side of an outer join`
- **Cause:** `accept_mobile_booking_request` had `FOR UPDATE` with `LEFT JOIN practitioner_products`.
- **Fix:** Use `FOR UPDATE OF mbr` to lock only `mobile_booking_requests`. Applied via migration `20260316100000_fix_accept_mobile_booking_for_update.sql` (Supabase MCP).
- **Source fix:** `20260314140000_comprehensive_gap_fixes.sql` updated so migrations are consistent.

### Other FOR UPDATE Usage (no issues)

- `credits` / `credit_allocations`: Simple `SELECT ... FROM credits FOR UPDATE` – no joins.
- `create_booking_with_validation` (hybrid buffer): `FOR UPDATE` on `client_sessions` subquery only – no outer join.
- RLS policies: `FOR UPDATE USING (...)` – not affected.

### create_session_from_mobile_request Call

- **Bug:** `comprehensive_gap_fixes` used `SELECT id INTO ... FROM create_session_from_mobile_request(...)` – function returns `uuid`, not a row with `id`.
- **Fix:** `SELECT public.create_session_from_mobile_request(p_request_id) INTO v_session_id`.

### Accept/Decline Frontend Flow (verified)

- **TherapistDashboard** and **MobileRequestManagement** both: capture only when `held`, skip when `captured`, pass `p_request_id` and `p_stripe_payment_intent_id` to RPC.
- Decline blocks when `payment_status === 'captured'`.

### slot_holds

- Column is `status` (values `active`, `released`), not `hold_status`. All migrations use `status` consistently.
- Trigger `trg_release_mobile_slot_hold` releases on decline/expired/cancelled; Accept releases manually in RPC.

---

## 8. Recommended Actions

1. **Stripe expiry sync:** Configure Supabase Edge Function cron or external scheduler to call `expire-mobile-requests` every 5 minutes.
2. **Verify expire-mobile-requests source:** Confirm the deployed Edge Function exists in this repo or document its source; add to repo if missing.
3. **No MCP changes needed** for RPC grants or schema; current setup is correct.
