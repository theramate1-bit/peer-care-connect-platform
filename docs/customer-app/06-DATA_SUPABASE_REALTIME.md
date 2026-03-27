# Data layer — customer-relevant Supabase

**Principle:** Business rules live in **Postgres + RLS + RPC**; clients (web and native) use the **same** Supabase project and anon key patterns.

**Readiness overview:** [`15-MOBILE_PLATFORM_READINESS.md`](15-MOBILE_PLATFORM_READINESS.md).

## Core tables (illustrative)

Exact columns: use generated types in `peer-care-connect/src/integrations/supabase/types.ts` or Supabase MCP.

| Area            | Tables / views                                                               | Customer use           |
| --------------- | ---------------------------------------------------------------------------- | ---------------------- |
| Identity        | `users`, `client_profiles`                                                   | Profile, role          |
| Sessions        | `client_sessions`, `calendar_events`                                         | Bookings, diary        |
| Marketplace     | `practitioner_products`, `marketplace_bookings`, `practitioner_availability` | Search, book           |
| Mobile          | `mobile_booking_requests`                                                    | Request / accept flows |
| Credits / pay   | `credits`, `payments`, `payment_intents`                                     | Checkout state         |
| Messaging       | `conversations`, `messages`, `message_*`                                     | Chat                   |
| Notifications   | `notifications`, `notification_preferences`                                  | Bell + push            |
| Clinical (read) | `treatment_notes` (as permitted by RLS)                                      | Client SOAP viewer     |
| Pre-assessment  | `pre_assessment_forms`                                                       | Screening rules        |

## Realtime (web reference)

`ClientDashboard` uses `useRealtimeSubscription` on `client_sessions` with filter `client_id=eq.{user.id}`.

Native should subscribe with the **same channel/filter** patterns once hooks are ported.

## Edge Functions (invoke from app)

Customers trigger server work indirectly; common slugs include:

- `send-email` — transactional email
- `stripe-payment` / `mobile-payment` — payment orchestration
- `send-booking-notification` — booking-related notifications

**Rule:** Never duplicate secret keys in the app; use **invoke** with user JWT where `verify_jwt: true`.

## Docs in repo

- [`../development/GUEST_VS_CLIENT_RULES.md`](../development/GUEST_VS_CLIENT_RULES.md) — guest vs client behavior
- [`../features/booking-flows-reference.md`](../features/booking-flows-reference.md) — booking semantics
- [`../product/MOBILE_WEB_FULL_SCREEN_INVENTORY.md`](../product/MOBILE_WEB_FULL_SCREEN_INVENTORY.md) — full route map

## MCP

Use **Supabase MCP** (`list_tables`, `execute_sql` read-only) to verify schema before native features that touch new columns.
