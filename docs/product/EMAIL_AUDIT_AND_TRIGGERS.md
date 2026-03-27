# Email Audit and Triggers

Audit of all email types: category (keep now / optional / off) and where each is triggered in production.

**Rule:** Booking-related emails use **booking record first** (e.g. `appointment_type` on the session) for clinic vs mobile location and directions; practitioner profile is fallback only.

---

## Summary

| Category               | Email types                                                                                                            | Action                                                                                                                  |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Keep now**           | booking_confirmation_client, booking_confirmation_practitioner, message_notification_guest, cancellation, rescheduling | Active; confirmation and message already triggered; cancellation/rescheduling to be wired where cancel/reschedule runs. |
| **Keep only if used**  | session_reminder_24h, session_reminder_1h                                                                              | Templates exist; **not triggered** by any cron or production flow. Do not add triggers unless product confirms.         |
| **Remove or keep off** | payment*received_practitioner, all peer*\* types                                                                       | Do not invoke unless product explicitly enables.                                                                        |

---

## Per-type detail

| Email type                              | Category | Triggered by                                                                                                                 | Notes                                                                                                                      |
| --------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **booking_confirmation_client**         | Keep now | `stripe-webhooks/index.ts` → `sendBookingConfirmationEmails` (after payment succeeds)                                        | Client/guest receives session details, location, directions (when relevant), View Booking (token link for guests).         |
| **booking_confirmation_practitioner**   | Keep now | Same as above                                                                                                                | Practitioner receives session details; for mobile should show visit address and directions to client (see location logic). |
| **message_notification_guest**          | Keep now | `notify-guest-message/index.ts` (when practitioner sends message to guest)                                                   | Guest gets message preview and link to login to reply.                                                                     |
| **cancellation**                        | Keep now | `SessionDetailView.tsx` → `send-booking-notification` (emailType: cancellation) when practitioner cancels session            | Uses same location helper; guest-safe bookingUrl when applicable.                                                          |
| **rescheduling**                        | Keep now | `RescheduleService.rescheduleSession` → `send-booking-notification` (emailType: rescheduling) after session date/time update | Uses same location helper; original/new date-time and bookingUrl.                                                          |
| **session_reminder_24h**                | Optional | **Not triggered**                                                                                                            | No cron or Edge Function invokes. Leave template; do not trigger unless product confirms.                                  |
| **session_reminder_1h**                 | Optional | **Not triggered**                                                                                                            | Same as above.                                                                                                             |
| **payment_received_practitioner**       | Off      | **Not triggered**                                                                                                            | Do not invoke unless product confirms (often noisy).                                                                       |
| **peer_booking_confirmed_client**       | Off      | **Not triggered**                                                                                                            | Only if peer treatment is live and required.                                                                               |
| **peer_booking_confirmed_practitioner** | Off      | **Not triggered**                                                                                                            | Same.                                                                                                                      |
| **peer_credits_deducted**               | Off      | **Not triggered**                                                                                                            | Same.                                                                                                                      |
| **peer_credits_earned**                 | Off      | **Not triggered**                                                                                                            | Same.                                                                                                                      |
| **peer_booking_cancelled_refunded**     | Off      | **Not triggered**                                                                                                            | Same.                                                                                                                      |

---

## Implementation notes (do not trigger unless product approves)

- **payment_received_practitioner:** Do not invoke from any flow; no code path should call send-email for this type unless product explicitly enables it.
- **All peer\_\*** types:\*\* Do not invoke unless peer treatment is live and required.
- **session_reminder_24h / session_reminder_1h:** No cron or Edge Function triggers these. Do not add triggers unless product confirms; templates remain available for future use.

---

## Location logic (clinic / mobile / hybrid)

- **Source of truth:** `client_sessions.appointment_type` (or equivalent) first; then practitioner default.
- **Clinic:** Client email shows clinic address and directions to clinic. Practitioner email shows "Clinic at [address]".
- **Mobile:** Client email shows "Your address" or visit address; no directions to clinic. Practitioner email shows "Visit address" and directions to client.
- **Hybrid:** Decided by the **booking record** (session’s appointment_type), not practitioner type alone.

See central helper `getBookingEmailLocationData` in `supabase/functions/_shared/booking-email-data.ts` and stripe-webhooks usage for implementation.
