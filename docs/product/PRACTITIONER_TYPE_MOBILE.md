# Practitioner type: mobile

**Definition:** Practitioner travels to the client only. No clinic location for client bookings. Clients “request a mobile session” at their address; practitioner must have base location and service radius.

> **Repo paths:** Mentions of `peer-care-connect/src/...` below are **historical**. Live code: **`src/`**, **`theramate-ios-client/`**, **`supabase/`**. See [Clinic, mobile & hybrid flows](../features/clinic-mobile-hybrid-flows.md).

---

## 1. Eligibility and product normalization (historic `booking-flow-type.ts` name)

- **`canBookClinic(practitioner)`**  
  Always false for mobile (only `'clinic_based'` and `'hybrid'` offer clinic). So mobile practitioners never show a “Book at clinic” option.

- **`canRequestMobile(practitioner)`**  
  True when `therapist_type === 'mobile'`, there is at least one mobile-bookable product, `mobile_service_radius_km` is set, and **both** `base_latitude` and `base_longitude` are set. No clinic fallback; base is required.

- **`getEffectiveProductServiceType(therapistType, product)`**  
  For `therapistType === 'mobile'`: if product is declared `clinic`, effective type is `mobile`; otherwise the declared type is used. So all products are treated as mobile-bookable for mobile practitioners.

- **`defaultBookingFlowType(practitioner)`**  
  For mobile with mobile products and base + radius: returns `'mobile'` (only option).

**Implementation:** [Clinic, mobile & hybrid flows](../features/clinic-mobile-hybrid-flows.md); search `src/components/booking` and `theramate-ios-client/app/(tabs)/explore/[id].tsx`.

---

## 2. Marketplace – eligibility, filters, HybridBookingChooser

- **Eligibility:** `isPractitionerEligibleForMarketplace` for `therapist_type === 'mobile'` requires: `base_address` (trimmed), `mobile_service_radius_km` set, and **both** `base_latitude` and `base_longitude` set. Must have at least one bookable product (`canRequestMobile` true; `canBookClinic` is false).

- **Filters:** User can filter by practitioner type; `selectedPractitionerType === 'mobile'` shows only mobile practitioners.

- **HybridBookingChooser:** Not shown for mobile. Only one flow (mobile request), so the single “Book” / “Request mobile session” CTA opens the mobile request flow. No “Book at clinic” option.

**Relevant file:** `src/pages/discovery/TherapistSearch.tsx + src/pages/client/ClientBooking.tsx`

---

## 3. Geo-search – base-only (no clinic fallback)

- **Origin for distance:** Mobile practitioners use **base** coordinates only (`base_latitude`, `base_longitude`) in both the PostGIS RPC and the client-side fallback. Clinic coordinates are not used for distance or eligibility.

- **Filtering:** A mobile practitioner is included in results only if the search location is within their **mobile_service_radius_km** from base. If `base_latitude`/`base_longitude` are missing, they do not appear in mobile geo results.

**Relevant file:** `search src/ + supabase RPC find_practitioners_by_distance`

---

## 4. BookingFlow / GuestBookingFlow / MobileBookingRequestFlow

- **BookingFlow and GuestBookingFlow:** Not the primary path for mobile. If a mobile practitioner is ever opened in the clinic flow (e.g. stale state), the flow checks `canRequestMobile` and may redirect to mobile request flow; for pure mobile, clinic flow is not offered.

- **MobileBookingRequestFlow:** Main booking path for mobile. Client enters their address; distance is computed from practitioner **base** only. Slot generation uses `requestedAppointmentType="mobile"` and `therapistType="mobile"`; buffers are 30 minutes between mobile sessions (mobile→mobile) and 15 minutes otherwise. If base coords are missing, user sees “Practitioner must set base address for mobile bookings.”

**Relevant files:** `src/components/booking/BookingFlow.tsx`, `GuestBookingFlow.tsx`, `theramate-ios-client/lib/api/mobileRequests.ts + native mobile-request screens`

---

## 5. Profile / Onboarding – validation and location

- **Validation:** For `therapist_type === 'mobile'`, required fields are:
  - `base_address` (trimmed, with detailed street validation),
  - `mobile_service_radius_km` (positive).
    No clinic address required for eligibility as a mobile practitioner.

- **Save / sync:** No “base synced from clinic”; base is the primary location. Clinic is not used for mobile request eligibility.

- **Onboarding:** Location step requires base address; radius step requires `mobileServiceRadiusKm`. No clinic address required for mobile.

**Relevant files:** `search src/ + native profile screens`, `src/pages/onboarding/ClientOnboarding.tsx (client); native app/(auth)/`

---

## 6. ProductForm – service type options

- **Service delivery type:** Shown when `therapist_type === 'mobile'` (or hybrid). For **mobile** practitioners, the only option in the dropdown is “Mobile Service” (`service_type: 'mobile'`). Products are mobile-only.

**Relevant file:** `search theramate-ios-client for practitioner products UI`

---

## 7. PracticeClientManagement – internal booking

- **Appointment type:** For mobile practitioners, internal bookings can be clinic or mobile; in practice they will create mobile sessions. When creating a **mobile** appointment, visit address is required; slot picker receives `therapistType="mobile"` and `requestedAppointmentType="mobile"`. Buffers: 30 minutes between mobile sessions (mobile→mobile); 15 minutes otherwise. Backend `create_booking_with_validation` requires `p_visit_address` when `p_appointment_type = 'mobile'`.

**Relevant file:** `search src/pages/practice and native practitioner clients`

---

## 8. TherapistDashboard – labels and location

- **Session cards:** For `therapist_type === 'mobile'`, session cards show “Mobile” and the resolved location (visit address or “Visit address to be confirmed”) when `appointment_type` and `visit_address` are present. Uses `getSessionLocation(session, practitioner)` for display.

- **Today’s schedule / This week:** Mobile practitioners see “Mobile” and location summary on session rows (when not an exchange or mobile request card).

**Relevant file:** `theramate-ios-client practitioner tabs + src/pages/practice/`, `theramate-ios-client/lib/sessionLocation.ts (native); search src/ for web session location`

---

## 9. MobileRequestManagement – accept/decline and “View session”

- **Fully applicable.** Mobile practitioners receive mobile booking requests. Pending requests appear in the list; practitioner can **Accept** (capture payment, create session) or **Decline** (with optional reason/alternates). After accept, the request gets a `session_id`; the UI shows **View session** linking to `/practice/clients?session=<session_id>&tab=sessions`. Dashboard “Today’s Schedule” also shows pending mobile requests with “Review request” linking to this page.

**Relevant file:** `theramate-ios-client/app/(practitioner)/mobile-requests/`

---

## 10. RescheduleService – buffer checks

- **Buffer logic:** When rescheduling a session for a mobile practitioner, `therapistType` is `'mobile'`. If the session is `appointment_type === 'mobile'`, `requestedAppointmentType` is `'mobile'`. Slot conflict check uses 30-minute buffer between mobile sessions (mobile→mobile) and 15 minutes for other adjacent slots. Backend directional buffer function matches (mobile→mobile = 30).

**Relevant files:** `src/components/booking/RescheduleSessionButton.tsx + native session APIs`, `search src/ + theramate-ios-client/lib/api/booking.ts for slot logic`
