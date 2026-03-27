# Database Schema

This document describes the core data structures in Peer Care Connect. It is written for junior developers who need to understand how data flows through the system.

## Overview

The platform uses **Supabase** (PostgreSQL) as its database. All tables live in the `public` schema. Row Level Security (RLS) enforces access control—users see only data they are allowed to access.

**Key concepts:**

- **Practitioners** are users with `user_role = 'practitioner'`. They offer services, manage availability, and see the practice dashboard.
- **Clients** are registered users who book sessions. `client_id` on sessions links to their `users` row.
- **Guests** book without an account. Sessions have `is_guest_booking = true` and may use a guest `users` row.
- **Practitioner types:** `clinic_based`, `mobile`, `hybrid`—determine booking flows and location logic. See [Practitioner Types](../product/PRACTITIONER_TYPE_CLINIC_BASED.md).

---

## Entity Relationship (Simplified)

```
users ◄──► client_sessions (therapist_id, client_id)
users ◄──► practitioner_availability (user_id)
users ◄──► practitioner_products (practitioner_id)
users ◄──► calendar_events (user_id)
users ◄──► credits (user_id)
users ◄──► notifications (recipient_id)
users ◄──► treatment_exchange_requests (requester_id, recipient_id)
users ◄──► slot_holds (practitioner_id)
client_sessions ◄──► mobile_booking_requests (session_id)
client_sessions ◄──► mutual_exchange_sessions (via treatment_exchange_requests)
conversations ◄──► messages (conversation_id)
```

---

## Core Tables

### `users`

The central identity table. Links to Supabase Auth via `id = auth.uid()` for authenticated users. Guests also get a `users` row.

| Column                                                  | Type         | Purpose                                                 |
| ------------------------------------------------------- | ------------ | ------------------------------------------------------- |
| `id`                                                    | uuid         | Primary key, matches auth.uid for authenticated users   |
| `email`                                                 | varchar      | Unique                                                  |
| `first_name`, `last_name`                               | varchar      | Display name                                            |
| `user_role`                                             | enum         | `client`, `practitioner`, `admin`, `guest`              |
| `therapist_type`                                        | enum         | `clinic_based`, `mobile`, `hybrid` (practitioners only) |
| `clinic_address`, `clinic_latitude`, `clinic_longitude` | text/numeric | Clinic location (clinic_based, hybrid)                  |
| `base_address`, `base_latitude`, `base_longitude`       | text/numeric | Base location for mobile visits (mobile, hybrid)        |
| `mobile_service_radius_km`                              | integer      | Radius for mobile service (mobile, hybrid)              |
| `treatment_exchange_opt_in`                             | boolean      | Can receive treatment exchange requests                 |
| `stripe_connect_account_id`                             | text         | Stripe Connect for payouts                              |
| `is_guest_booking`                                      | boolean      | N/A on users; used on `client_sessions`                 |

**See:** [PRACTITIONER_TYPE_CLINIC_BASED](../product/PRACTITIONER_TYPE_CLINIC_BASED.md), [PRACTITIONER_TYPE_MOBILE](../product/PRACTITIONER_TYPE_MOBILE.md), [PRACTITIONER_TYPE_HYBRID](../product/PRACTITIONER_TYPE_HYBRID.md).

---

### `client_sessions`

Booked sessions between a practitioner (therapist) and a client or guest.

