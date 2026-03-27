# Marketplace Booking E2E Sign-off Checklist

Use this checklist for production sign-off of booking-mode behavior across clinic, mobile, and hybrid paths.

## Test Run Metadata

| Field                  | Value                  |
| ---------------------- | ---------------------- |
| Date                   |                        |
| Tester                 |                        |
| Environment            |                        |
| Frontend commit/branch |                        |
| Supabase project ref   | `aikqnvltuwwgifuocvto` |
| Stripe mode            |                        |

---

## Preconditions

- At least one `hybrid` practitioner configured with:
  - active clinic-bookable product (`service_type` in `clinic`/`both`)
  - active mobile-bookable product (`service_type` in `mobile`/`both`)
  - `mobile_service_radius_km`, `base_latitude`, `base_longitude` present
- At least one client account and one guest test identity available
- `mobile-payment`, `stripe-payment`, and `send-email` functions deployed
- Test card and Stripe checkout flow reachable

---

## Core Scenarios

### 1) Hybrid clinic path

1. Open marketplace and select a hybrid practitioner (via card and Smart Search, both).
2. Verify dual choice appears: `Book at Clinic` and `Request Visit to My Location`.
3. Choose `Book at Clinic`.
4. Complete clinic booking flow through payment/success.
5. Confirm booking appears as session in client/practitioner views.

Expected:

- No forced redirect to mobile path.
- Clinic booking uses clinic modal path.
- Success page loads and session is confirmed (per display normalization rules).

Pass/Fail:  
Evidence (URL, screenshots, IDs):  
Notes:

---

### 2) Hybrid mobile path

1. Open same hybrid practitioner.
2. Choose `Request Visit to My Location`.
3. Complete mobile flow:
   - service/time
   - location selected from suggestion (coordinates set)
   - pre-assessment step
   - review
   - Stripe hold checkout
4. Verify redirect to `/mobile-booking/success`.
5. Confirm request is created and visible in mobile request lists.

Expected:

- Mobile path remains separate from clinic booking.
- Success finalization handled by `MobileBookingSuccess`.
- Request status/payment status updated logically (pending + held after successful authorization).

Pass/Fail:  
Evidence (request ID, payment intent, screenshots):  
Notes:

---

### 3) Mobile cancel path

1. Start mobile checkout and cancel from Stripe.
2. Confirm return path behavior.
3. Ensure no actionable request is incorrectly sent/confirmed.
4. If request exists in pending+held state, cancel from client request UI and verify hold release.

Expected:

- Cancel message appears.
- No false success confirmation.
- Hold release path works when applicable.

Pass/Fail:  
Evidence:  
Notes:

---

### 4) Success-page recovery path (localStorage-missing fallback)

1. Complete mobile checkout.
2. Before success page finalizes, clear localStorage key `mobile_checkout_context_{requestId}` (or use a separate browser context).
3. Reload `/mobile-booking/success` with same query params.
4. Verify success still finalizes and notification context is reconstructed from DB.

Expected:

- Finalization succeeds without localStorage context.
- No crash; user sees success state.
- Notification/email path still has required context.

Pass/Fail:  
Evidence:  
Notes:

---

## Supabase MCP Verification (after each scenario)

Run these checks after each scenario and record output snippets.

1. Mobile request state snapshot

```sql
select id, status, payment_status, stripe_payment_intent_id, session_id, created_at
from mobile_booking_requests
order by created_at desc
limit 10;
```

2. Session creation (clinic + accepted mobile)

```sql
select id, therapist_id, client_id, appointment_type, status, payment_status, created_at
from client_sessions
order by created_at desc
limit 10;
```

3. Pre-assessment persistence (mobile accepted path)

```sql
select id, session_id, client_email, completed_at, created_at
from pre_assessment_forms
order by created_at desc
limit 10;
```

4. Edge function error scan (time window around test)

- `mobile-payment`
- `stripe-payment`
- `send-email`
- `location-proxy`

Record:

- HTTP status distribution
- any `4xx/5xx` bodies
- request IDs correlated to test cases

---

## Production Sign-off Summary

| Scenario                   | Result | Blocking issues | Owner | Follow-up |
| -------------------------- | ------ | --------------- | ----- | --------- |
| Hybrid clinic path         |        |                 |       |           |
| Hybrid mobile path         |        |                 |       |           |
| Mobile cancel path         |        |                 |       |           |
| Success-page recovery path |        |                 |       |           |

Final decision: `Go` / `No-Go`  
Approver:  
Date:
