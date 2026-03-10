# Supabase Schema Edge Cases

**Date:** March 2025  
**Status:** 🔍 Reference  
**Source:** Supabase MCP (execute_sql, list_tables) – project `aikqnvltuwwgifuocvto`

---

## Overview

Database constraints, enums, and unique indexes that can cause failures if application code violates them. Verified via Supabase MCP rather than inferred from code.

---

## Subscriptions

| Constraint | Allowed Values | Edge Case |
|------------|---------------|-----------|
| `subscriptions.status_check` | `active`, `cancelled`, `past_due`, `unpaid` | Stripe returns `trialing`, `incomplete`, `canceled` (US spelling). Webhook must map: `trialing`/`incomplete` → `active`, `canceled` → `cancelled`. Direct INSERT of `trialing` will fail. |
| `subscriptions.billing_cycle_check` | `monthly`, `yearly` | — |

---

## Booking & Sessions

| Constraint / Index | Details | Edge Case |
|--------------------|---------|-----------|
| `create_booking_with_validation` | `p_client_id uuid` | Passing `'anonymous'` or non-UUID fails. Use `upsert_guest_user` for guests. |
| `idx_client_sessions_no_double_booking` | Unique on `(therapist_id, session_date, start_time)` WHERE `status IN ('scheduled','confirmed','in_progress','pending_payment')` | Only these 4 statuses block slots. `expired`, `cancelled`, `declined` do not block. |
| `session_status` enum | `scheduled`, `completed`, `cancelled`, `no_show`, `confirmed`, `in_progress`, `pending_payment`, `pending_approval`, `declined`, `expired` | `p_status` in `create_booking_with_validation` must be one of these. |
| `client_sessions.appointment_type_check` | `clinic`, `mobile` | — |

---

## Mobile Booking Requests

| Constraint / Index | Details | Edge Case |
|--------------------|---------|-----------|
| `uq_mobile_pending_request_slot` | Unique on `(client_id, practitioner_id, requested_date, requested_start_time)` WHERE `status = 'pending'` | Only one pending request per slot. Duplicate pending requests violate constraint. |
| `mobile_booking_requests.status_check` | `pending`, `accepted`, `declined`, `expired`, `cancelled` | — |
| `mobile_booking_requests.payment_status_check` | `pending`, `held`, `captured`, `released`, `refunded`, `payment_failed` | — |
| `mobile_booking_requests.service_type_check` | `clinic`, `mobile` | — |

---

## Marketplace & Products

| Constraint | Allowed Values | Edge Case |
|------------|----------------|-----------|
| `marketplace_bookings.status_check` | `pending`, `paid`, `completed`, `cancelled`, `refunded` | — |
| `practitioner_product_durations.duration_minutes` | `30`, `45`, `60`, `75`, `90` | Other values (20, 40, 120) fail. |
| `practitioner_products.duration_minutes` | Same or NULL | Same. |
| `practitioner_products.category_check` | `massage`, `osteopathy`, `sports_therapy`, `general` | — |
| `practitioner_products.service_type_check` | `clinic`, `mobile`, `both` | — |

---

## Credits

| Constraint | Details | Edge Case |
|------------|---------|-----------|
| `credits.balance_non_negative` | `balance >= 0` | Debits must not exceed balance; use transactional logic. |
| `credit_allocations.amount_check` | `amount > 0` | — |
| `credit_transactions.transaction_type_check` | `session_payment`, `credit_purchase`, `session_earning`, `refund`, `bonus`, `transfer` | — |

---

## Ratings & Scores

| Constraint | Range | Edge Case |
|------------|-------|-----------|
| `session_feedback.rating` | 1–5 | — |
| `practitioner_ratings.rating` | 1–5 | — |
| `detailed_ratings.rating_value` | 1–5 | — |
| `goals.progress` | 0–100 | — |
| `exercise_program_progress.pain_level` | 0–10 | — |
| `exercise_program_progress.difficulty_rating` | 1–5 | — |
| `moods.intensity` | 1–10 | — |
| `users.average_rating` | 0–5 | — |

---

## Users & Roles

