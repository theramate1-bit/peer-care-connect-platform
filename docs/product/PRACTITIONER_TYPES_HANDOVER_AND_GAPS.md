# Practitioner types handover – clinic_based, mobile, hybrid

Handover note for the next engineer working on the three practitioner types. This doc defines the types, where they’re used, and **gaps or inconsistencies** to be aware of.

---

## 1. The three types

| Type             | Meaning                    | Clinic booking | Mobile request           | Location / radius                                                                                                                                       |
| ---------------- | -------------------------- | -------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **clinic_based** | Works only at their clinic | Yes            | No                       | `clinic_address` + `clinic_latitude` / `clinic_longitude`                                                                                               |
| **mobile**       | Travels to client only     | No             | Yes                      | `base_address` + `base_latitude` / `base_longitude` + `mobile_service_radius_km`                                                                        |
| **hybrid**       | Can do both                | Yes            | Yes (if base coords set) | Clinic: same as clinic*based. Mobile: \*\*base*\*\*\* only (no clinic fallback for mobile). Profile/onboarding: base can be synced from clinic on save. |

**Source of truth (backend):** Mobile request creation requires **real** `base_latitude` / `base_longitude` (and `mobile_service_radius_km`) for both **mobile** and **hybrid**. There is no clinic fallback in the backend for mobile requests.

---

## 2. Where each type is used (quick map — this repo)

> **Important:** The monolithic **`src/lib/booking-flow-type.ts`** and many **`src/pages/Marketplace.tsx`** / **`src/components/marketplace/*`** paths described in older handovers **are not present** in repo-root `src/` on this branch. Use the following instead:

- **Flow rules (narrative):** [Clinic, mobile & hybrid flows](../features/clinic-mobile-hybrid-flows.md)
- **Web clinic booking:** [src/components/booking/BookingFlow.tsx](../../src/components/booking/BookingFlow.tsx) (guests: `guestMode`)
- **Web discovery / booking entry:** [src/pages/client/ClientBooking.tsx](../../src/pages/client/ClientBooking.tsx), [src/pages/discovery/TherapistSearch.tsx](../../src/pages/discovery/TherapistSearch.tsx), [src/lib/marketplacePractitioners.ts](../../src/lib/marketplacePractitioners.ts)
- **Native practitioner detail (CTAs):** `theramate-ios-client/app/(tabs)/explore/[id].tsx` (`canBookClinic`, `canRequestMobile`)
- **Native mobile requests:** [theramate-ios-client/lib/api/mobileRequests.ts](../../theramate-ios-client/lib/api/mobileRequests.ts), `theramate-ios-client/app/(practitioner)/mobile-requests/`
- **Native availability / slots / exchange:** `theramate-ios-client/lib/api/booking.ts`, `theramate-ios-client/lib/api/practitionerAvailability.ts`, `theramate-ios-client/lib/api/practitionerExchange.ts`
- **Backend (Supabase):** `supabase/migrations`, RPCs `create_mobile_booking_request`, `create_booking_with_validation`, `get_directional_booking_buffer_minutes`, etc.

---

## 3. Gaps and things to watch

### 3.1 Out-of-date doc (can mislead)

- **`docs/product/HYBRID_CLINIC_AND_MOBILE_BOOKING_RULES.md`** still describes the **old** behaviour:
  - It says backend and frontend use `COALESCE(base_*, clinic_*)` for hybrid and that “canRequestMobile” treats “has origin coords” as base **or** clinic.
  - **Current behaviour:** backend and frontend use **base only** for mobile eligibility and distance; no clinic fallback. Hybrid without base does not get mobile request flow or mobile geo results.
- **Action:** Update that doc to match current rules (base-only for mobile, Profile syncs base from clinic on save) or mark it as superseded by this handover and the plan/MCP alignment docs.

### 3.2 Marketplace eligibility vs mobile CTA

