# Mobile practitioners

## Definition

**`therapist_type === 'mobile'`** — practitioner travels to the client. Primary client path is **request → pay/checkout → practitioner accepts** (not the same as picking a fixed diary slot like clinic in all cases — see [Clinic, mobile & hybrid flows](../clinic-mobile-hybrid-flows.md)).

## Client UX

### Native

**`app/(tabs)/explore/[id].tsx`**

- **`canBookClinic`** — **false** when `therapist_type === 'mobile'`.
- **`canRequestMobile`** — **true** for mobile (and hybrid).

For **pure mobile**, the main CTA routes to **`/booking/mobile-request`** with **`practitionerId`**.

There is no **`/booking/choose-mode`** for mobile-only (chooser is for **hybrid**).

### Web

Current **`src/`** clinic **`BookingFlow`** is built around **clinic** products and **`p_appointment_type: 'clinic'`**. There is **no** dedicated mobile-request wizard under **`src/`** in this snapshot — parity lives in **native** and **`src/lib/clientMarketplaceBooking.ts`** **`createMobileRequestAndOpenCheckout`** for API reuse.

## Profile / validation

**`validatePracticeLocations`** for **`mobile`**:

- **Base address** + **base map pin** required.
- **`mobile_service_radius_km`** positive.

No clinic address required.

## Products

Mobile practitioners normally sell **`service_type: 'mobile'`** products. Web clinic booking filters **exclude** pure mobile rows when **`clinicBooking: true`**.

## Sessions

Mobile visits use **`appointment_type = 'mobile'`** and require **`visit_address`** (and related fields) where enforced by RPC — see Supabase migrations touching **`create_booking_with_validation`** and mobile accept flows.