| Column                                        | Type        | Purpose                                                                                                    |
| --------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------- |
| `id`                                          | uuid        | Primary key                                                                                                |
| `therapist_id`                                | uuid        | FK → users (practitioner)                                                                                  |
| `client_id`                                   | uuid        | FK → users (client); null for guest until linked                                                           |
| `client_name`, `client_email`, `client_phone` | varchar     | Always populated (from booking form)                                                                       |
| `session_date`                                | date        | Session date                                                                                               |
| `start_time`                                  | time        | Start time (HH:mm:ss)                                                                                      |
| `duration_minutes`                            | integer     | Session length                                                                                             |
| `session_type`                                | varchar     | Service name (e.g. "Sports Massage")                                                                       |
| `status`                                      | enum        | `scheduled`, `confirmed`, `in_progress`, `completed`, `cancelled`, `no_show`, `pending_payment`, `expired` |
| `appointment_type`                            | text        | `clinic` or `mobile`                                                                                       |
| `visit_address`                               | text        | Client address for mobile sessions                                                                         |
| `is_guest_booking`                            | boolean     | True = booked without account                                                                              |
| `guest_view_token`                            | text        | Token for guest to view booking without login                                                              |
| `is_peer_booking`                             | boolean     | True = treatment exchange session                                                                          |
| `credit_cost`                                 | integer     | Credits used (for exchange sessions)                                                                       |
| `expires_at`                                  | timestamptz | For pending_payment; slot expires if not paid                                                              |

**Status flow:** `pending_payment` → payment → `confirmed`; or `expires_at` passes → `expired`. Calendar/diary show only `scheduled`, `confirmed`, `in_progress`, `completed`.

**See:** [GUEST_VS_CLIENT_SYSTEM_LOGIC_TABLE](../product/GUEST_VS_CLIENT_SYSTEM_LOGIC_TABLE.md).

---

### `practitioner_availability`

Working hours per practitioner. One row per practitioner.

| Column                     | Type    | Purpose                                                                                                                                                                            |
| -------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `user_id`                  | uuid    | FK → users                                                                                                                                                                         |
| `working_hours`            | jsonb   | Schedule by day, e.g. `{ "monday": { "enabled": true, "start": "09:00", "end": "17:00" }, "hours": [{ "start": "09:00", "end": "12:00" }, { "start": "14:00", "end": "17:00" }] }` |
| `timezone`                 | text    | Practitioner timezone                                                                                                                                                              |
| `default_duration_minutes` | integer | Default session length                                                                                                                                                             |

**Slot generation** uses `working_hours` + `client_sessions` + `calendar_events` (blocks) + `slot_holds` to compute available times.

---

### `practitioner_products`

Services offered by a practitioner (name, price, duration, service type).

| Column                                 | Type    | Purpose                        |
| -------------------------------------- | ------- | ------------------------------ |
| `id`                                   | uuid    | Primary key                    |
| `practitioner_id`                      | uuid    | FK → users                     |
| `name`, `description`                  | text    | Service details                |
| `price_amount`                         | integer | Price in pence                 |
| `duration_minutes`                     | integer | Session length                 |
| `service_type`                         | text    | `clinic`, `mobile`, or `both`  |
| `is_active`                            | boolean | Shown in marketplace when true |
| `stripe_product_id`, `stripe_price_id` | text    | Stripe catalog links           |

**Service type** drives which booking flows are available for clinic/mobile/hybrid practitioners.

---

### `calendar_events`

Blocked or unavailable time. Used for "block time" and calendar sync.

| Column                   | Type        | Purpose                                     |
| ------------------------ | ----------- | ------------------------------------------- |
| `user_id`                | uuid        | FK → users (practitioner)                   |
| `start_time`, `end_time` | timestamptz | Block window                                |
| `event_type`             | text        | `block`, `unavailable`, `appointment`, etc. |
| `title`                  | text        | Display label                               |

Slot generation excludes times overlapping `block` or `unavailable` events.

---

### `slot_holds`

Temporary reservation of a slot (e.g. during checkout, treatment exchange request). Prevents double-booking.

| Column                                   | Type      | Purpose                                            |
| ---------------------------------------- | --------- | -------------------------------------------------- |
| `practitioner_id`                        | uuid      | FK → users                                         |
| `session_date`, `start_time`, `end_time` | date/time | Reserved slot                                      |
| `duration_minutes`                       | integer   | Slot length                                        |
| `expires_at`                             | timestamp | Hold expires; released by cron or RPC              |
| `status`                                 | text      | `active`, `released`                               |
| `request_id`                             | uuid      | FK → treatment_exchange_requests (when exchange)   |
| `mobile_request_id`                      | uuid      | FK → mobile_booking_requests (when mobile request) |

