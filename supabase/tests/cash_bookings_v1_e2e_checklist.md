# Cash Bookings v1 — Manual E2E Test Checklist

## Prerequisites

- [ ] At least one practitioner has `accept_in_person_payment = true` in the `users` table
- [ ] Web app (`peer-care-connect` or root `src/`) is running locally

## Signed-in Client — Pay at Clinic

- [ ] Navigate to Client Booking page, select a practitioner who accepts in-person payment
- [ ] Step 1: Select service, date, and time
- [ ] Step 2: Enter client info (name, email)
- [ ] Step 3 (payment choice): Verify both "Pay Online" and "Pay at Clinic" cards appear
- [ ] Select "Pay at Clinic"
- [ ] Step 4 (summary): Verify "Pay at clinic (cash or terminal)" label is shown
- [ ] Verify no platform fee breakdown is displayed for in-person
- [ ] Click "Confirm Booking"
- [ ] Verify success toast: "Booking confirmed! Pay at the clinic..."
- [ ] In DB: verify `client_sessions` row has `payment_collection = 'in_person'`, `payment_status = 'awaiting_in_person'`, `status = 'scheduled'`, `platform_fee_amount = 0`, `stripe_payment_intent_id IS NULL`

## Signed-in Client — Online Payment (regression)

- [ ] Repeat the flow but select "Pay Online" at step 3
- [ ] Verify Stripe checkout/payment intent is created
- [ ] Verify `payment_collection = 'online'` in the DB row

## Practitioner without in-person payment

- [ ] Select a practitioner where `accept_in_person_payment = false`
- [ ] Verify the payment choice step is skipped (3 steps total, not 4)
- [ ] Verify only the online payment path is available

## Practitioner — Mark as Paid

- [ ] Log in as the practitioner who owns an `in_person` session
- [ ] Use `MarkPaidButton` component (or call RPC directly)
- [ ] Select payment method (cash, card terminal, etc.)
- [ ] Click Confirm
- [ ] In DB: verify `payment_status = 'completed'`, `payment_method = 'cash'`, `payment_date IS NOT NULL`

## RPC Security

- [ ] As a client, attempt to call `mark_session_paid_in_person` for a session — should return error "Only the session practitioner can mark payment"
- [ ] Attempt to mark an online session as paid in-person — should return error "This session uses online payment"
- [ ] Attempt to mark an already-completed session — should return success with "Already marked as paid"

## Edge Function Guard

- [ ] Call `stripe-payment` with `action: 'create-payment-intent'` and a `session_id` belonging to an `in_person` session
- [ ] Verify 400 response: "This session uses in-person payment and does not require online checkout"

## Expiry Safety

- [ ] Verify `expire_pending_payment_bookings()` does NOT cancel in-person sessions (they have `status = 'scheduled'`, not `pending_payment`)

## Email Notifications

- [ ] Create an in-person booking and trigger `booking_confirmation_client` email
- [ ] Verify email subject says "pay at your appointment"
- [ ] Verify email body says "pay directly at the clinic"
- [ ] Verify practitioner email shows "Pay at clinic" payment status text
- [ ] Cancel an in-person booking; verify cancellation email says "no card was charged"

---

## Gap Closure (v1.1) — Additional Tests

### Guest Web Booking (pay at clinic)

- [ ] Navigate to `/client/ClientBooking?therapistId=<id>&guest=1`
- [ ] Verify "Your Details" heading (not "Client Information")
- [ ] Verify "No account needed" note is shown
- [ ] Verify name and email are marked as required
- [ ] Verify only 3 steps (no payment choice — guest is always pay at clinic)
- [ ] Fill in name, email, phone; select service/date/time
- [ ] Step 3 (summary): Verify "Pay at clinic" and "Guest booking" badge
- [ ] Click "Confirm Booking"
- [ ] In DB: verify `is_guest_booking = true`, `payment_collection = 'in_person'`
- [ ] Verify `users` table has a `guest` row matching the email
- [ ] Verify `guest_view_token` is set on the `client_sessions` row

### Guest User Resolution RPC

- [ ] Call `ensure_guest_user_for_booking('newguest@example.com', 'Test Guest')` — should create a new user
- [ ] Call it again with the same email — should return the existing user ID
- [ ] Call with empty email — should raise exception

### Practitioner UI — Upcoming Sessions

- [ ] Navigate to practitioner's Upcoming Sessions page
- [ ] Verify in-person sessions show "Awaiting payment at clinic" badge
- [ ] Verify "Mark as Paid" button appears for those sessions
- [ ] Click "Mark as Paid", select method, confirm
- [ ] Verify badge changes to "Paid in person"

### Practitioner UI — Payment Preferences

- [ ] Navigate to Payment Preferences page
- [ ] Toggle "Accept pay-at-clinic bookings" on
- [ ] Verify DB: `users.accept_in_person_payment = true`
- [ ] Toggle off, verify it reverts

### RLS: Client Cannot Self-Mark Paid

- [ ] As a client, attempt `UPDATE client_sessions SET payment_status = 'completed' WHERE id = <session_id>`
- [ ] Verify trigger raises "Clients cannot update payment fields directly"
- [ ] As a practitioner (therapist_id matches), verify update is allowed via RPC

### guest_view_token for In-Person Bookings

- [ ] Create an in-person booking; verify `guest_view_token` is auto-set by trigger
- [ ] Visit `/booking/view/<session_id>?token=<token>` — should show booking details
- [ ] Verify `get_session_by_guest_token` returns data for in-person sessions (not just completed)
