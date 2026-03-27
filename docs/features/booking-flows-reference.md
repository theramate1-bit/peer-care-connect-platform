# Booking Flows Reference (Canonical)

This is the source-of-truth document for all booking-related flows in the app.
Use this when debugging UI labels, step counters, submit behavior, and save timing.

## Scope

This document covers:

- Authenticated marketplace booking flow
- Guest marketplace booking flow
- Pre-assessment flow embedded in booking
- Practitioner intake flow embedded in booking
- Checkout card/mobile variants that also expose booking steps

## High-Level System View

At a high level, all booking paths follow the same lifecycle:

1. Select service + time
2. Validate availability + policy
3. Create or prepare session record
4. Collect any required pre-session data
5. Create payment session / redirect to checkout
6. Confirm booking state updates

The UI and step counts differ by flow and user type.

---

## 1) Authenticated Marketplace Booking

**Component:** `peer-care-connect/src/components/marketplace/BookingFlow.tsx`

### Who uses this

- Signed-in users booking from marketplace modal

### Step model

`BookingFlow` sets `totalSteps` to **3** for clients and **5** for non-clients (`isClient ? 3 : 5`).

#### Client path (3 steps)

- **Step 1 — Service & time**
  - User selects service, date, and slot
  - Validates required fields before continue
- **Step 2 — Confirm & pay**
  - Review summary, cancellation policy acceptance
  - **Complete booking** (`handleBooking`) creates the session (RPC `create_booking_with_validation`), then either:
    - **Pre-assessment required** → advance to step 3, or
    - **Not required** → continue to payment integration in the same handler
- **Step 3 — Pre-assessment** (when shown)
  - Renders `PreAssessmentForm` after a session exists; **not** before the confirm step
  - Completes before final payment where the flow requires it

#### Practitioner/non-client path (4 UI steps)

- **Step 1 — Service & time**
- **Step 2 — Review**
  - Pricing/policy acceptance
- **Step 3 — Intake**
  - Uses `IntakeForm` component
- **Step 4 — Payment**
  - Final completion trigger

The component passes `totalSteps={5}` when `!isClient` for the shared progress header; the rendered flow is **steps 1–4** above.

### Submit/Loading behavior

- Bottom CTA shows `Processing...` while `loading` is true.
- Step indicator in this component has its own loading presentation.

### Data persistence timing

- Session/payment creation happens during final booking action.
- Intake payload from `IntakeForm` is persisted in completion path, not as field-by-field autosave.

---

## 2) Guest Marketplace Booking

**Component:** `peer-care-connect/src/components/marketplace/GuestBookingFlow.tsx`

### Who uses this

- Users booking without an authenticated account

### Step model

- **Step 1 - Service & Time**
- **Step 2 - Guest Information**
  - Name, email, phone, policy acceptance
- **Step 3 - Pre-Assessment**
  - Uses pre-assessment form path before payment completion

### Submit/Loading behavior

- Final CTA switches to processing state while async actions run.

### Data persistence timing

- Session and payment records are created in completion path.
- Pre-assessment persistence happens on pre-assessment submit step (not per keystroke).

---

## 3) Pre-Assessment Form Flow (Embedded)

**Component:** `peer-care-connect/src/components/forms/PreAssessmentForm.tsx`

### Where used

- Embedded inside booking flows where pre-assessment is required/available.

### Step model

- **Step 1 - Background Information**
- **Step 2 - Session Details**
- **Step 3 - Body Map**
- **Step 4 - Review & Submit**

### Submit/Loading behavior

- Final submit button: `Complete Booking` -> `Processing...` while loading.
- Header text changes from step labels/counter to `Processing...` during submit.

### Data persistence timing

- Persists pre-assessment data on explicit submit.
- No autosave-to-DB on every field change.

---

## 4) Practitioner Intake Form Flow (Embedded)

**Component:** `peer-care-connect/src/components/booking/IntakeForm.tsx`

### Where used

- Embedded in practitioner/non-client booking path (`BookingFlow` step 3).

### Step model

- Dynamic field form based on service type template.
- Not a multi-page wizard; validation occurs on blur + submit.

### Submit/Loading behavior

- Submit action validates all required fields.
- On submit, returns payload to parent flow via `onComplete`.

### Data persistence timing (important)

- **Canonical rule:** no direct DB autosave from this component during editing.
- Parent booking completion flow is responsible for final persistence.

---

## 5) Checkout Card Flow

**Component:** `peer-care-connect/src/components/checkout/CheckoutFlow.tsx`

### Step model

- Internal step array with visual progress header and per-step content rendering.
- Final step shows `Complete Booking` and submit control.

### Submit/Loading behavior

