# Database Tables Reference (MCP-Derived)

**Audience:** Junior developers

This document describes every core table in the `public` schema, derived from Supabase MCP (`list_tables`, `execute_sql`). Each table includes: purpose, key columns, defaults, and links to code that reads/writes it.

**Full schema:** For every table with complete column definitions (type, nullable, default), see [database-complete-schema.md](./database-complete-schema.md).

---

## Core Tables (Primary Use)

### `users`

**Purpose:** Central identity table. Links to Supabase Auth (`id = auth.uid()`). Stores practitioner/client profile, location, therapist type, Stripe Connect, treatment exchange opt-in.

**DB comment:** _(none)_

| Column                                            | Type           | Nullable | Default            | Purpose                                      |
| ------------------------------------------------- | -------------- | -------- | ------------------ | -------------------------------------------- |
| id                                                | uuid           | NO       | uuid_generate_v4() | PK, matches auth.uid for authenticated       |
| email                                             | varchar        | NO       | -                  | Unique                                       |
| first_name, last_name                             | varchar        | NO       | -                  | Display name                                 |
| user_role                                         | user_role      | YES      | 'sports_therapist' | client, practitioner, admin, guest           |
| therapist_type                                    | therapist_type | YES      | 'clinic_based'     | clinic_based, mobile, hybrid                 |
| clinic_address, clinic_latitude, clinic_longitude | text/numeric   | YES      | -                  | Clinic location                              |
| base_address, base_latitude, base_longitude       | text/numeric   | YES      | -                  | Base for mobile (hybrid: synced from clinic) |
| mobile_service_radius_km                          | integer        | YES      | 25                 | Mobile service radius                        |
| treatment_exchange_opt_in                         | boolean        | YES      | false              | Can receive exchange requests                |
| stripe_connect_account_id                         | text           | YES      | -                  | Stripe Connect                               |
| booking_slug                                      | varchar        | YES      | -                  | Direct link slug                             |
| ...                                               |                |          |                    | (See schema for full list)                   |

**Code references:**

- Profile: [peer-care-connect/src/pages/Profile.tsx](../../peer-care-connect/src/pages/Profile.tsx)
- Booking flow type: [peer-care-connect/src/lib/booking-flow-type.ts](../../peer-care-connect/src/lib/booking-flow-type.ts)
- Geo search: [peer-care-connect/src/lib/geo-search-service.ts](../../peer-care-connect/src/lib/geo-search-service.ts)

---

### `client_sessions`

**Purpose:** Booked sessions between practitioner and client/guest. Created by clinic flow, mobile accept flow, or treatment exchange.

**DB comment:** _(none)_

| Column                                  | Type           | Nullable | Default            | Purpose                                                         |
| --------------------------------------- | -------------- | -------- | ------------------ | --------------------------------------------------------------- |
| id                                      | uuid           | NO       | uuid_generate_v4() | PK                                                              |
| therapist_id                            | uuid           | YES      | -                  | FK → users (practitioner)                                       |
| client_id                               | uuid           | YES      | -                  | FK → users (client; null for guest until linked)                |
| client_name, client_email, client_phone | varchar        | -        | -                  | Always populated                                                |
| session_date                            | date           | NO       | -                  | Session date                                                    |
| start_time                              | time           | NO       | -                  | HH:mm:ss                                                        |
| duration_minutes                        | integer        | NO       | -                  | Length                                                          |
| session_type                            | varchar        | YES      | -                  | Service name                                                    |
| status                                  | session_status | YES      | 'scheduled'        | scheduled, confirmed, cancelled, pending_payment, expired, etc. |
| appointment_type                        | text           | NO       | 'clinic'           | clinic, mobile                                                  |
| visit_address                           | text           | YES      | -                  | Client address for mobile                                       |
| is_guest_booking                        | boolean        | NO       | false              | Booked without account                                          |
| guest_view_token                        | text           | YES      | -                  | Token for guest view without login                              |
| is_peer_booking                         | boolean        | YES      | false              | Treatment exchange session                                      |
| credit_cost                             | integer        | YES      | 0                  | Credits used (exchange)                                         |
| expires_at                              | timestamptz    | YES      | -                  | For pending_payment TTL                                         |
| pre_assessment_required                 | boolean        | YES      | true               |                                                                 |
| pre_assessment_completed                | boolean        | YES      | false              |                                                                 |
| pre_assessment_form_id                  | uuid           | YES      | -                  | FK → pre_assessment_forms                                       |
| ...                                     |                |          |                    |                                                                 |

