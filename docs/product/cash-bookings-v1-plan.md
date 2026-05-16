# Cash / Pay-at-Clinic Bookings (v1)

## Overview

Adds an in-person / cash payment path for web bookings first, including guest checkout, backed by existing `client_sessions.payment_method` / `payment_date` columns, new practitioner preference + RPCs, and Stripe skipped when no card capture — so platform application fee does not apply on those sessions.

## Scope

- **Surfaces:** Web app source lives at repo-root `src/` (Vite + React; older docs sometimes said “peer-care-connect” for the same app). Theramate mobile (`theramate-ios-client`) reuses the same RPCs where wired; see **Follow-up** for remaining mobile client booking parity.
- **Guests:** Yes — guest flows support choosing pay-at-clinic in v1.

## Data Model

### New columns

| Table             | Column                     | Type      | Default    | Purpose                                                |
| ----------------- | -------------------------- | --------- | ---------- | ------------------------------------------------------ |
| `users`           | `accept_in_person_payment` | `boolean` | `false`    | Practitioner-level opt-in for cash/terminal bookings   |
| `client_sessions` | `payment_collection`       | `text`    | `'online'` | `'online'` or `'in_person'` — how payment is collected |

### Constraint

`chk_payment_collection CHECK (payment_collection IN ('online', 'in_person'))` on `client_sessions`.

### Payment status conventions for in-person

| Stage                         | `status`                | `payment_status`     | `payment_collection` |
| ----------------------------- | ----------------------- | -------------------- | -------------------- |
| Booked, awaiting clinic visit | `scheduled`             | `awaiting_in_person` | `in_person`          |
| Practitioner marked paid      | `scheduled`/`completed` | `completed`          | `in_person`          |

## RPCs

### `create_booking_with_validation` (updated)

Added `p_payment_collection text DEFAULT 'online'` parameter (25th).

When `p_payment_collection = 'in_person'`:

- Status forced to `scheduled` (not `pending_payment`)
- `payment_status` set to `awaiting_in_person`
- `platform_fee_amount` set to `0`
- `practitioner_amount` set to full price
- No `expires_at` — in-person sessions never auto-expire

### `mark_session_paid_in_person(p_session_id uuid, p_method text)`

SECURITY DEFINER. Validates:

- Caller is the session's practitioner (`auth.uid() = therapist_id`)
- Session uses `payment_collection = 'in_person'`
- Sets `payment_method`, `payment_date = NOW()`, `payment_status = 'completed'`

## Edge Function Guards

- `stripe-payment` `create-payment-intent`: returns 400 if the session's `payment_collection = 'in_person'`
- `expire_pending_payment_bookings`: already safe — only targets `status = 'pending_payment'`; in-person sessions have `status = 'scheduled'`

## Web UI Changes

### BookingFlow component (`src/components/booking/BookingFlow.tsx`)

