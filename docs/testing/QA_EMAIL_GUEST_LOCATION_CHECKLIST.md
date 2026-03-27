# QA Checklist: Email System, Guest Logic, and Booking Location Logic

Step-by-step verification for **email notifications**, **guest vs client behaviour**, and **clinic / mobile / hybrid** booking location logic. Use for manual QA, LLM-driven test runs, or as the reference when writing automated tests.

**Related docs:**

- [EMAIL_AUDIT_AND_TRIGGERS.md](../product/EMAIL_AUDIT_AND_TRIGGERS.md) – Email types, trigger points, location logic.
- [GUEST_VS_CLIENT_SYSTEM_LOGIC_TABLE.md](../product/GUEST_VS_CLIENT_SYSTEM_LOGIC_TABLE.md) – Guest vs client behaviour by area.

---

## 1. Environment Setup

### Preconditions

- [ ] Supabase project connected (Edge Functions deployed).
- [ ] Resend email service active and configured for the Edge Function.
- [ ] Stripe in test mode for payment flows.
- [ ] Test practitioner accounts available: clinic, mobile, hybrid.

### Test users (suggested)

| User Type             | Email                        | Notes                    |
| --------------------- | ---------------------------- | ------------------------ |
| Practitioner (Clinic) | practitioner.clinic@test.com | Has clinic address       |
| Practitioner (Mobile) | practitioner.mobile@test.com | Travels to client        |
| Practitioner (Hybrid) | practitioner.hybrid@test.com | Supports clinic + mobile |
| Registered Client     | client@test.com              | Has account              |
| Guest Client          | guest@test.com               | No account               |

Use environment variables for Supabase URL and keys; do not store secrets in the repo.

---

## 2. Booking Confirmation Email Tests

### 2.1 Guest booking confirmation

**Steps:**

1. Start a booking as **guest** (do not sign in).
2. Use email **guest@test.com** (or your test guest email).
3. Complete service selection, time, and guest details.
4. Complete payment (Stripe test).
5. Wait for Stripe webhook to trigger confirmation.

**Verify:**

- [ ] Email **booking_confirmation_client** is sent to the guest email.
- [ ] Email includes: practitioner name, service name, date, time, location details.
- [ ] Email includes **View Booking Details** link.
- [ ] Email includes **Add to calendar** (or equivalent).
- [ ] Guest **does not need to sign in** to use the View Booking link.

**Pass:** Email delivered; View Booking link works without login; details match the booking in the database.

**Code:** [stripe-webhooks/index.ts](../../supabase/functions/stripe-webhooks/index.ts) → `sendBookingConfirmationEmails`; [send-email](../../supabase/functions/send-email/index.ts) template `booking_confirmation_client`.

---

### 2.2 Practitioner booking confirmation

**Steps:**

1. Complete a booking with any practitioner (guest or client booker).
2. Ensure payment succeeds so the webhook runs.

**Verify:**

- [ ] Practitioner receives **booking_confirmation_practitioner**.
- [ ] Email contains: client name, client email, service, date/time, location (or visit address for mobile).
- [ ] Email contains session management / dashboard link.

**Pass:** Email delivered; client info correct; dashboard link opens practitioner area.

**Code:** Same as 2.1; template `booking_confirmation_practitioner`.

---

## 3. Location Logic Tests

**Source of truth:** Session `appointment_type` (and `visit_address` when mobile). See [EMAIL_AUDIT_AND_TRIGGERS.md](../product/EMAIL_AUDIT_AND_TRIGGERS.md) and [booking-email-data.ts](../../supabase/functions/_shared/booking-email-data.ts) (`getBookingEmailLocationData`).

### 3.1 Clinic practitioner booking

**Steps:**

1. Book with a **clinic-only** (or hybrid doing a clinic) practitioner.
2. Confirm the session is created with `appointment_type = 'clinic'` (default for standard booking).

**Verify (client email):**

- [ ] Clinic address is shown.
- [ ] Clickable **Google Maps** (or directions) link is present.
- [ ] Directions button/link works.

