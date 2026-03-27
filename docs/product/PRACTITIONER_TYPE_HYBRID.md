# Practitioner type: hybrid

**Definition:** Practitioner offers both clinic and mobile. Clients can “Book at clinic” or “Request mobile session.” Hybrid must have clinic location for clinic bookings and, for mobile requests, **base** location plus radius (no clinic fallback in backend or eligibility).

---

## 1. booking-flow-type.ts – eligibility and product normalization

- **`canBookClinic(practitioner)`**  
  True when `therapist_type === 'hybrid'` and at least one product is clinic-bookable (product `service_type` clinic or both). So hybrid can offer clinic bookings when they have clinic/both products and a clinic location.

- **`canRequestMobile(practitioner)`**  
  True when `therapist_type === 'hybrid'`, there is at least one mobile-bookable product (product `service_type` mobile or both), `mobile_service_radius_km` is set, and **both** `base_latitude` and `base_longitude` are set. **No clinic fallback:** mobile request flow is only available when base coords exist.

- **`getEffectiveProductServiceType(therapistType, product)`**  
  For `therapistType === 'hybrid'`: effective type is the product’s declared type (clinic, mobile, or both). So hybrid can have products that are clinic-only, mobile-only, or both.

- **`defaultBookingFlowType(practitioner)`**  
  When both clinic and mobile are available: returns `'clinic'` as the default; UI shows both options (e.g. HybridBookingChooser). When only one flow is available, that one is used.

**Relevant file:** `peer-care-connect/src/lib/booking-flow-type.ts`

---

## 2. Marketplace – eligibility, filters, HybridBookingChooser

- **Eligibility:** For `therapist_type === 'hybrid'`, `isPractitionerEligibleForMarketplace` requires: `clinic_address` (trimmed), `mobile_service_radius_km` set, and **either** base coords **or** clinic coords (so they can appear and offer at least clinic). They must pass “at least one bookable” so either `canBookClinic` or `canRequestMobile` is true. A hybrid with only clinic coords can appear and offer clinic only; “Request mobile session” appears only when base is set (e.g. after Profile save syncs base from clinic).

- **Filters:** User can filter by practitioner type; `selectedPractitionerType === 'hybrid'` shows only hybrid practitioners.

- **HybridBookingChooser:** Shown when **both** `canBookClinic` and `canRequestMobile` are true. Two CTAs: “Book at clinic” (opens BookingFlow/GuestBookingFlow) and “Request mobile session” (opens MobileBookingRequestFlow). If only one flow is available, the single “Book” CTA opens that flow.

**Relevant file:** `peer-care-connect/src/pages/Marketplace.tsx`

---

## 3. Geo-search – base-only for mobile (no clinic fallback)

- **Origin for distance:** For hybrid, the **same** rule as mobile in the client-side fallback: **base** coordinates only (`base_latitude`, `base_longitude`). Clinic coordinates are not used for distance. If base is null, the practitioner does not get a distance for the mobile/origin logic and drops out of mobile geo results (but may still appear for clinic if the RPC includes them by clinic location).

- **Filtering:** When shown as mobile-eligible (e.g. filter by “mobile” or “hybrid”), a hybrid is included only if search location is within their **mobile_service_radius_km** from **base**. No clinic fallback for this check.

**Relevant file:** `peer-care-connect/src/lib/geo-search-service.ts`

---

## 4. BookingFlow / GuestBookingFlow / MobileBookingRequestFlow – flows and slot buffers

- **BookingFlow / GuestBookingFlow (clinic):** Used when the client chooses “Book at clinic.” Practitioner is refreshed (including base and clinic coords); slot generation uses `requestedAppointmentType="clinic"` and `therapistType="hybrid"`. Buffers: 15 min after/before clinic slots; **30 min** after a clinic slot before a mobile slot (clinic→mobile) and **30 min** after a mobile slot before a clinic slot (mobile→clinic), so the same practitioner’s schedule is consistent.

- **MobileBookingRequestFlow (mobile):** Used when the client chooses “Request mobile session.” Distance from practitioner **base** only; if base is missing, “Practitioner must set base address for mobile bookings” is shown. Slot generation uses `requestedAppointmentType="mobile"` and `therapistType="hybrid"`. Buffers: **30 min** between mobile sessions (mobile→mobile), **30 min** clinic→mobile, **30 min** mobile→clinic; 15 min between clinic slots. Backend `get_directional_booking_buffer_minutes` and frontend `slot-generation-utils` both apply these rules.