**Code references:**

- Create (clinic): RPC `create_booking_with_validation` — [supabase/migrations](../../supabase/migrations/)
- Create (mobile): RPC `create_session_from_mobile_request` — [peer-care-connect/src/components/practitioner/MobileRequestManagement.tsx](../../peer-care-connect/src/components/practitioner/MobileRequestManagement.tsx)
- Diary: [peer-care-connect/src/components/BookingCalendar.tsx](../../peer-care-connect/src/components/BookingCalendar.tsx)
- Dashboard: [peer-care-connect/src/components/dashboards/TherapistDashboard.tsx](../../peer-care-connect/src/components/dashboards/TherapistDashboard.tsx)

---

### `practitioner_availability`

**Purpose:** Working hours per practitioner. One row per practitioner. Drives slot generation.

**DB comment:** _(none)_

| Column                   | Type    | Nullable | Default         | Purpose                            |
| ------------------------ | ------- | -------- | --------------- | ---------------------------------- |
| user_id                  | uuid    | NO       | -               | FK → users                         |
| working_hours            | jsonb   | NO       | (default obj)   | Day→{enabled, start, end, hours[]} |
| timezone                 | text    | YES      | 'Europe/London' |                                    |
| default_session_time     | time    | YES      | '10:00:00'      |                                    |
| default_duration_minutes | integer | YES      | 60              |                                    |

**Code references:**

- Slot generation: [peer-care-connect/src/lib/slot-generation-utils.ts](../../peer-care-connect/src/lib/slot-generation-utils.ts)
- Availability UI: [peer-care-connect/src/components/practice/AvailabilitySettings.tsx](../../peer-care-connect/src/components/practice/AvailabilitySettings.tsx)

---

### `practitioner_products`

**Purpose:** Services offered by practitioners (name, price, duration, service_type). Drives marketplace and booking flows.

**DB comment:** "Products/packages that practitioners offer. Auto-migrated from hourly_rate for practitioners without packages."

| Column                             | Type    | Nullable | Default  | Purpose                        |
| ---------------------------------- | ------- | -------- | -------- | ------------------------------ |
| practitioner_id                    | uuid    | YES      | -        | FK → users                     |
| name, description                  | text    | -        | -        |                                |
| price_amount                       | integer | NO       | -        | Pence                          |
| currency                           | text    | YES      | 'gbp'    |                                |
| duration_minutes                   | integer | YES      | -        |                                |
| service_type                       | text    | YES      | 'clinic' | clinic, mobile, both           |
| is_active                          | boolean | YES      | true     | Shown in marketplace when true |
| stripe_product_id, stripe_price_id | text    | YES      | -        | Stripe catalog                 |

**Code references:**

- Product form: [peer-care-connect/src/components/practitioner/ProductForm.tsx](../../peer-care-connect/src/components/practitioner/ProductForm.tsx)
- Booking flow type: [peer-care-connect/src/lib/booking-flow-type.ts](../../peer-care-connect/src/lib/booking-flow-type.ts)

---

### `calendar_events`

**Purpose:** Blocked or unavailable time. `event_type = 'block'` or `'unavailable'` excludes times from slot generation.

**DB comment:** _(none)_

| Column               | Type        | Nullable | Default       | Purpose                         |
| -------------------- | ----------- | -------- | ------------- | ------------------------------- |
| user_id              | uuid        | NO       | -             | FK → users (practitioner)       |
| start_time, end_time | timestamptz | NO       | -             | Block window                    |
| title                | text        | NO       | -             | Display                         |
| event_type           | text        | YES      | 'appointment' | block, unavailable, appointment |
| ...                  |             |          |               |                                 |