| Constraint / Enum | Values | Edge Case |
|-------------------|--------|-----------|
| `user_role` | `client`, `sports_therapist`, `massage_therapist`, `osteopath`, `admin`, `guest` | Guest users should use `guest` role; `upsert_guest_user` returns proper role. |
| `user_profiles.user_role_check` | Same | — |
| `user_profiles.onboarding_status_check` | `pending`, `completed` | — |

---

## Unique Indexes (Conflict Risks)

| Table | Index | Unique On | Edge Case |
|------|-------|-----------|-----------|
| `checkout_sessions` | `idempotency_key_key` | `idempotency_key` | Duplicate key = insert fails. |
| `checkout_sessions` | `stripe_checkout_session_id_key` | `stripe_checkout_session_id` | — |
| `marketplace_bookings` | `stripe_checkout_session_id_key` | `stripe_checkout_session_id` | — |
| `calendar_sync_configs` | `user_id_provider_key` | `(user_id, provider)` | One sync config per provider per user. |
| `client_favorites` | `client_id_therapist_id_key` | `(client_id, therapist_id)` | One favorite per pair. |
| `credits` | `user_id_unique` | `user_id` | One credits row per user. |

---

## Other Constraints

| Table | Constraint | Edge Case |
|------|-----------|-----------|
| `conversations` | `participant_check` | Must have `participant2_id` OR `(guest_email AND pending_account_creation = true)`. |
| `conversations` | `different_participants` | `participant1_id <> participant2_id`. |
| `availability_slots` | `day_of_week_check` | 0–6 (0 = Sunday). |
| `calendar_events` | `event_type_check` | `appointment`, `session`, `block`, `unavailable`. |
| `calendar_events` | `status_check` | `confirmed`, `tentative`, `cancelled`. |
| `stripe_payments` | `status_check` | `pending`, `succeeded`, `failed`, `cancelled`. |
| `treatment_notes` | `template_type` | `SOAP`, `DAP`, `FREE_TEXT`. |
| `slot_holds` | `status_check` | `active`, `released`, `converted`. |

---

## Key Function Signatures (MCP-verified)

| Function | Args | Returns |
|----------|------|---------|
| `create_booking_with_validation` | `p_therapist_id uuid`, `p_client_id uuid`, `p_client_name text`, `p_client_email text`, `p_session_date date`, `p_start_time time`, `p_duration_minutes integer`, `p_session_type text`, `p_price numeric`, ... `p_is_guest_booking boolean`, `p_appointment_type text` (optional) | `jsonb` |
| `check_email_registered` | `p_email text` | `boolean` |
| `accept_mobile_booking_request` | `p_request_id uuid`, `p_stripe_payment_intent_id text` | `jsonb` |
| `upsert_guest_user` | `p_email text`, `p_first_name text`, `p_last_name text`, `p_phone text` | `TABLE(id uuid, ...)` |

---

## Realtime & Migrations (March 2025)

| Table / Change | Migration | Purpose |
|----------------|-----------|---------|
| `subscriptions` | `20260310140000_enable_realtime_subscriptions` | Subscription lapse mid-session: SubscriptionContext detects webhook updates (past_due, cancelled) and refetches immediately |
| `notification_type` enum | `20260310130000_add_exchange_reciprocal_booking_reminder` | Reciprocal booking reminder notifications stored with correct type |

---

## Implemented (March 2025)

| Edge Case | Change |
|-----------|--------|
| Duration 30/45/60/75/90 only | PracticeClientManagement, TreatmentNotes: removed 120, added 75. ProductForm already correct. `productSchema` in validators.ts: refined to allowed values. |
| Duplicate mobile request | MobileBookingRequestFlow: catches 23505 / duplicate errors, shows "You already have a pending request for this practitioner at this date and time." |
| Stripe status mapping | Webhook/sync/refresh already map trialing→active, canceled→cancelled. No change. |

---

## Related Docs

- [BOOKING_MODAL_EDGE_CASES.md](./BOOKING_MODAL_EDGE_CASES.md)
- [MARKETPLACE_BOOKING_EDGE_CASES.md](./MARKETPLACE_BOOKING_EDGE_CASES.md)
- [MOBILE_PRACTITIONER_EDGE_CASES.md](./MOBILE_PRACTITIONER_EDGE_CASES.md)
- [EDGE_CASES_OPEN.md](./EDGE_CASES_OPEN.md)
