# Comprehensive Database Audit & Fix

**Date:** 2026-03-14  
**Migration:** `20260314140000_comprehensive_gap_fixes.sql`  
**Status:** Applied to production

## Audit Scope

Full inspection of all Supabase database functions, triggers, indexes, RLS policies, and constraints across the booking/payment/auth system.

---

## Findings & Fixes

### CRITICAL

| #   | Finding                                                                         | Risk                                                                                                                                                                                                              | Fix                                                                                                                                     |
| --- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **88 SECURITY DEFINER functions missing `SET search_path`**                     | Search path injection attacks could allow a malicious user to shadow `public` schema objects, escalating privileges through SECURITY DEFINER functions                                                            | Added `SET search_path TO 'public'` to all 88 functions. 7 critical ones fully replaced, 81 patched via `ALTER FUNCTION`. **0 remain.** |
| 2   | **`accept_mobile_booking_request` didn't release slot_hold**                    | When a mobile request was accepted, the slot_hold from the previous migration stayed active, blocking the newly-created real session from being visible correctly                                                 | Added `UPDATE slot_holds SET status = 'released'` after acceptance. Added rollback logic if session creation fails.                     |
| 3   | **`accept_mobile_booking_request` used hardcoded 30min buffer**                 | Different transition types require different buffers (15min default, 30min mobile↔clinic). Hardcoding 30 for all was wrong for clinic↔clinic transitions                                                          | Replaced with `get_directional_booking_buffer_minutes()` — same function used by the `prevent_overlapping_bookings` trigger             |
| 4   | **`create_session_from_mobile_request` didn't set `appointment_type='mobile'`** | Sessions created from mobile requests had NULL/default appointment_type, meaning the directional buffer system treated them as clinic bookings. This broke hybrid practitioners' 30-min travel buffer enforcement | Added `appointment_type = 'mobile'` and `visit_address = client_address` to the INSERT                                                  |

### HIGH

| #   | Finding                                                                           | Risk                                                                                                                                                                                                                                             | Fix                                                                                                                                        |
| --- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 5   | **`prevent_overlapping_bookings` trigger didn't check `mobile_booking_requests`** | A clinic booking could be created that overlaps with a pending mobile request, even though the mobile request has a slot_hold. The trigger only checked `client_sessions` not `mobile_booking_requests`                                          | Added a second check in the trigger against `mobile_booking_requests WHERE status = 'pending'`. This is the DB-level last line of defense. |
| 6   | **No cron job for `expire_mobile_requests()`**                                    | The function existed but was never scheduled. Expired mobile requests would accumulate, their slot_holds would expire via `release_expired_slot_holds` (every 5min), but the requests themselves would stay as `status = 'pending'` indefinitely | Added `cron.schedule('expire-mobile-requests', '*/5 * * * *', ...)` — runs every 5 minutes, matches the slot_hold expiry schedule          |

### MEDIUM

| #   | Finding                                                                   | Risk                                                                                                                                                                    | Fix                                                                                                                            |
| --- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 8   | **Missing composite index on `calendar_events` for blocked-time lookups** | Both the trigger and RPC functions query `calendar_events` by `user_id + event_type` for blocked time. Without an index, this is a full table scan per booking at scale | Added partial index `idx_calendar_events_blocked_time` on `(user_id, event_type) WHERE event_type IN ('block', 'unavailable')` |

### LOW

| #   | Finding                                                  | Risk                                                                                                        | Fix                                                                                                         |
| --- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 9   | **`payments` INSERT policy `WITH CHECK (true)`**         | Any authenticated user could insert a payment record (though SECURITY DEFINER functions do the actual work) | Replaced with `WITH CHECK (auth.role() = 'service_role')`                                                   |
| 10  | **`connect_accounts` INSERT policy `WITH CHECK (true)`** | Any user could insert a Stripe Connect account record                                                       | Replaced with `WITH CHECK (auth.role() = 'service_role' OR auth.uid() = user_id)`                           |
| 11  | **RLS disabled on `app_config` and `email_rate_limit`**  | Any client-side query could read/write these tables                                                         | Enabled RLS. `app_config` gets public read + service_role write. `email_rate_limit` gets service_role only. |

---

## Verification Results

| Check                                                      | Result                                                   |
| ---------------------------------------------------------- | -------------------------------------------------------- |
| SECURITY DEFINER functions without search_path             | **0 remaining** (excluding PostGIS `st_estimatedextent`) |
| `expire-mobile-requests` cron job                          | **Active**, runs every 5 minutes                         |
| `app_config` RLS                                           | **Enabled**                                              |
| `email_rate_limit` RLS                                     | **Enabled**                                              |
| `idx_calendar_events_blocked_time` index                   | **Created**                                              |
| `accept_mobile_booking_request` releases slot_hold         | **Yes**                                                  |
| `create_session_from_mobile_request` sets appointment_type | **'mobile'**                                             |
| `prevent_overlapping_bookings` checks mobile requests      | **Yes**                                                  |

---

## What's Now Protected

| Scenario                                            | Before                               | After                                   |
| --------------------------------------------------- | ------------------------------------ | --------------------------------------- |
| Search path injection on SECURITY DEFINER functions | 88 vulnerable                        | **0 vulnerable**                        |
| Mobile request accepted but slot_hold stays active  | Ghost hold persisted                 | **Released on accept**                  |
| Accepted mobile session has wrong appointment_type  | NULL (treated as clinic)             | **'mobile'**                            |
| Clinic booking overlapping pending mobile request   | Trigger only checked client_sessions | **Also checks mobile_booking_requests** |
| Expired mobile requests never marked as expired     | No cron job existed                  | **Runs every 5 minutes**                |
| Any user inserts into payments/connect_accounts     | Wide open INSERT policy              | **service_role or owner only**          |
| Client reads/writes app_config directly             | No RLS                               | **RLS enforced**                        |
| Blocked-time lookup at scale                        | Full table scan                      | **Partial index**                       |

---

## Remaining Considerations (not fixed in this migration)

1. **`payments` UPDATE policy `WITH CHECK (true)`** — Currently any user can update payment records. This should be tightened to `service_role` only, but needs testing with Edge Functions first to ensure they use the service role key.
2. **Load testing** — No formal p95 latency validation has been done at 10k concurrent users.
3. **Formal transaction isolation** — The booking functions use `pg_advisory_xact_lock` which is good, but the mobile request path relies on sequential checks rather than `SERIALIZABLE` isolation. The slot_hold + trigger combo is defense-in-depth, but edge cases under extreme concurrency (>100 simultaneous bookings for the same practitioner/slot) have not been stress-tested.