**Pass:** Correct clinic address; maps link opens correctly.

---

### 3.2 Mobile practitioner booking

**Steps:**

1. Book with a **mobile** practitioner (session created as mobile, e.g. from mobile booking request flow).
2. Ensure session has `appointment_type = 'mobile'` and visit address set.

**Verify (client email):**

- [ ] “Your address” or visit address is shown (not clinic).
- [ ] **No** clinic directions link for the client.

**Verify (practitioner email):**

- [ ] “Visit address” (or equivalent) and client location shown.
- [ ] Directions link for practitioner goes to **client** address (not clinic).

**Pass:** No clinic address/directions for client; mobile wording correct; practitioner gets directions to client.

---

### 3.3 Hybrid practitioner booking

**Steps:**

1. Create a **clinic** booking with a hybrid practitioner.
2. Create a **mobile** booking with the same (or another) hybrid practitioner.

**Verify:**

- [ ] Clinic booking email: clinic address + directions (same as 3.1).
- [ ] Mobile booking email: client/visit address, no clinic directions (same as 3.2).

**Pass:** Location in email matches **booking type**, not only practitioner profile.

---

## 4. Guest Messaging Email

### Practitioner → guest message

**Steps:**

1. As a practitioner, send a message to a **guest** (recipient has no account or is guest user).
2. Trigger the notify flow (e.g. send message from conversation).

**Verify:**

- [ ] Guest receives **message_notification_guest**.
- [ ] Email contains: message preview, practitioner name, “View and reply” (or equivalent).

**Pass:** Email delivered; reply/view flow works; no login required for basic view where designed.

**Code:** [notify-guest-message/index.ts](../../supabase/functions/notify-guest-message/index.ts) → `send-email`.

---

## 5. Guest Booking Link Tests

**Steps:**

1. From a guest booking confirmation email, open the **View Booking Details** link.
2. Use an incognito/private window or different browser (no logged-in session).

**Verify:**

- [ ] Guest **can open** the booking page.
- [ ] Guest **does not need to log in** to see booking info.
- [ ] Booking details (date, time, practitioner, service, location) are visible.

**Fail:** Redirect to login when token is valid.

**Code:** [GuestBookingView.tsx](../../peer-care-connect/src/pages/booking/GuestBookingView.tsx); RPC `get_session_by_guest_token`.

---

## 6. Email Content Validation

For every booking-related email template, verify:

**Required fields:**

- [ ] Practitioner name
- [ ] Service name
- [ ] Date
- [ ] Time
- [ ] Location (or “Your address” / visit address for mobile)
- [ ] Booking/session identifier where applicable

**Links (when applicable):**

- [ ] View booking
- [ ] Directions (only when relevant – see section 3)
- [ ] Message practitioner
- [ ] Calendar link

**Pass:** All expected fields populated; no missing or empty critical values.

---

## 7. Reminder Emails (if enabled)

**Note:** As of the current implementation, **session_reminder_24h** and **session_reminder_1h** are **not triggered** by any cron or Edge Function. See [EMAIL_AUDIT_AND_TRIGGERS.md](../product/EMAIL_AUDIT_AND_TRIGGERS.md). If reminders are enabled later:

**24-hour reminder:** Trigger (e.g. cron) → verify **session_reminder_24h** contains session details, directions (if applicable), reschedule link.

**1-hour reminder:** Verify **session_reminder_1h** contains session time, practitioner, message link.

---

## 8. Cancellation Emails

**Steps:**

1. As a practitioner, cancel a confirmed booking (use cancellation flow in session detail).
2. Ensure client email is set on the session.

**Verify:**

- [ ] Client receives **cancellation** email.
- [ ] Email contains: session info, cancellation reason, refund info (if applicable).
- [ ] Booking status is updated to cancelled in the app/DB.

**Pass:** Email delivered; content correct; status updated.

**Code:** [SessionDetailView.tsx](../../peer-care-connect/src/components/sessions/SessionDetailView.tsx) → `send-booking-notification` with `emailType: 'cancellation'`.

---

## 9. Reschedule Email