**Code references:**

- Block time: [peer-care-connect/src/components/practice/BlockTimeManager.tsx](../../peer-care-connect/src/components/practice/BlockTimeManager.tsx)
- Slot conflict: [peer-care-connect/src/lib/block-time-utils.ts](../../peer-care-connect/src/lib/block-time-utils.ts)

---

### `slot_holds`

**Purpose:** Temporary slot reservation (checkout, treatment exchange, mobile request). Prevents double-booking. Auto-expire via `expires_at`.

**DB comment:** _(none)_

| Column                             | Type      | Nullable | Default  | Purpose                          |
| ---------------------------------- | --------- | -------- | -------- | -------------------------------- |
| practitioner_id                    | uuid      | YES      | -        | FK → users                       |
| session_date, start_time, end_time | date/time | NO       | -        | Reserved slot                    |
| duration_minutes                   | integer   | NO       | -        |                                  |
| expires_at                         | timestamp | NO       | -        | Hold expires                     |
| status                             | text      | YES      | 'active' | active, released                 |
| request_id                         | uuid      | YES      | -        | FK → treatment_exchange_requests |
| mobile_request_id                  | uuid      | YES      | -        | FK → mobile_booking_requests     |

**Code references:**

- Treatment exchange: [peer-care-connect/src/lib/treatment-exchange.ts](../../peer-care-connect/src/lib/treatment-exchange.ts) — `SlotHoldingService`
- Slot generation: [peer-care-connect/src/lib/slot-generation-utils.ts](../../peer-care-connect/src/lib/slot-generation-utils.ts)

---

### `treatment_exchange_requests`

**Purpose:** Request from one practitioner to another for treatment exchange. Pending until recipient Accepts/Declines.

**DB comment:** _(none)_

| Column                                                           | Type        | Nullable | Default   | Purpose                                         |
| ---------------------------------------------------------------- | ----------- | -------- | --------- | ----------------------------------------------- |
| requester_id                                                     | uuid        | NO       | -         | Who requests treatment                          |
| recipient_id                                                     | uuid        | NO       | -         | Who provides it                                 |
| requested_session_date, requested_start_time, requested_end_time | date/time   | NO       | -         | Requested slot                                  |
| duration_minutes                                                 | integer     | NO       | 60        |                                                 |
| status                                                           | text        | NO       | 'pending' | pending, accepted, declined, expired, cancelled |
| expires_at                                                       | timestamptz | NO       | now()+24h |                                                 |
| recipient_can_book_back                                          | boolean     | YES      | true      | Recipient can book reciprocal                   |

**Code references:**

- Send: [peer-care-connect/src/lib/treatment-exchange.ts](../../peer-care-connect/src/lib/treatment-exchange.ts)
- Accept modal: [peer-care-connect/src/components/treatment-exchange/ExchangeAcceptanceModal.tsx](../../peer-care-connect/src/components/treatment-exchange/ExchangeAcceptanceModal.tsx)
- Dashboard: [peer-care-connect/src/components/dashboards/TherapistDashboard.tsx](../../peer-care-connect/src/components/dashboards/TherapistDashboard.tsx)

---

### `mutual_exchange_sessions`

**Purpose:** Records the pair of sessions in a treatment exchange (requester provides → recipient; recipient provides → requester). Links to `treatment_exchange_requests`.

**DB comment:** _(none)_

| Column                                       | Type      | Nullable | Default | Purpose                           |
| -------------------------------------------- | --------- | -------- | ------- | --------------------------------- |
| exchange_request_id                          | uuid      | NO       | -       | FK → treatment_exchange_requests  |
| practitioner_a_id, practitioner_b_id         | uuid      | NO       | -       | The two practitioners             |
| session_date, start_time, end_time           | date/time | NO       | -       | First session slot                |
| credits_exchanged                            | integer   | NO       | 0       | Credit cost                       |
| practitioner_a_booked, practitioner_b_booked | boolean   | YES      | false   | Both reciprocal sessions done     |
| credits_deducted                             | boolean   | YES      | false   | Credits deducted when both booked |

