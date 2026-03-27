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

## 2. Where each type is used (quick map)

- **`src/lib/booking-flow-type.ts`** – Central logic: `canBookClinic`, `canRequestMobile`, `getEffectiveProductServiceType`, `isProductClinicBookable`, `isProductMobileBookable`, `defaultBookingFlowType`. All three types handled.
- **`src/pages/Marketplace.tsx`** – Eligibility `isPractitionerEligibleForMarketplace`, filter by `therapist_type`, `HybridBookingChooser` when both flows available. Uses `isValidTherapistType` (clinic_based | mobile | hybrid).
- **`src/lib/geo-search-service.ts`** – Distance/origin: mobile/hybrid use **base** coords only in fallback; no clinic fallback (hybrid without base drops out of mobile geo results).
- **`src/components/marketplace/BookingFlow.tsx`** + **GuestBookingFlow.tsx** – Clinic flow; pass `therapistType` and `requestedAppointmentType="clinic"` into slot generation.
- **`src/components/marketplace/MobileBookingRequestFlow.tsx`** – Mobile request flow; distance from **base** only; shows “Practitioner must set base address for mobile bookings” when base missing.
- **`src/lib/slot-generation-utils.ts`** – Buffers: clinic↔mobile and mobile↔mobile use 30 min for hybrid/mobile; `therapistType` and `requestedAppointmentType` must be passed by callers.
- **`src/pages/Profile.tsx`** – Validation: clinic*based → clinic_address; mobile → base_address + radius; hybrid → clinic_address + radius (no base_address required in UI). **Save:** for hybrid, base*_ is synced from clinic\__ so DB has base for mobile.
- **`src/pages/auth/Onboarding.tsx`** – Same idea: hybrid only requires clinic address + radius; base derived from clinic.
- **`src/components/practitioner/ProductForm.tsx`** – Service type: hybrid can choose clinic / mobile / both; mobile can only choose mobile.
- **`src/pages/practice/PracticeClientManagement.tsx`** – Internal booking: clinic vs mobile; slot picker gets `therapistType` and `requestedAppointmentType`; visit address required for mobile.
- **`src/components/dashboards/TherapistDashboard.tsx`** – Session cards show “Clinic” vs “Mobile” and location for hybrid/mobile when `appointment_type` / `visit_address` present.
- **`src/components/practitioner/MobileRequestManagement.tsx`** – Accept/decline mobile requests; “View session” uses `session_id` from RPC; applies to both mobile and hybrid.
- **`src/lib/reschedule-service.ts`** – Uses `therapistType` and `requestedAppointmentType` for buffer conflict check; handles all three types.

**Backend (Supabase):**

- **`create_mobile_booking_request`** – Requires `base_latitude` / `base_longitude` for mobile and hybrid; no clinic fallback.
- **`get_directional_booking_buffer_minutes`** – 30 min for (hybrid: mobile→clinic, clinic→mobile, mobile→mobile); 15 otherwise.
- **`get_practitioner_mobile_requests`** – Returns `session_id`; used for mobile and hybrid.
- **`create_booking_with_validation`** – Rejects mobile when `p_visit_address` is null/blank; uses directional buffer.

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

### 3.3 Refetch practitioner payload (Marketplace)

- **`refetchPractitioner`** in Marketplace fetches practitioner when opening the booking modal but does **not** select `clinic_latitude` / `clinic_longitude` in the `users` select (it does select `base_latitude`, `base_longitude`, `therapist_type`, etc.).
- **Impact:** `canRequestMobile(refreshed)` only sees base*\*; it does not see clinic*\*. That’s correct for **current** rules (mobile requires base only). So no bug, but if anyone later re-introduces a clinic fallback for hybrid in `canRequestMobile`, they’d need to add clinic_lat/lon to this refetch.

### 3.4 PostGIS RPC `find_practitioners_by_distance`

- Geo search uses Supabase RPC `find_practitioners_by_distance` when available; fallback is in `geo-search-service.ts` (base-only for mobile/hybrid).
- The **RPC** definition was not found in the migrations searched; it may live in another repo or migration. The next engineer should confirm that the RPC uses **base** as origin for mobile and hybrid (and does not use clinic for hybrid), so geo results stay aligned with `canRequestMobile` and `create_mobile_booking_request`.

### 3.5 Product `service_type` vs practitioner type

- **`getEffectiveProductServiceType`** in `booking-flow-type.ts` normalises product `service_type` by practitioner type (e.g. clinic_based + product “mobile” → “clinic”; mobile + product “clinic” → “mobile”; hybrid → “both” when product type is missing). All three types are handled; no known gap, but any new product or practitioner-type logic should go through this helper so behaviour stays consistent.

### 3.6 Reschedule and internal booking

- **Reschedule:** `RescheduleService.checkAvailability` takes `therapistType` and `requestedAppointmentType` and uses the same buffer rules; practitioner is loaded from `users.therapist_type`. Correct for all three types.
- **Internal (practice) booking:** Slot picker and `create_booking_with_validation` get therapist type and appointment type; mobile requires visit address. No known gap.

---

## 4. Summary for handover

- **Three types:** clinic_based, mobile, hybrid. Single source of truth for “who can do what” is `booking-flow-type.ts` plus backend RPCs.
- **Hybrid:** Can offer clinic and mobile. Mobile is only offered when **base** coords (and radius) exist; no clinic fallback in backend or in `canRequestMobile` / geo fallback. Profile/onboarding sync base from clinic on save so hybrids get base after first save.
- **Main gap:** `HYBRID_CLINIC_AND_MOBILE_BOOKING_RULES.md` is out of date and should be updated or superseded.
- **Verify after changes:** Run through marketplace (list, clinic book, mobile request), Profile save (hybrid base sync), geo search, and internal booking for all three types; confirm no unintended clinic fallback for mobile.

---

## 5. References

- **Plan:** `.cursor/plans/hybrid_mobile_eligibility_and_ops_b7ce41be.plan.md`
- **DB alignment:** `docs/product/SUPABASE_MCP_ALIGNMENT_HYBRID_MOBILE.md`
- **Booking flow logic:** `peer-care-connect/src/lib/booking-flow-type.ts`
- **Out of date (update or supersede):** `docs/product/HYBRID_CLINIC_AND_MOBILE_BOOKING_RULES.md`

**Type-specific docs (touchpoints per practitioner type):**

- **Clinic-based:** `docs/product/PRACTITIONER_TYPE_CLINIC_BASED.md`
- **Mobile:** `docs/product/PRACTITIONER_TYPE_MOBILE.md`
- **Hybrid:** `docs/product/PRACTITIONER_TYPE_HYBRID.md`

**Booker types (guest vs client) – per–user-type docs:**

- **Guest:** `docs/product/USER_TYPE_GUEST.md` – flow selection, GuestBookingFlow, MobileBookingRequestFlow (guest path), view by token, email, conversion.
- **Client:** `docs/product/USER_TYPE_CLIENT.md` – BookingFlow, ClientBooking page, My Sessions, in-app reschedule/cancel.
