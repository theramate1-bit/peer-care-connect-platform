# Guest — web clinic booking (guest mode)

This repo’s web app lives under **`src/`**. Clinic marketplace booking uses one component with a **guest mode** flag instead of a separate `GuestBookingFlow` component name from older docs.

## Entry points

| Surface                                       | Behaviour                                                                                                                                                                                           |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`src/pages/client/ClientBooking.tsx`**      | Lists practitioners and opens **`BookingFlow`**. **`?guest=1`** enables guest mode (name/email required; no pay-at-clinic choice vs online in the same way as logged-in users — see `BookingFlow`). |
| **`src/pages/discovery/TherapistSearch.tsx`** | Deep-links to **`/client/ClientBooking?therapistId=<id>`** — does **not** append `guest=1` today; unauthenticated users may need that query param depending on product intent (verify UX).          |

## Core UI + RPC path

| File                                         | Role                                                                                                                                                                                                                                                                                  |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`src/components/booking/BookingFlow.tsx`** | If **`guestMode`**: calls **`ensure_guest_user_for_booking`**, sets **`p_is_guest_booking: true`**, passes guest `client_id` into checkout/booking RPC path; restricts **`paymentCollection`** (guest defaults to `'in_person'` / no dual choice where `showPaymentChoice` is false). |
| **`src/lib/clientMarketplaceBooking.ts`**    | **`bookSessionAndOpenCheckout`** passes **`p_is_guest_booking`** into **`create_booking_with_validation`**; Stripe checkout wiring after session creation.                                                                                                                            |

## Practitioner types

`BookingFlow` loads clinic products only (`clinicBooking: true` on product fetch). Practitioner eligibility for mobile vs clinic is **not** guest-specific; guests follow the same practitioner capability rules as clients for whatever UI is exposed.

## Out of scope on web (this repo)

**`createMobileRequestAndOpenCheckout`** exists in **`src/lib/clientMarketplaceBooking.ts`** but is **not** referenced from `BookingFlow` here — native uses the parallel API in **`theramate-ios-client/lib/api/booking.ts`**. See [03-mobile-booking-requests-native.md](./03-mobile-booking-requests-native.md).
