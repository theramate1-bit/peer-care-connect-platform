# Hybrid practitioners

## Definition

**`therapist_type === 'hybrid'`** — offers **both**:

1. **Clinic** — direct slot booking (`/booking` on native; web **`BookingFlow`**).
2. **Mobile** — visit request flow (`/booking/mobile-request`).

## Client UX — mode chooser (native)

**`theramate-ios-client/app/booking/choose-mode.tsx`**

Opened from **`explore/[id].tsx`** when **`therapist_type === 'hybrid'`** (see **`openBooking`** branch).

- **At the clinic** → **`/booking`** (slot flow).
- **Mobile / home visit** → **`/booking/mobile-request`**.

## Base vs clinic coordinates (critical)

**`buildPracticeLocationUpdate`** (**`theramate-ios-client/lib/practitionerProfile.ts`**):

- For hybrid, if the practitioner has clinic coords but hasn’t set separate base coords, **base lat/long can default from clinic** so mobile distance checks and requests still work.
- **`validatePracticeLocations`** allows hybrid with **either** base or clinic pins (flexible onboarding), but **radius is required** for hybrid.

This mirrors the “base synced from clinic” behaviour described in legacy **`PRACTITIONER_TYPE_HYBRID.md`**, implemented here in **`buildPracticeLocationUpdate`**.

## Explore CTAs

**`explore/[id].tsx`** shows **both** clinic and mobile actions when **`canBookClinic && canRequestMobile`** (true for hybrid). **`openBooking`** still sends hybrid users through **`choose-mode`** first so they explicitly pick clinic vs mobile.

## Products

Hybrid may offer **`service_type`** **`clinic`**, **`mobile`**, or **`both`** per product.

- **Clinic booking** screens should only offer clinic-eligible products (web filters mobile-only rows when **`clinicBooking: true`**).

## Buffers

Hybrid schedules mix clinic and mobile appointments; **directional travel buffers** apply on the server when inserting/overlapping sessions — see [06-slots-conflicts-and-directional-buffers.md](./06-slots-conflicts-and-directional-buffers.md).