---

### `mobile_booking_requests`

**Purpose:** Client requests mobile visit. Practitioner must Accept/Decline. On Accept, `create_session_from_mobile_request` creates `client_sessions`.

**DB comment:** "Booking requests for mobile therapists. Payment is held until practitioner accepts."

| Column                                            | Type         | Nullable | Default   | Purpose                              |
| ------------------------------------------------- | ------------ | -------- | --------- | ------------------------------------ |
| client_id                                         | uuid         | YES      | -         | FK → users (null for guest)          |
| practitioner_id                                   | uuid         | YES      | -         | FK → users                           |
| product_id                                        | uuid         | YES      | -         | FK → practitioner_products           |
| requested_date, requested_start_time              | date/time    | NO       | -         | Client's preferred time              |
| client_address, client_latitude, client_longitude | text/numeric | YES      | -         | Visit location                       |
| status                                            | text         | YES      | 'pending' | pending, accepted, declined, expired |
| session_id                                        | uuid         | YES      | -         | FK → client_sessions (after accept)  |
| expires_at                                        | timestamptz  | YES      | -         | TTL for practitioner to respond      |
| stripe_payment_intent_id                          | text         | YES      | -         | Payment hold                         |

**Code references:**

- Create: RPC `create_mobile_booking_request` — [peer-care-connect/src/components/marketplace/MobileBookingRequestFlow.tsx](../../peer-care-connect/src/components/marketplace/MobileBookingRequestFlow.tsx)
- Accept/Decline: [peer-care-connect/src/components/practitioner/MobileRequestManagement.tsx](../../peer-care-connect/src/components/practitioner/MobileRequestManagement.tsx)

---

### `credits`

**Purpose:** Per-user credit balance for treatment exchange. 1 credit ≈ 1 minute.

**DB comment:** _(none)_

| Column                    | Type    | Nullable | Default | Purpose         |
| ------------------------- | ------- | -------- | ------- | --------------- |
| user_id                   | uuid    | YES      | -       | FK → users      |
| balance                   | integer | YES      | 0       | Current credits |
| total_earned, total_spent | integer | YES      | 0       | Lifetime        |

**Code references:**

- [peer-care-connect/src/lib/credits.ts](../../peer-care-connect/src/lib/credits.ts)
- [peer-care-connect/src/lib/treatment-exchange.ts](../../peer-care-connect/src/lib/treatment-exchange.ts)

---

### `notifications`

**Purpose:** In-app notifications. Soft dismiss via `dismissed_at`. Read state via `read_at`.

**DB comment:** "In-app notifications for users"

| Column                 | Type         | Nullable | Default | Purpose                                  |
| ---------------------- | ------------ | -------- | ------- | ---------------------------------------- |
| recipient_id           | uuid         | YES      | -       | FK → users                               |
| type                   | enum         | NO       | -       | booking_request, booking_confirmed, etc. |
| title, body            | varchar/text | -        | -       | Display                                  |
| source_type, source_id | text         | YES      | -       | e.g. treatment_exchange_request, uuid    |
| read_at                | timestamptz  | YES      | -       | Canonical read state                     |
| dismissed_at           | timestamptz  | YES      | -       | Soft dismiss                             |
| payload                | jsonb        | YES      | '{}'    | Routing data                             |

**Code references:**

- Create: [peer-care-connect/src/lib/notification-utils.ts](../../peer-care-connect/src/lib/notification-utils.ts) — `create_notification` RPC
- Fetch: [peer-care-connect/src/components/dashboards/TherapistDashboard.tsx](../../peer-care-connect/src/components/dashboards/TherapistDashboard.tsx)

---

### `conversations`

**Purpose:** Messaging threads. participant1/2 or practitioner + guest_email.

**DB comment:** _(none)_

