# Booking Flow Step Map (UI Source of Truth)

This document maps each booking UI to the exact component so step labels and button states are easy to debug.

## Why this exists

There are multiple booking/checkout UIs in the codebase, each with different step counters and button text. A fix in one flow does not automatically apply to another flow.

## Booking UIs and their components

- Main marketplace booking modal (authenticated users):
  - `peer-care-connect/src/components/marketplace/BookingFlow.tsx`
  - Uses a Radix `Dialog` and custom step indicator.
  - Final action button: `Complete Booking` -> `Processing...` when loading.

- Guest booking modal:
  - `peer-care-connect/src/components/marketplace/GuestBookingFlow.tsx`
  - Separate step progression and button rendering.

- Pre-assessment form inside booking:
  - `peer-care-connect/src/components/forms/PreAssessmentForm.tsx`
  - Has its own step header (`Step X of Y`) and its own final `Complete Booking` button.
  - On submit, header and button now show `Processing...`.

- Checkout card flow:
  - `peer-care-connect/src/components/checkout/CheckoutFlow.tsx`
  - Uses internal `currentStep` and already shows `Processing...` during submit.

- Mobile checkout flow:
  - `peer-care-connect/src/components/checkout/MobileCheckout.tsx`
  - Displays center footer text like `Step N` or `Complete Booking` depending on current step.

## Intake form save behavior (authoritative)

- Booking intake form component:
  - `peer-care-connect/src/components/booking/IntakeForm.tsx`
  - Behavior: collect form data in-memory and pass to parent via `onComplete`.
  - It should **not** persist to DB directly from this component.

- Persistence location:
  - `peer-care-connect/src/components/marketplace/BookingFlow.tsx`
  - Intake form data is saved during booking completion flow, not on intake-form submit click.

## Recent corrections applied

- `PreAssessmentForm` submit state:
  - Replaced `Submitting...` with `Processing...`.
  - While loading, step header text and step counter switch to `Processing...`.

- Removed unused dual-state behavior:
  - `saving` path removed from `PreAssessmentForm` disable checks.
  - Submit disable conditions now rely on `loading` only.

## Debug checklist (if mismatch appears again)

1. Identify exact component from DOM structure and mounted route/modal.
2. Confirm which `Complete Booking` instance is rendered.
3. Verify that flow-specific loading state toggles before async call.
4. Check only one place persists intake data (booking completion path).
5. Validate with lints and then re-test that exact flow in UI.