- **Marketplace eligibility** for hybrid allows `(hasBaseCoords || hasClinicCoords)` so a hybrid with only clinic coords can still appear and offer **clinic** booking.
- **Mobile CTA** uses `canRequestMobile`, which requires **base** coords only (no clinic fallback).
- So: hybrid with only clinic coords appears on marketplace, can be booked at clinic only; “Request mobile session” does not show until they have base (e.g. after Profile save, which syncs base from clinic). This is intentional; no code bug, but worth documenting so the next engineer doesn’t “fix” it by re-adding a clinic fallback for mobile.

### 3.3 Refetch practitioner payload (web booking modal)

- Older **Marketplace** implementations refetched practitioner rows when opening the booking modal. In this repo, trace **`BookingFlow`** / **`ClientBooking`** and ensure any refetch used for **mobile** eligibility includes **`base_latitude` / `base_longitude`** (and clinic coords only where clinic booking needs them).

- Geo search uses Supabase RPC `find_practitioners_by_distance` when available; client-side distance logic may live in web/native booking code — **search** `src/` and `theramate-ios-client/` for `find_practitioners_by_distance` / radius checks.
- The **RPC** definition may not appear in every branch’s migrations; confirm in your linked Supabase project that the RPC uses **base** as origin for mobile and hybrid (not clinic for hybrid mobile).

### 3.5 Product `service_type` vs practitioner type

- **`getEffectiveProductServiceType`** — product `service_type` is still normalized in **web** booking code and **RPCs**; locate helpers by searching `src/components/booking` and `theramate-ios-client/lib/api/booking.ts` for `service_type` / clinic vs mobile product filtering.

### 3.6 Reschedule and internal booking

- **Reschedule:** `RescheduleService.checkAvailability` takes `therapistType` and `requestedAppointmentType` and uses the same buffer rules; practitioner is loaded from `users.therapist_type`. Correct for all three types.
- **Internal (practice) booking:** Slot picker and `create_booking_with_validation` get therapist type and appointment type; mobile requires visit address. No known gap.

---

## 4. Summary for handover

- **Three types:** clinic_based, mobile, hybrid. Behaviour is split across **web `BookingFlow`**, **native explore + booking APIs**, and **Supabase RPCs** — there is no single `booking-flow-type.ts` file in repo-root `src/` to edit for all surfaces.
- **Hybrid:** Can offer clinic and mobile. Mobile is only offered when **base** coords (and radius) exist; no clinic fallback in backend or in `canRequestMobile` / geo fallback. Profile/onboarding sync base from clinic on save so hybrids get base after first save.
- **Main gap:** `HYBRID_CLINIC_AND_MOBILE_BOOKING_RULES.md` is out of date and should be updated or superseded.
- **Verify after changes:** Run through marketplace (list, clinic book, mobile request), Profile save (hybrid base sync), geo search, and internal booking for all three types; confirm no unintended clinic fallback for mobile.

---

## 5. References

- **Plan:** `.cursor/plans/hybrid_mobile_eligibility_and_ops_b7ce41be.plan.md`
- **DB alignment:** `docs/product/SUPABASE_MCP_ALIGNMENT_HYBRID_MOBILE.md`
- **Booking flow logic:** [Clinic, mobile & hybrid flows](../features/clinic-mobile-hybrid-flows.md); [src/components/booking/BookingFlow.tsx](../../src/components/booking/BookingFlow.tsx); native `theramate-ios-client/app/(tabs)/explore/[id].tsx`
- **Out of date (update or supersede):** `docs/product/HYBRID_CLINIC_AND_MOBILE_BOOKING_RULES.md`

**Type-specific docs (touchpoints per practitioner type):**

- **Clinic-based:** `docs/product/PRACTITIONER_TYPE_CLINIC_BASED.md`
- **Mobile:** `docs/product/PRACTITIONER_TYPE_MOBILE.md`
- **Hybrid:** `docs/product/PRACTITIONER_TYPE_HYBRID.md`

**Booker types (guest vs client) – per–user-type docs:**

- **Guest:** `docs/product/USER_TYPE_GUEST.md` – flow selection, GuestBookingFlow, MobileBookingRequestFlow (guest path), view by token, email, conversion.
- **Client:** `docs/product/USER_TYPE_CLIENT.md` – BookingFlow, ClientBooking page, My Sessions, in-app reschedule/cancel.