| Column                           | Type             | Nullable | Default | Purpose                                     |
| -------------------------------- | ---------------- | -------- | ------- | ------------------------------------------- |
| conversation_key                 | text             | NO       | -       | Unique key for pair                         |
| participant1_id, participant2_id | uuid             | -        | -       | Both users, or participant2 null when guest |
| guest_email                      | text             | YES      | -       | For guest conversations                     |
| last_message_at, last_message_id | timestamptz/uuid | YES      | -       |                                             |

**Code references:**

- [peer-care-connect/src/lib/messaging.ts](../../peer-care-connect/src/lib/messaging.ts)
- RPCs: `get_or_create_conversation`, `get_or_create_guest_conversation`

---

### `messages`

**Purpose:** Individual messages in a conversation. Encrypted content.

**DB comment:** _(none)_

| Column            | Type           | Nullable | Default | Purpose                   |
| ----------------- | -------------- | -------- | ------- | ------------------------- |
| conversation_id   | uuid           | NO       | -       | FK → conversations        |
| sender_id         | uuid           | NO       | -       | FK → users                |
| encrypted_content | text           | NO       | -       |                           |
| content_hash      | text           | NO       | -       |                           |
| message_type      | message_type   | YES      | 'text'  | text, image, file, system |
| message_status    | message_status | YES      | 'sent'  |                           |

**Code references:**

- [peer-care-connect/src/lib/messaging.ts](../../peer-care-connect/src/lib/messaging.ts)
- RPC: `send_message`

---

### `pre_assessment_forms`

**Purpose:** Pre-assessment/GP forms for client screening. Linked to sessions. Mandatory for guests; first-time for clients.

**DB comment:** "Pre-assessment forms for client screening before sessions. Mandatory for guests every time, mandatory for clients on first session, optional for subsequent sessions."

**Code references:**

- [peer-care-connect/src/lib/pre-assessment-service.ts](../../peer-care-connect/src/lib/pre-assessment-service.ts)

---

### `payments`, `connect_accounts`, `reviews`, `qualifications`, `reminders`

Supporting tables for Stripe payments, Connect onboarding, reviews, practitioner credentials, and reminders. See migrations for full schema.

---

## Key RPCs (Frontend Calls)

| RPC                                                   | Purpose                  | Code                                        |
| ----------------------------------------------------- | ------------------------ | ------------------------------------------- |
| `create_booking_with_validation`                      | Clinic booking           | Migrations                                  |
| `create_mobile_booking_request`                       | Mobile request           | MobileBookingRequestFlow                    |
| `create_session_from_mobile_request`                  | Mobile accept            | MobileRequestManagement                     |
| `get_practitioner_mobile_requests`                    | Pending mobile requests  | TherapistDashboard, MobileRequestManagement |
| `get_pending_same_day_bookings`                       | Same-day clinic approval | TherapistDashboard                          |
| `expire_pending_payment_bookings`                     | Expire unpaid slots      | TherapistDashboard                          |
| `link_slot_hold_to_request`                           | Link hold to exchange    | treatment-exchange.ts                       |
| `accept_exchange_request`, `decline_exchange_request` | Exchange accept/decline  | treatment-exchange.ts                       |
| `cancel_exchange_request_by_requester`                | Requester cancels        | treatment-exchange.ts                       |
| `process_peer_booking_credits`                        | Credit deduction         | treatment-exchange.ts                       |
| `create_notification`                                 | Insert notification      | notification-utils.ts                       |
| `mark_notifications_read`                             | Mark read                | notification-utils.ts                       |
| `get_or_create_conversation`                          | Messaging                | messaging.ts                                |
| `get_or_create_guest_conversation`                    | Guest messaging          | messaging.ts                                |
| `send_message`                                        | Send message             | messaging.ts                                |

---

## Related Docs

- [Database Schema](./database-schema.md) – Overview and relationships
- [Edge Functions](./edge-functions.md) – Serverless functions
- [Clinic, Mobile & Hybrid Flows](../features/clinic-mobile-hybrid-flows.md)

---

**Last Updated:** 2026-03-15 | Schema from Supabase MCP (project aikqnvltuwwgifuocvto)
