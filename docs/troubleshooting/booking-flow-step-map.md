# Booking Flow Step Map (UI Source of Truth)

This document maps booking UI entry points to **files that exist in this monorepo** (`src/` + `theramate-ios-client/`). Older copies listed `peer-care-connect/src/components/marketplace/*` paths; those filenames are **not** guaranteed here.

## Why this exists

There are multiple booking surfaces (web `BookingFlow`, native explore → booking, practitioner mobile requests). Step labels and button text can diverge. A fix in one surface may not apply to another.

## Booking UIs and their components (verified paths)

- **Web — authenticated or guest clinic booking (shared component):**
  - [src/components/booking/BookingFlow.tsx](../../src/components/booking/BookingFlow.tsx)
  - Guests use the same component with **`guestMode`** (see [src/pages/client/ClientBooking.tsx](../../src/pages/client/ClientBooking.tsx) `?guest=1`).

- **Web — practitioner discovery / list before booking:**
  - [src/pages/discovery/TherapistSearch.tsx](../../src/pages/discovery/TherapistSearch.tsx)
  - [src/pages/client/ClientBooking.tsx](../../src/pages/client/ClientBooking.tsx)

- **Native — client explore → practitioner detail → booking / mobile request:**
  - `theramate-ios-client/app/(tabs)/explore/[id].tsx`, `theramate-ios-client/app/booking/`, `theramate-ios-client/lib/api/booking.ts`

- **Native — mobile booking requests (client + practitioner):**
  - [theramate-ios-client/lib/api/mobileRequests.ts](../../theramate-ios-client/lib/api/mobileRequests.ts)
  - `theramate-ios-client/app/(tabs)/profile/mobile-requests/`, `theramate-ios-client/app/(practitioner)/mobile-requests/`

## Historic components (not present under these paths in this repo)

The following names appear in legacy docs; **search** the repo if you need equivalent behaviour:

- `GuestBookingFlow.tsx` (separate file) — guest path is **`BookingFlow` + `guestMode`** on web.
- `MobileBookingRequestFlow.tsx`, `CheckoutFlow.tsx`, `MobileCheckout.tsx`, `PreAssessmentForm.tsx`, `IntakeForm.tsx` — may exist only on other branches or under different folders; grep `src/` and `theramate-ios-client/`.

## Debug checklist

1. Confirm **web vs native** and **guest vs signed-in**.
2. Open [Clinic, mobile & hybrid flows](../features/clinic-mobile-hybrid-flows.md) for modality rules.
3. Trace RPCs in **`supabase/`** (`create_booking_with_validation`, `create_mobile_booking_request`, etc.).