- Final action displays `Processing...` when `isProcessing` is true.

### Data persistence timing

- Occurs in checkout submit handler; not per-step autosave.

---

## 6) Mobile Checkout Flow

**Component:** `peer-care-connect/src/components/checkout/MobileCheckout.tsx`

### Step model

- Compact mobile steps:
  - Review
  - Details
  - Payment
  - Confirm

### Submit/Loading behavior

- Footer center text now shows `Processing...` during final submit.
- Final CTA shows spinner + `Processing...` and navigation buttons are disabled while processing.

### Data persistence timing

- Occurs on final submit callback.

---

## Save/State Matrix (Quick Reference)

| Flow                | UI Step State Owner | Final Submit State | Persist Timing                               |
| ------------------- | ------------------- | ------------------ | -------------------------------------------- |
| `BookingFlow`       | `step`              | `loading`          | Final booking action                         |
| `GuestBookingFlow`  | `step`              | `loading`          | Final booking action + pre-assessment submit |
| `PreAssessmentForm` | `currentStep`       | `loading`          | On explicit form submit                      |
| `IntakeForm`        | internal form state | `loading`          | Parent-controlled completion path            |
| `CheckoutFlow`      | `currentStep`       | `isProcessing`     | Final checkout submit                        |
| `MobileCheckout`    | `currentStep`       | `isProcessing`     | Final checkout submit                        |

---

## Debug Playbook (When UI Text/Step Looks Wrong)

1. Identify exact rendered component from DOM path and route/modal context.
2. Confirm which flow owns the visible step text (not all labels come from same component).
3. Check that flow's loading flag transitions before async submit (`loading` or `isProcessing`).
4. Verify persistence location:
   - form component submit vs parent completion handler
5. Re-test the same path (client/guest/mobile/practitioner) after patch.

---

## File Index

- `peer-care-connect/src/components/marketplace/BookingFlow.tsx`
- `peer-care-connect/src/components/marketplace/GuestBookingFlow.tsx`
- `peer-care-connect/src/components/forms/PreAssessmentForm.tsx`
- `peer-care-connect/src/components/booking/IntakeForm.tsx`
- `peer-care-connect/src/components/checkout/CheckoutFlow.tsx`
- `peer-care-connect/src/components/checkout/MobileCheckout.tsx`

---

## Change Control

This document must be kept accurate. When making changes to booking flows, update this reference accordingly.

### When to Update This Document

Update this document when you:

- ✅ Add, remove, or rename steps in any booking flow
- ✅ Change step labels, button text, or loading states
- ✅ Modify data persistence timing (when/how data is saved)
- ✅ Add a new booking flow component
- ✅ Change which component handles submit/loading states
- ✅ Modify the step indicator or progress display logic
- ✅ Change validation or field requirements

### What to Update

For each affected flow section, update:

1. **Step model** - List all steps with their exact labels and purpose
2. **Submit/Loading behavior** - Document button text changes and loading states
3. **Data persistence timing** - Clarify when data is saved (immediate vs. on submit vs. parent-controlled)
4. **Save/State Matrix** - Update the quick reference table if state names or timing change
5. **File Index** - Add new component paths if you create a new flow

### Verification Checklist

Before marking a booking flow change as complete:

- [ ] Updated the relevant flow section in this document
- [ ] Updated the Save/State Matrix table if state names changed
- [ ] Tested the UI to confirm step labels match documentation
- [ ] Verified loading states show "Processing..." (not step numbers) during submit
- [ ] Confirmed data persistence timing matches what's documented
- [ ] Updated "Last Updated" date at the bottom of this document
- [ ] If adding a new flow, added it to the File Index

### Example Update Workflow

**Scenario:** You add a new "Review" step to the authenticated booking flow.

1. **Code change:** Modify `BookingFlow.tsx` to add step 2.5
2. **Documentation update:**
   - Update "1) Authenticated Marketplace Booking" → Step model section
   - Update Save/State Matrix if step count affects state logic
   - Update Last Updated date
3. **Verification:**
   - Test the flow end-to-end
   - Confirm step indicator shows correct step
   - Verify loading state behavior still works
   - Check that data persistence timing is unchanged

### Related Documentation

- [Booking Flow Step Map](../troubleshooting/booking-flow-step-map.md) - Technical component mapping
- [Marketplace Booking Modes Runbook](../troubleshooting/marketplace-booking-modes-runbook.md) - Therapist-type and user-type journey tables, RPC/edge-function mapping, error triage
- [How Booking Works](./how-booking-works.md) - High-level booking system overview
- [Booking System](./booking-system.md) - System architecture details

---

**Last Updated:** 2026-03-26