**Relevant files:** `peer-care-connect/src/components/marketplace/BookingFlow.tsx`, `GuestBookingFlow.tsx`, `MobileBookingRequestFlow.tsx`, `peer-care-connect/src/lib/slot-generation-utils.ts`

---

## 5. Profile / Onboarding – validation and “base synced from clinic”

- **Validation:** For `therapist_type === 'hybrid'`, required fields are: `clinic_address` (trimmed) and `mobile_service_radius_km` (positive). **No separate base address required in the UI** for hybrid; base is derived from clinic for storage.

- **Save / sync:** On save, for hybrid, **base is synced from clinic:** `base_address`, `base_latitude`, `base_longitude` are set from clinic values so the DB has base for mobile requests and distance checks. This allows a hybrid to have only clinic filled in the form and still get base\_\* after first save, making `canRequestMobile` true (with radius and products).

- **Onboarding:** Location step requires **clinic address** only for hybrid; radius step requires `mobileServiceRadiusKm`. Base is not a separate step; it is synced from clinic on save.

**Relevant files:** `peer-care-connect/src/pages/Profile.tsx`, `peer-care-connect/src/pages/auth/Onboarding.tsx`

---

## 6. ProductForm – service type options

- **Service delivery type:** Shown when `therapist_type === 'hybrid'` (or mobile). For **hybrid**, the dropdown offers: “Clinic-Based Only”, “Mobile Only”, “Both (Clinic & Mobile)”. So each product can be clinic-only, mobile-only, or both. This drives whether the practitioner shows one or both CTAs on the marketplace for that product.

**Relevant file:** `peer-care-connect/src/components/practitioner/ProductForm.tsx`

---

## 7. PracticeClientManagement – internal booking (clinic vs mobile)

- **Appointment type:** Practitioner can create clinic or mobile bookings. When **clinic** is selected, slot picker gets `therapistType="hybrid"` and `requestedAppointmentType="clinic"`; when **mobile** is selected, `requestedAppointmentType="mobile"` and visit address is required. Buffers match slot-generation-utils: 30 min for clinic↔mobile and mobile↔mobile; 15 min for clinic↔clinic. Backend rejects mobile bookings without `p_visit_address`.

**Relevant file:** `peer-care-connect/src/pages/practice/PracticeClientManagement.tsx`

---

## 8. TherapistDashboard – clinic vs mobile labels and location

- **Session cards:** For `therapist_type === 'hybrid'`, session cards show **“Clinic”** or **“Mobile”** and the resolved location (clinic address or visit address) when `appointment_type` and (for mobile) `visit_address` are present. Uses `getSessionLocation(session, practitioner)` so the practitioner can see at a glance whether they are at clinic or traveling.

- **Today’s schedule / This week:** Same “Clinic” / “Mobile” and location summary on session rows for hybrid (and mobile). Mobile request cards show “Review request” and link to MobileRequestManagement.

**Relevant file:** `peer-care-connect/src/components/dashboards/TherapistDashboard.tsx`, `peer-care-connect/src/utils/sessionLocation.ts`

---

## 9. MobileRequestManagement – accept/decline and “View session”

- **Fully applicable.** Hybrid practitioners receive mobile booking requests like mobile-only. Pending requests appear in the list; practitioner can **Accept** (capture payment, create session) or **Decline** (with optional reason/alternates). After accept, the request has a `session_id`; the UI shows **View session** linking to `/practice/clients?session=<session_id>&tab=sessions`. Dashboard “Today’s Schedule” shows pending mobile requests with “Review request” linking to this page. RPC `get_practitioner_mobile_requests` returns requests for the practitioner regardless of therapist_type (mobile or hybrid).

**Relevant file:** `peer-care-connect/src/components/practitioner/MobileRequestManagement.tsx`

---

## 10. RescheduleService – buffer checks with therapist type

- **Buffer logic:** When rescheduling a session for a hybrid practitioner, `therapistType` is `'hybrid'`. `requestedAppointmentType` is taken from the session’s `appointment_type` (clinic or mobile). Slot conflict check uses the **same** directional buffers as slot-generation-utils: 30 min for mobile→clinic, clinic→mobile, and mobile→mobile; 15 min for clinic→clinic. Backend `get_directional_booking_buffer_minutes` matches. This keeps reschedule consistent with initial booking and accept flows.

**Relevant files:** `peer-care-connect/src/lib/reschedule-service.ts`, `peer-care-connect/src/lib/slot-generation-utils.ts`
