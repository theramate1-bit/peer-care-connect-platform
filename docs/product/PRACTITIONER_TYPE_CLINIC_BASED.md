# Practitioner type: clinic_based

**Definition:** Practitioner works only at their clinic. Clients book sessions at the practitioner’s clinic location. No mobile (visit-to-client) option.

---

## 1. booking-flow-type.ts – eligibility and product normalization

- **`canBookClinic(practitioner)`**  
  True when `therapist_type === 'clinic_based'` (or `'hybrid'`) and at least one product is clinic-bookable. For clinic_based, any product with `service_type` clinic or both counts; a product declared as `mobile` is normalized to `clinic` via `getEffectiveProductServiceType`.

- **`canRequestMobile(practitioner)`**  
  Always false for clinic_based (only `'mobile'` and `'hybrid'` are considered for mobile).

- **`getEffectiveProductServiceType(therapistType, product)`**  
  For `therapistType === 'clinic_based'`: if product is `mobile`, effective type is `clinic`; otherwise the declared type is used. So clinic_based practitioners only ever offer clinic-bookable services in the UI.

- **`defaultBookingFlowType(practitioner)`**  
  For clinic_based with clinic products: returns `'clinic'` (only option).

**Relevant file:** `peer-care-connect/src/lib/booking-flow-type.ts`

---

## 2. Marketplace – eligibility, filters, HybridBookingChooser

- **Eligibility:** `isPractitionerEligibleForMarketplace` requires `therapist_type === 'clinic_based'` and `clinic_address` (trimmed) set. Must have at least one bookable product (`canBookClinic` true; `canRequestMobile` is false for clinic_based).

- **Filters:** User can filter by practitioner type; `selectedPractitionerType === 'clinic_based'` shows only clinic-based practitioners.

- **HybridBookingChooser:** Not shown for clinic_based. Only one flow (clinic), so the single “Book” CTA opens the clinic flow. No “Request mobile session” option.

**Relevant file:** `peer-care-connect/src/pages/Marketplace.tsx`

---

## 3. Geo-search

- **Origin for distance:** Clinic-based practitioners use **clinic** coordinates (`clinic_latitude`, `clinic_longitude`) for distance in both the PostGIS RPC and the client-side fallback. They are included when the search location is within the user’s search radius (no mobile radius).

- **Filtering:** No mobile radius check; inclusion is purely “clinic within search radius.”

**Relevant file:** `peer-care-connect/src/lib/geo-search-service.ts`

---

## 4. BookingFlow / GuestBookingFlow / MobileBookingRequestFlow

- **BookingFlow (authenticated) and GuestBookingFlow (guest):** Used for clinic_based. Single booking path; practitioner is refreshed and `canRequestMobile` is false, so no redirect to mobile flow. Slot generation uses `requestedAppointmentType="clinic"` and `therapistType="clinic_based"`; buffer between slots is the default 15 minutes (no mobile travel buffers).

- **MobileBookingRequestFlow:** Not available for clinic_based; the mobile request flow is never shown or opened for this type.

**Relevant files:** `peer-care-connect/src/components/marketplace/BookingFlow.tsx`, `GuestBookingFlow.tsx`, `MobileBookingRequestFlow.tsx`

---

## 5. Profile / Onboarding – validation and location

- **Validation:** For `therapist_type === 'clinic_based'`, required fields are:
  - `clinic_address` (trimmed).
    No base address or mobile radius required.

- **Save / sync:** No “base synced from clinic” logic; only clinic address and clinic lat/long are stored. Base fields are not used for clinic_based.

- **Onboarding:** Location step requires clinic address only; no base address or radius step for clinic_based.

**Relevant files:** `peer-care-connect/src/pages/Profile.tsx`, `peer-care-connect/src/pages/auth/Onboarding.tsx`

---

## 6. ProductForm – service type options

- **Service delivery type:** For clinic_based, the “Service Delivery Type” dropdown (clinic / mobile / both) is **not** shown. All services are treated as clinic-only. If the product table has `service_type` mobile or both, `getEffectiveProductServiceType` still normalizes to clinic for clinic_based in booking logic.

**Relevant file:** `peer-care-connect/src/components/practitioner/ProductForm.tsx`

---

## 7. PracticeClientManagement – internal booking

- **Appointment type:** Practitioner can create bookings for clients. For clinic_based, the appointment type is effectively clinic only (no mobile option needed in UI, or if shown, only clinic is relevant). Slot picker receives `therapistType="clinic_based"` and `requestedAppointmentType="clinic"`; buffers are default 15 minutes.

- **Visit address:** Not used for clinic_based; sessions are at the practitioner’s clinic.

**Relevant file:** `peer-care-connect/src/pages/practice/PracticeClientManagement.tsx`

---

## 8. TherapistDashboard – labels and location

- **Session cards:** For clinic_based, all sessions are clinic. The “Clinic” vs “Mobile” label and visit-address line are only shown when `userProfile?.therapist_type` is `'hybrid'` or `'mobile'`, so clinic_based practitioners may see no type label or only the clinic location from their profile.

- **Location:** Session location is resolved from practitioner’s clinic address (or location); no visit address.

**Relevant file:** `peer-care-connect/src/components/dashboards/TherapistDashboard.tsx`

---

## 9. MobileRequestManagement – accept/decline and “View session”

- **Not applicable.** Clinic_based practitioners do not receive mobile booking requests. They do not use the mobile request queue, accept/decline, or “View session” for mobile requests. The page may be in the nav but will show no requests for clinic_based.

**Relevant file:** `peer-care-connect/src/components/practitioner/MobileRequestManagement.tsx`

---

## 10. RescheduleService – buffer checks

- **Buffer logic:** When rescheduling, `therapistType` is `'clinic_based'`. Slot conflict check uses `requestedAppointmentType` from the session (always clinic for clinic_based). `getDirectionalBufferMinutes` returns 15 for all clinic↔clinic transitions; no 30-minute mobile travel buffers apply.

**Relevant file:** `peer-care-connect/src/lib/reschedule-service.ts` (uses `slot-generation-utils` buffer logic)