**Steps:**

1. Reschedule a session (e.g. via RescheduleBooking / reschedule flow).
2. Confirm session date/time is updated.

**Verify:**

- [ ] Client receives **rescheduling** email.
- [ ] Email contains: original date/time, new date/time, practitioner info.
- [ ] Optional: location and booking link consistent with location logic.

**Pass:** Correct original and new times shown.

**Code:** [reschedule-service.ts](../../peer-care-connect/src/lib/reschedule-service.ts) → `send-booking-notification` with `emailType: 'rescheduling'`.

---

## 10. Payment Email Validation

**Verify:**

- [ ] After a successful booking payment, **only** the booking confirmation email(s) are sent (client + practitioner).
- [ ] **No** `payment_received_practitioner` email is sent (per product decision; see [EMAIL_AUDIT_AND_TRIGGERS.md](../product/EMAIL_AUDIT_AND_TRIGGERS.md)).

**Pass:** Only booking confirmation sent; no duplicate or extra payment email.

---

## 11. Email Trigger Verification

Inspect Supabase Edge Function logs (or equivalent).

**Verify triggers originate from:**

- [ ] `stripe-webhooks` – booking confirmation (payment_intent.succeeded).
- [ ] `send-email` – invoked by stripe-webhooks, notify-guest-message, send-booking-notification.
- [ ] `notify-guest-message` – message notification to guest.
- [ ] `send-booking-notification` – cancellation and rescheduling.

**Pass:** Correct event sources; no unexpected callers.

---

## 12. Email Delivery Monitoring

In Resend dashboard (or equivalent):

- [ ] Status = delivered for test emails.
- [ ] No bounce for test addresses.
- [ ] No spam flag on test sends.

**Pass:** Delivery confirmed; no bounce/spam on valid test emails.

---

## 13. Edge Case Tests

### Expired booking window

**Steps:**

1. Start a guest booking (create session, e.g. pending_payment).
2. Do **not** complete payment.
3. Wait for booking window to expire (or force expiry if supported).

**Verify:**

- [ ] No booking confirmation email is sent for that session.

**Pass:** No confirmation email for expired/unpaid booking.

---

### Duplicate guest email

**Steps:**

1. As guest, complete a booking with guest@test.com.
2. As guest again, complete another booking with the same email.

**Verify:**

- [ ] Two separate bookings exist.
- [ ] Each booking has its own confirmation and View Booking link.
- [ ] Same email can receive multiple booking emails.

**Pass:** Bookings and emails are separate; no cross-talk.

---

## 14. Security Tests

**Guest View Booking link:**

- [ ] Link uses a **secure token** (e.g. `guest_view_token` on the session), not a guessable ID.
- [ ] Token is validated server-side (e.g. RPC `get_session_by_guest_token`).
- [ ] Booking cannot be enumerated by iterating session IDs without a valid token.

**Pass:** Token-based access; validation in DB/RPC; no enumeration.

**Code:** `client_sessions.guest_view_token`; RPC `get_session_by_guest_token`.

---

## 15. Final Pass Criteria

System passes this QA cycle if:

- [ ] All required emails send (booking confirmation client + practitioner, message_notification_guest, cancellation, rescheduling when flows are used).
- [ ] Guest access works without login (View Booking Details).
- [ ] Clinic/mobile/hybrid location logic is correct in emails and links.
- [ ] Email content is accurate (fields and links).
- [ ] No unnecessary emails (e.g. no payment_received_practitioner).
- [ ] No broken links in templates.
- [ ] Resend (or provider) delivery confirmed for test sends.

---

## Runnable assets

- **Smoke script:** Run `test-scripts/qa-email-guest-location-smoke.js` with env `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. It calls send-email (clinic + mobile payloads), send-booking-notification (cancellation), and RPC `get_session_by_guest_token`, reporting pass/fail per step.
- **LLM prompts:** [QA_EMAIL_LLM_PROMPTS.md](QA_EMAIL_LLM_PROMPTS.md) – short prompts for an AI tester, keyed to this checklist’s section numbers.