---

### `treatment_exchange_requests`

Request from one practitioner to another for a treatment exchange.

| Column                                                                 | Type        | Purpose                                                   |
| ---------------------------------------------------------------------- | ----------- | --------------------------------------------------------- |
| `requester_id`                                                         | uuid        | Practitioner requesting treatment                         |
| `recipient_id`                                                         | uuid        | Practitioner who will provide it                          |
| `requested_session_date`, `requested_start_time`, `requested_end_time` | date/time   | Requested slot                                            |
| `duration_minutes`                                                     | integer     | Requested length                                          |
| `status`                                                               | text        | `pending`, `accepted`, `declined`, `expired`, `cancelled` |
| `expires_at`                                                           | timestamptz | Request expires (e.g. 24h)                                |
| `recipient_can_book_back`                                              | boolean     | Recipient can book reciprocal session                     |

On accept, a `mutual_exchange_sessions` row is created; reciprocal booking creates `client_sessions` with `is_peer_booking = true`.

**See:** [How Treatment Exchange Works](../features/how-treatment-exchange-works.md), [DASHBOARD_AND_TREATMENT_EXCHANGE_FLOW](../product/DASHBOARD_AND_TREATMENT_EXCHANGE_FLOW.md).

---

### `mutual_exchange_sessions`

