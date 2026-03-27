# Transactional email data (real session details)

## Server-side enrichment (`send-email`)

Before rendering any template, the Edge Function loads **live data from Supabase** when:

1. **`sessionId`** is present → reads `client_sessions` + practitioner `users`, then merges:
   - Service type, date, time, duration, price
   - Client name/email
   - Practitioner name/email
   - **Location** (clinic vs mobile) via `getBookingEmailLocationData` (same rules as confirmations)
   - Guest **booking URL** when `guest_view_token` exists
   - Payment fields where stored on the session

   Applies to: booking confirmations, payment confirmations/received, session reminders, cancellation/reschedule (location + practitioner preserved for reschedule), peer credit emails, etc.

2. **`requestId`** + `booking_request_practitioner` → reads `mobile_booking_requests` and merges client name (from `users` if needed), service, date, time, address, price, duration when the column exists.

**Requirements:** `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_URL` must be set on the `send-email` function (standard for Edge Functions). If the service role is missing, enrichment is skipped and only the caller’s payload is used.

## Caller responsibilities

- Always pass **`sessionId`** (UUID) for any email tied to a `client_sessions` row—even if you also pass fields. The DB merge ensures templates stay accurate if the session was updated.
- For mobile practitioner requests, pass **`requestId`** so the booking-request email can be filled from `mobile_booking_requests`.

## Template updates

- **Payment (client & practitioner)** emails now include duration, time, and **location** (with map link when applicable).
- **Peer booking (client)** includes location + optional directions CTA.
- **Peer booking (practitioner)** includes visit/session address and directions.
- **Mobile booking request** shows duration and price when available.

Deploy after changes:

```bash
supabase functions deploy send-email
```