When `acceptInPersonPayment` is true (from practitioner's `users` record):

- 4-step flow: Service & Time → Client Info → **Payment Choice** → Summary
- Payment choice offers "Pay Online" vs "Pay at Clinic" cards
- In-person path calls `create_booking_with_validation` RPC directly (no Stripe)
- Online path retains existing Stripe checkout flow

When `acceptInPersonPayment` is false:

- Original 3-step flow (no payment choice step)

### MarkPaidButton component (`src/components/booking/MarkPaidButton.tsx`)

Reusable component for practitioner session views:

- Shows payment method picker (cash, card terminal, bank transfer, other)
- Calls `mark_session_paid_in_person` RPC
- Displays green "Paid" badge after confirmation

## Email Notifications

- Client booking confirmation: adjusted subject and body for pay-at-clinic ("pay directly at the clinic", "bring your preferred payment method")
- Practitioner booking confirmation: `getPractitionerPaymentStatusText` handles `awaiting_in_person` with clear instructions to mark paid after receiving payment
- Email enrichment includes `paymentCollection` and `isPayAtClinic` fields

## Testing

- SQL verification tests: `supabase/tests/cash_bookings_v1_test.sql`
- Manual E2E checklist: `supabase/tests/cash_bookings_v1_e2e_checklist.md`

## v1.1 — implemented (verify in repo)

The following were planned as “gap closure” and are **present in the codebase** (paths relative to repo root). Re-run SQL/E2E checklists when schema or functions change.

### Guest web bookings

- Route: `/client/ClientBooking?therapistId=<id>&guest=1` — guest mode is driven by `guest=1` in `src/pages/client/ClientBooking.tsx` (see `isGuestMode`).
- `ensure_guest_user_for_booking` is invoked from `src/components/booking/BookingFlow.tsx`.
- **v1 rule:** guest bookings remain pay-at-clinic only (no Stripe for unauthenticated users) where enforced in that flow.
- DB: `guest_view_token` and related behavior as covered in migrations/tests (see `supabase/tests/cash_bookings_v1_test.sql`).

### Practitioner surfaces

- **Upcoming sessions:** `src/pages/practice/UpcomingSessions.tsx` — lists sessions, badges, `MarkPaidButton` for in-person awaiting payment.
- **Payment preferences:** `src/pages/practice/PaymentPreferences.tsx` — toggles `users.accept_in_person_payment`.
- **Manual booking:** `src/pages/practice/ManualBooking.tsx` — practitioner-initiated pay-at-clinic sessions (`p_payment_collection: 'in_person'`).

### RLS, email, guards, tests

- **RLS:** `block_client_payment_update` trigger and practitioner-only RPC `mark_session_paid_in_person` (see migrations + SQL tests).
- **Email / Edge:** booking + cancellation copy and `paymentCollection` / `isPayAtClinic` enrichment as implemented in `send-booking-notification` and related helpers (verify deployed function matches repo).
- **Stripe:** `create-payment-intent` guard for `payment_collection = 'in_person'` as in Edge Function source.
- **Tests:** `supabase/tests/cash_bookings_v1_test.sql`, `supabase/tests/cash_bookings_v1_e2e_checklist.md`.

### Abuse mitigation (still documented, not blocking)

- Guest booking RPC is anon-callable; future: rate limiting, CAPTCHA, or throttling at Edge.

## Follow-up (out of scope)

- Theramate mobile — **client** clinic booking: `bookSessionAndOpenCheckout` in `theramate-ios-client/lib/api/booking.ts` still follows the online Stripe path only (no `p_payment_collection` / pay-at-clinic branch yet). Practitioner flows can call `mark_session_paid_in_person` from `lib/api/practitionerSessions.ts` / session detail UI where implemented.
- Per-product `practitioner_products` payment overrides
- Optional: deposit or card hold for no-show mitigation without full commission
- Guest online payment (Stripe for unauthenticated users)

## Payment flow parity checklist (quick QA)

Use this checklist after changing booking/payment UX so parity gaps are obvious.

### Client booking flows

- [ ] **Web marketplace booking** (`src/components/booking/BookingFlow.tsx`)
  - [ ] When practitioner accepts in-person payments, client sees **Pay online** and **Pay at clinic**
  - [ ] Review step reflects selected payment method clearly
  - [ ] In-person path confirms booking without Stripe redirect
- [ ] **Mobile marketplace booking** (`theramate-ios-client/app/booking/index.tsx`)
  - [ ] If practitioner has `accept_in_person_payment = true`, client sees **Payment method** step
  - [ ] **Pay online** path opens PaymentSheet/Checkout
  - [ ] **Pay at clinic** path confirms booking and routes to booking detail (no checkout)
  - [ ] Review step uses consistent labels: `Pay online` / `Pay at clinic`

### Practitioner booking and payment collection flows

- [ ] **Web practitioner manual booking** (`src/pages/practice/ManualBooking.tsx`)
  - [ ] Creates `p_payment_collection: 'in_person'` bookings
- [ ] **Mobile practitioner manual booking** (`theramate-ios-client/app/(practitioner)/(ptabs)/bookings/new.tsx`)
  - [ ] Creates `p_payment_collection: 'in_person'` bookings
- [ ] **Web practitioner session actions** (`src/pages/practice/UpcomingSessions.tsx`, `src/components/booking/MarkPaidButton.tsx`)
  - [ ] Session card shows collection mode (`Pay at clinic` / `Pay online`)
  - [ ] Awaiting in-person sessions expose `Record clinic payment` action
- [ ] **Mobile practitioner session actions** (`theramate-ios-client/app/(practitioner)/(ptabs)/bookings/index.tsx`, `theramate-ios-client/app/(practitioner)/(ptabs)/bookings/[id].tsx`)
  - [ ] Session list shows payment summary at a glance
  - [ ] Detail screen guides next action for `awaiting_in_person`
  - [ ] Completed in-person state clearly says no further payment action is needed

### Data and API checks

- [ ] `create_booking_with_validation` receives `p_payment_collection: 'in_person'` for pay-at-clinic bookings
- [ ] `mark_session_paid_in_person` updates payment status to `completed`
- [ ] Stripe intent creation is blocked when `payment_collection = 'in_person'`