Records a completed or in-progress treatment exchange (both practitioners' sessions).

| Column                                           | Type      | Purpose                           |
| ------------------------------------------------ | --------- | --------------------------------- |
| `exchange_request_id`                            | uuid      | FK → treatment_exchange_requests  |
| `practitioner_a_id`, `practitioner_b_id`         | uuid      | The two practitioners             |
| `session_date`, `start_time`, `end_time`         | date/time | Session slot                      |
| `duration_minutes`                               | integer   | Length                            |
| `credits_exchanged`                              | integer   | Credit cost                       |
| `practitioner_a_booked`, `practitioner_b_booked` | boolean   | Both reciprocal sessions booked   |
| `credits_deducted`                               | boolean   | Credits deducted when both booked |

---

### `mobile_booking_requests`

Client requests a mobile visit (practitioner travels to client). Practitioner must Accept or Decline.

| Column                                                  | Type         | Purpose                                      |
| ------------------------------------------------------- | ------------ | -------------------------------------------- |
| `client_id`                                             | uuid         | FK → users (null for guest)                  |
| `practitioner_id`                                       | uuid         | FK → users                                   |
| `product_id`                                            | uuid         | FK → practitioner_products                   |
| `requested_date`, `requested_start_time`                | date/time    | Requested slot                               |
| `client_address`, `client_latitude`, `client_longitude` | text/numeric | Visit location                               |
| `status`                                                | text         | `pending`, `accepted`, `declined`, `expired` |
| `session_id`                                            | uuid         | FK → client_sessions (after accept)          |
| `expires_at`                                            | timestamptz  | TTL for practitioner to respond              |

---

### `credits`

Per-user credit balance for treatment exchange.

| Column                        | Type    | Purpose         |
| ----------------------------- | ------- | --------------- |
| `user_id`                     | uuid    | FK → users      |
| `balance`                     | integer | Current credits |
| `total_earned`, `total_spent` | integer | Lifetime totals |

1 credit ≈ 1 minute of treatment. Earned from completed client sessions; spent on treatment exchange.

---

### `notifications`

In-app notifications for users.

| Column                     | Type         | Purpose                                                                             |
| -------------------------- | ------------ | ----------------------------------------------------------------------------------- |
| `recipient_id`             | uuid         | FK → users                                                                          |
| `type`                     | enum         | e.g. `booking_request`, `booking_confirmed`, `exchange_reciprocal_booking_reminder` |
| `title`, `body`            | varchar/text | Display content                                                                     |
| `source_type`, `source_id` | text         | e.g. `treatment_exchange_request`, request UUID                                     |
| `read_at`                  | timestamptz  | When read (canonical)                                                               |
| `dismissed_at`             | timestamptz  | Soft dismiss                                                                        |
| `payload`                  | jsonb        | Extra data for routing/actions                                                      |

---

### `conversations` & `messages`

Messaging between practitioners and clients/guests.

| Table           | Key columns                                                             |
| --------------- | ----------------------------------------------------------------------- |
| `conversations` | `participant1_id`, `participant2_id`, `conversation_key`, `guest_email` |
| `messages`      | `conversation_id`, `sender_id`, `encrypted_content`, `message_status`   |

Guests get `notify-guest-message` email (link to login). Clients use in-app messaging.

**See:** [Messaging](../features/messaging.md), [USER_TYPE_GUEST](../product/USER_TYPE_GUEST.md).

---

## Supporting Tables

- **`pre_assessment_forms`** – GP/pre-assessment data linked to sessions
- **`reviews`** – Star ratings and feedback
- **`payments`** – Stripe payment records
- **`connect_accounts`** – Stripe Connect onboarding
- **`qualifications`**, **`practitioner_qualification_documents`** – Practitioner credentials

---

## Common Queries (Conceptual)

1. **Practitioner's today schedule:**  
   `client_sessions` where `therapist_id = X` and `session_date = today` and `status IN ('scheduled', 'confirmed', 'in_progress')`  
   Plus `mobile_booking_requests` pending, plus `treatment_exchange_requests` pending (merged in dashboard).

2. **Available slots:**  
   From `practitioner_availability.working_hours` minus `client_sessions`, `calendar_events` (block/unavailable), and active `slot_holds`.

3. **Guest vs client:**  
   Use `client_sessions.is_guest_booking`. Guest sessions may have `client_id` (guest user id); after signup, `link_guest_sessions_to_user` updates to auth user id.

---

## In-Depth: Clinic vs Mobile Data Flow

| Flow                   | Creates                                                                                    | Key tables                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| **Clinic booking**     | `client_sessions` directly                                                                 | `create_booking_with_validation` → client_sessions (appointment_type=clinic)                    |
| **Mobile request**     | `mobile_booking_requests` first                                                            | `create_mobile_booking_request` → mobile_booking_requests                                       |
| **Mobile accept**      | `client_sessions` from request                                                             | `create_session_from_mobile_request` → client_sessions (appointment_type=mobile, visit_address) |
| **Treatment exchange** | `treatment_exchange_requests`, `slot_holds`, `mutual_exchange_sessions`, `client_sessions` | Multiple RPCs                                                                                   |

**Never** create a mobile session via `create_booking_with_validation`; it rejects same-day mobile and requires the request flow.

---

## Full Table Reference

- **[database-complete-schema.md](./database-complete-schema.md)** – Every table and view in `public` with full column structure (type, nullable, default). ~130 tables.
- **[database-mcp-metadata.md](./database-mcp-metadata.md)** – MCP-derived metadata: table comments, primary keys, foreign keys, RLS policy counts, row counts.
- **[database-tables-mcp-reference.md](./database-tables-mcp-reference.md)** – Core tables with purpose, key columns, and code links.

---

## Related Docs

- [Database Tables MCP Reference](./database-tables-mcp-reference.md) – Full MCP-derived table reference with code links
- [Edge Functions](./edge-functions.md) – Serverless functions and code links
- [Clinic, Mobile & Hybrid Flows](../features/clinic-mobile-hybrid-flows.md) – Booking vs request flows
- [System Overview](./system-overview.md)
- [Guest vs Client System Logic](../product/GUEST_VS_CLIENT_SYSTEM_LOGIC_TABLE.md)
- [Practitioner Types](../product/PRACTITIONER_TYPE_CLINIC_BASED.md) (and Mobile, Hybrid)
- [How Treatment Exchange Works](../features/how-treatment-exchange-works.md)
- [Junior Developer Guide](../contributing/junior-developer-guide.md)

---

**Last Updated:** 2026-03-15
