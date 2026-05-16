# Payment System

**Audience:** Junior developers

The Payment System is the end-to-end money flow for bookings, payouts, subscriptions, and payment-related notifications.

---

## What the Payment System Covers

- Client checkout for clinic and mobile booking flows
- Practitioner onboarding to Stripe Connect
- Practitioner payouts and earnings visibility
- Subscription and billing portal flows
- Webhook-driven booking confirmation and payment state sync

---

## Core Flows

### 1) Booking payment (client side)

At booking time, the app creates a payment session/intent, confirms payment with Stripe, then marks bookings as confirmed through webhook processing.

See:

- [How the Payment System Works](./how-payments-work.md)
- [Edge Functions Reference](../architecture/edge-functions.md)

### 2) Practitioner money operations

Practitioners need Stripe Connect onboarding before they can receive payouts. Billing and analytics surfaces then expose payout and earnings data.

Related:

- [Practitioner mobile — remaining work & status](../product/PRACTITIONER_MOBILE_REMAINING.md)
- [Mobile Native Completion Checklist](../product/MOBILE_NATIVE_COMPLETION_CHECKLIST.md)

### 3) Post-payment emails and notifications

Payment success events trigger transactional emails and in-app notifications. These flows are backend-driven and should be treated as source-of-truth for booking confirmation status.

See:

- [Edge Functions Reference](../architecture/edge-functions.md)
- [Email Audit and Triggers](../product/EMAIL_AUDIT_AND_TRIGGERS.md)

---

## Key Edge Functions (Money Path)

Common payment-related functions:

- `stripe-payment`
- `mobile-payment` / `mobile-payment-v2`
- `stripe-webhooks`
- `verify-checkout`
- `customer-portal`
- `send-email` (for payment-related confirmations)

Function details and callers are documented in:

- [Edge Functions Reference](../architecture/edge-functions.md)

---

## Mobile/Web Surface Mapping

For full route and surface mapping across web + native:

- [Mobile ↔ Web full screen & surface inventory](../product/MOBILE_WEB_FULL_SCREEN_INVENTORY.md)

For native-first behavior on money and signed-document URLs:

- [Mobile Native Completion Checklist](../product/MOBILE_NATIVE_COMPLETION_CHECKLIST.md)

In short: payment and signed URL hand-offs should open in the controlled in-app hosted WebView flow, not uncontrolled external browser hand-offs, except for explicit exceptions documented in the checklist.

---

## Related Documentation

- [How the Payment System Works](./how-payments-work.md)
- [How Booking Works](./how-booking-works.md)
- [Edge Functions Reference](../architecture/edge-functions.md)
- [MOBILE_BOOKING_FLOW_SUPABASE_MCP_AUDIT](../product/MOBILE_BOOKING_FLOW_SUPABASE_MCP_AUDIT.md)
