# Supabase live reference (MCP snapshot)

This document is grounded in **Supabase MCP** against project **`aikqnvltuwwgifuocvto`** (Theramate). Use it to avoid schema drift errors when writing RPC callers, RLS-sensitive queries, or edge invokes.

**Refresh:** Re-run MCP **`list_tables`** (with `verbose: true` when you need FK detail), **`list_edge_functions`**, and **`get_advisors`**. After applying migrations locally, deploy and snapshot again.

**Repo migrations:** [`supabase/migrations/`](../../supabase/migrations/) — truth for _intent_; MCP confirms what is **live**.

---

## Security advisor (from MCP)

| Issue            | Table                    | Severity |
| ---------------- | ------------------------ | -------- |
| **RLS disabled** | `public.spatial_ref_sys` | Critical |

PostGIS catalog table **`spatial_ref_sys`** has **RLS off**. Enabling RLS without policies blocks reads; coordinate with DBA before changing. See Supabase [RLS docs](https://supabase.com/docs/guides/database/postgres-row-level-security).

All other **`public.*`** tables reported by MCP have **RLS enabled**.

---

## Edge functions (deployed)

### Production / product (invoke from apps or automations)

These support bookings, payments, email, calendar, SMS, or practitioner tooling. **`verify_jwt: false`** means the anon/service caller must use secrets or alternate auth inside the function — read each handler before calling from the client.

| Slug                           | JWT verify | Role                                                           |
| ------------------------------ | ---------- | -------------------------------------------------------------- |
| `stripe-webhooks`              | no         | Stripe webhook handler                                         |
| `stripe-webhook`               | no         | Legacy/alternate webhook entry (confirm which URL Stripe uses) |
| `stripe-payment`               | yes        | Clinic checkout / payment intents                              |
| `mobile-payment`               | no         | Mobile request payments                                        |
| `mobile-payment-v2`            | no         | Mobile payment variant                                         |
| `send-email`                   | yes        | Transactional email via Resend                                 |
| `send-booking-notification`    | yes        | Booking-related emails (confirm/cancel/etc.)                   |
| `notify-guest-message`         | yes        | Email when practitioner messages a guest                       |
| `guest-cancel-session`         | no         | Guest/token cancel path                                        |
| `customer-portal`              | yes        | Stripe customer portal                                         |
| `create-checkout`              | yes        | Checkout session creation                                      |
| `check-subscription`           | yes        | Subscription checks                                            |
| `get-subscription`             | yes        | Subscription read                                              |
| `sync-stripe-subscription`     | yes        | Sync subscription state                                        |
| `refresh-subscription`         | yes        | Refresh subscription                                           |
| `process-credit-allocations`   | yes        | Credit allocation job                                          |
| `process-reminders`            | yes        | Session reminders                                              |
| `send-sms`                     | yes        | SMS delivery                                                   |
| `expire-mobile-requests`       | yes        | Expire stale mobile requests                                   |
| `google-calendar-sync`         | yes        | Google Calendar sync                                           |
| `location-proxy`               | no         | Geocoding / location proxy                                     |
| `soap-notes`                   | yes        | SOAP note processing                                           |
| `voice-to-text`                | yes        | Voice transcription                                            |
| `transcribe-file`              | yes        | File transcription                                             |
| `summarize-session`            | yes        | Session summarisation                                          |
| `oauth-callback`               | yes        | OAuth completion helper                                        |
| `auth-callback`                | yes        | Auth callback helper                                           |
| `stripe-refund`                | yes        | Refunds                                                        |
| `ensure-qualifications-bucket` | yes        | Storage bucket setup                                           |
| `email-health-check`           | yes        | Email pipeline health                                          |
| `retry-failed-emails`          | yes        | Retry failed sends                                             |
| `create-webhook-endpoint`      | yes        | Stripe webhook setup helper                                    |
| `create-yearly-prices`         | yes        | Billing admin                                                  |
| `agent-memory`                 | yes        | Agent memory                                                   |
| `ai-agent-core`                | yes        | AI agent                                                       |
| `extract-metrics`              | yes        | Metrics extraction                                             |
| `report-export`                | yes        | Reporting export                                               |

### Debug / test / temporary

Do **not** rely on these in production UX; they exist on the linked project for troubleshooting.

`create-checkout-debug`, `debug-env`, `debug-auth`, `simple-test`, `test-env`, `test-env-vars`, `test-access`, `stripe-test`, `test-stripe-env`, `webhook-test`, `webhook-verify`, `webhook-simple-test`, `webhook-comprehensive-test`, `create-checkout-minimal`, `set-env-vars`, `tmp-deploy-check`, `tmp-stripe-check`

### Local repo vs deployed

Edge **source** maintained in this repo under **`supabase/functions/`** includes (subset):  
`stripe-payment`, `stripe-webhooks`, `send-email`, `send-booking-notification`, `notify-guest-message`, `mobile-payment`, `mobile-payment-v2`, `customer-portal`, `google-calendar-sync`, `location-proxy`, `send-sms`, `soap-notes`, `transcribe-file`, `cleanup-recordings`, `ensure-qualifications-bucket`, `verify-checkout`, `auth-gateway`, `report-export`, `ai-soap-transcribe`.

Deployed slugs **not** all appear in that folder — older deploys may reference **`peer-care-connect`** or **`/tmp`** paths in MCP metadata. **Treat MCP `list_edge_functions` as the inventory of what runs remotely.**

---

## `public` tables — grouped by domain

Row counts are **approximate** from MCP at snapshot time (they change in production).

### Booking, sessions & marketplace

| Table                       | RLS | Rows (snapshot) | Notes                                                                                                 |
| --------------------------- | --- | --------------- | ----------------------------------------------------------------------------------------------------- |
| `client_sessions`           | on  | 15              | Core booked session; `appointment_type`, `is_guest_booking`, `guest_view_token`, `payment_collection` |
| `mobile_booking_requests`   | on  | 19              | Mobile/hybrid request workflow; links to `session_id` when accepted                                   |
| `practitioner_products`     | on  | 17              | **`service_type`** `clinic` / `mobile` / `both` drives marketplace filtering                          |
| `practitioner_availability` | on  | 7               | `working_hours` JSON + timezone                                                                       |
| `slot_holds`                | on  | 10              | Temporary holds during checkout / mobile flow                                                         |
| `calendar_events`           | on  | 730             | Busy blocks + external sync                                                                           |
| `availability_slots`        | on  | 0               | Legacy/auxiliary slots                                                                                |
| `marketplace_bookings`      | on  | 19              | Marketplace audit/history                                                                             |
| `checkout_sessions`         | on  | 0               | Stripe checkout idempotency                                                                           |
| `booking_attempts_log`      | on  | 10              | Debugging booking failures                                                                            |
| `pre_assessment_forms`      | on  | 4               | Intake linked to `session_id`                                                                         |

### Identity & directory

| Table              | RLS | Rows | Notes                                                                     |
| ------------------ | --- | ---- | ------------------------------------------------------------------------- |
| `users`            | on  | 28   | **`user_role`**, **`therapist_type`**, clinic/base coords, Stripe Connect |
| `client_profiles`  | on  | 7    | Extended client profile                                                   |
| `favorites`        | on  | 0    | Saved practitioners (native hearts)                                       |
| `client_favorites` | on  | 0    | Alternate favorites model                                                 |

### Messaging

| Table                     | RLS | Rows |
| ------------------------- | --- | ---- |
| `conversations`           | on  | 7    |
| `messages`                | on  | 12   |
| `message_attachments`     | on  | 0    |
| `message_status_tracking` | on  | 12   |
| `message_notifications`   | on  | 12   |

### Payments & subscriptions

| Table              | RLS | Rows |
| ------------------ | --- | ---- |
| `payments`         | on  | 14   |
| `payment_intents`  | on  | 6    |
| `connect_accounts` | on  | 36   |
| `subscriptions`    | on  | 8    |
| `customers`        | on  | 8    |

### Credits

| Table                 | RLS | Rows |
| --------------------- | --- | ---- |
| `credits`             | on  | 8    |
| `credit_transactions` | on  | 17   |
| `credit_allocations`  | on  | 16   |

### Treatment exchange & peer care

| Table                         | RLS | Rows |
| ----------------------------- | --- | ---- |
| `treatment_exchange_requests` | on  | 4    |
| `mutual_exchange_sessions`    | on  | 0    |
| `peer_sessions`               | on  | 0    |

### Notifications & reminders

| Table                      | RLS | Rows |
| -------------------------- | --- | ---- |
| `notifications`            | on  | 60   |
| `reminders`                | on  | 15   |
| `notification_preferences` | on  | 10   |

### Clinical & content

| Table                                  | Notes         |
| -------------------------------------- | ------------- |
| `treatment_notes`                      | on — 25 rows  |
| `session_recordings`                   | on — 4 rows   |
| `exercise_library`                     | on — 346 rows |
| `home_exercise_programs`               | on — 1 row    |
| `qualifications`                       | on — 9 rows   |
| `practitioner_qualification_documents` | on — 4 rows   |

### Deprecated / empty placeholders

| Table          | MCP comment                                    |
| -------------- | ---------------------------------------------- |
| `client_notes` | **DEPRECATED** — migrated to `treatment_notes` |

### Large ancillary schemas (often zero rows)

Many tables exist for analytics, projects, CPD, billing, data-quality, agent memory, etc. They are **real tables** with RLS on; feature code may not touch them yet. Discover via MCP **`list_tables`** `verbose: true` or **`information_schema`** before writing joins.

---

## Critical columns (verified via MCP SQL)

Use these when wiring UI or RPC payloads so inserts/selects match live types.

### `users`

- **`id`** (uuid, PK) — matches **`auth.users`** for registered accounts.
- **`user_role`** — enum `user_role` (includes `client`, `guest`, therapist disciplines, `admin`, …).
- **`therapist_type`** — enum `therapist_type` (`clinic_based`, `mobile`, `hybrid`).
- **Practice location:** `clinic_address`, `clinic_latitude`, `clinic_longitude`, `base_address`, `base_latitude`, `base_longitude`, `mobile_service_radius_km`.
- **Payments:** `stripe_connect_account_id`, **`accept_in_person_payment`** (bool, NOT NULL), **`sms_reminders_enabled`** (bool, NOT NULL).
- **Marketing/booking:** `booking_slug`, `profile_photo_url`, `specializations`, `hourly_rate`, etc.

### `client_sessions`

- **`therapist_id`**, **`client_id`** (nullable for legacy flows but normally set).
- **`appointment_type`** (text, NOT NULL) — `clinic` vs `mobile`.
- **`visit_address`** — required for mobile sessions when enforced by RPC.
- **`is_guest_booking`** (bool, NOT NULL).
- **`guest_view_token`**, **`payment_collection`** (text, NOT NULL), **`session_timezone`** (text, NOT NULL).
- **`status`** — enum `session_status`.
- Stripe / fees: `stripe_payment_intent_id`, `platform_fee_amount`, `practitioner_amount`, `payment_status`.

### `practitioner_products`

- **`price_amount`** (integer, minor units / pence-style — align with app formatting).
- **`service_type`** (text, nullable) — `clinic` / `mobile` / `both` for marketplace filtering.
- **`duration_minutes`**, **`is_active`**, Stripe IDs optional.

### `mobile_booking_requests`

- **`client_id`**, **`practitioner_id`**, **`product_id`**, **`session_id`** (when created).
- **`client_address`**, **`client_latitude`**, **`client_longitude`**.
- **`total_price_pence`**, fee splits in pence.
- **`status`**, **`payment_status`**, **`expires_at`**, **`pre_assessment_payload`** (jsonb).

### `practitioner_availability`

- **`working_hours`** (jsonb, NOT NULL), **`timezone`**, defaults: `default_session_time`, `default_duration_minutes`, `default_session_type`.

### `conversations` / `messages`

- **`conversations.participant1_id`**, **`participant2_id`** (nullable for guest flows), **`guest_email`**.
- **`messages.encrypted_content`**, **`content_hash`** (NOT NULL) — encryption expectations for real-time messaging.

---

## Practical rules (avoid runtime errors)

1. **Never assume a column exists** without checking MCP or migrations — generated **`types/database.ts`** may be partial (especially mobile client).
2. **RLS:** If a query returns empty or fails with policy errors, fix policies or use an RPC with **`SECURITY DEFINER`** intentionally — don’t ship service-role keys in client apps.
3. **`client_sessions` NOT NULL columns:** `appointment_type`, `payment_collection`, `session_timezone`, `is_guest_booking` must always be satisfied on insert/update paths.
4. **Guest vs client:** Prefer **`is_guest_booking`** over guessing from **`client_id`**.
5. **Products:** Web clinic booking filters **`service_type`** — mobile-only products disappear from that flow by design.
6. **Edge invokes:** Match **`verify_jwt`** — when `true`, send user JWT; when `false`, follow function-specific auth (often service role inside function only).

---

## Related docs

- [Database schema](./database-schema.md) — conceptual ER and junior-oriented narrative (may simplify enums).
- [Database tables MCP reference](./database-tables-mcp-reference.md) — deeper table inventory if present.
- [Edge Functions](./edge-functions.md) — prose descriptions & callers (verify against this snapshot).
- [Guest features](../features/guest/README.md), [Client features](../features/client/README.md), [Practitioner types](../features/practitioner-types/README.md)

---

**Snapshot notes:** Table row counts and function list reflect MCP at authoring time; they drift daily in production.
