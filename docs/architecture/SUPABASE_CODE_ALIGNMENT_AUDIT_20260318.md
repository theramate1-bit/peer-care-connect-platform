# Supabase ↔ Code Alignment Audit

**Date:** 2026-03-18  
**Auditor:** Winston (Architect Agent)  
**Scope:** Treatment exchange, notifications, app_config, core tables

---

## Executive Summary

**Result: ALIGNED.** Database schema and RPCs match code expectations. No critical inconsistencies.

---

## 1. Treatment Exchange Tables

### `treatment_exchange_requests`

| DB Column                                                                            | Code Reference                  | Status             |
| ------------------------------------------------------------------------------------ | ------------------------------- | ------------------ |
| reciprocal_booking_deadline                                                          | treatment-exchange.ts, types.ts | ✅                 |
| reciprocal_reminder_sent_at                                                          | (cron/RPC)                      | ✅                 |
| extension_requested_at, extension_approved_at, extension_approved_by, extension_days | types.ts, ExchangeRequests.tsx  | ✅                 |
| recipient_booking_request_id                                                         | treatment-exchange.ts           | ✅                 |
| recipient_can_book_back                                                              | —                               | ⚠️ Legacy (unused) |

### `mutual_exchange_sessions`

| DB Column                                          | Code Reference                    | Status |
| -------------------------------------------------- | --------------------------------- | ------ |
| practitioner_a_booked, practitioner_b_booked       | treatment-exchange.ts, expire RPC | ✅     |
| credits_deducted                                   | treatment-exchange.ts             | ✅     |
| conversation_id, cancelled_at, cancellation_reason | treatment-exchange.ts             | ✅     |

---

## 2. App Config

| Key                               | Code Reference                                      | Status |
| --------------------------------- | --------------------------------------------------- | ------ |
| exchange_reciprocal_deadline_days | treatment-exchange.ts `getReciprocalDeadlineDays()` | ✅     |
| exchange_reschedule_cap           | decline_exchange_request RPC                        | ✅     |
| exchange_reschedule_window_days   | decline_exchange_request RPC                        | ✅     |

---

## 3. RPCs (Exchange)

| RPC                                         | Code Caller           | Status |
| ------------------------------------------- | --------------------- | ------ |
| decline_exchange_request                    | treatment-exchange.ts | ✅     |
| create_accepted_exchange_session            | treatment-exchange.ts | ✅     |
| create_treatment_exchange_booking           | treatment-exchange.ts | ✅     |
| request_exchange_extension                  | treatment-exchange.ts | ✅     |
| approve_exchange_extension                  | treatment-exchange.ts | ✅     |
| cancel_exchange_request_by_requester        | treatment-exchange.ts | ✅     |
| expire_accepted_exchange_without_reciprocal | (cron)                | ✅     |
| send_exchange_reciprocal_reminders          | (cron)                | ✅     |
| link_slot_hold_to_request                   | treatment-exchange.ts | ✅     |
| get_practitioner_credit_cost                | treatment-exchange.ts | ✅     |
| process_peer_booking_credits                | treatment-exchange.ts | ✅     |
| credits_refund                              | treatment-exchange.ts | ✅     |

---

## 4. Notification Type Enum

All exchange-related values present in `notification_type`:

- exchange_request_received, exchange_request_accepted, exchange_request_declined, exchange_request_expired, exchange_request_cancelled
- exchange_slot_held, exchange_slot_released
- exchange_session_confirmed, exchange_reciprocal_booking_reminder, exchange_reciprocal_expired
- exchange_reciprocal_reminder, exchange_extension_requested, exchange_extension_approved

Code `EXCHANGE_TYPES` in notification-utils.ts covers these. ✅

---

## 5. Supporting Tables

| Table           | Columns Verified                                          | Status |
| --------------- | --------------------------------------------------------- | ------ |
| slot_holds      | request_id                                                | ✅     |
| client_sessions | is_peer_booking, is_guest_booking, cancelled_at           | ✅     |
| users           | treatment_exchange_opt_in, treatment_exchange_preferences | ✅     |
| notifications   | source_type, source_id, type / notification_type          | ✅     |

---

## 6. Minor Gaps (Non-Blocking)

| Item                           | Recommendation                                                                                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| **supabase/types/supabase.ts** | Does not include `treatment_exchange_requests` or `mutual_exchange_sessions`. Code uses custom `ExchangeRequest` / `MutualExchangeSession` interfaces. | Regenerate types (`supabase gen types typescript`) for completeness; no runtime impact. |
| **recipient_can_book_back**    | Present in DB, not referenced in code                                                                                                                  | Leave as-is or document as legacy.                                                      |
| **ExchangeRequest type**       | Missing `extension_approved_by` (DB has it)                                                                                                            | Optional: add to types.ts if needed for UI.                                             |

---

## 7. Verification Queries Run (Supabase MCP)

- `list_tables`
- `information_schema.columns` for treatment_exchange_requests, mutual_exchange_sessions, slot_holds, notifications, client_sessions, users
- `pg_proc` for exchange RPC signatures
- `pg_enum` for notification_type
- `app_config` key listing

---

## Conclusion

Database and code are aligned. No breaking inconsistencies. Optional follow-ups: regenerate Supabase types, add `extension_approved_by` to ExchangeRequest if used in UI.
