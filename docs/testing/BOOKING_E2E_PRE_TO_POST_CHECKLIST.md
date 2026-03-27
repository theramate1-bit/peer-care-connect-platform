# Booking E2E: Pre to Post Checklist

**Use this checklist to verify all booking paths (clinic, mobile request, hybrid) work end-to-end before demos or production.**

---

## 1. Pre-booking (Discovery & entry points)

### 1.1 Marketplace (`/marketplace`)

- [ ] **List load** – Practitioners load with `therapist_type`, `clinic_latitude`, `clinic_longitude`, `base_latitude`, `base_longitude`, `mobile_service_radius_km`, `products` (with `service_type`, `is_active`).
- [ ] **Eligibility** – Only practitioners with at least one of `canBookClinic` or `canRequestMobile` appear (see `isPractitionerEligibleForMarketplace`).
- [ ] **Hybrid** – Hybrid practitioners have both clinic and mobile products; they pass both `canBookClinic` and `canRequestMobile` when they have clinic coords (or base) + radius + products.
- [ ] **Card CTAs:**
  - **Clinic-only:** Single “Book” → opens clinic flow.
  - **Mobile-only:** Single “Request” → opens mobile request flow.
  - **Hybrid:** Two buttons (Book at clinic | Request mobile) via `HybridBookingChooser`.
- [ ] **Smart search / refetch** – When selecting a practitioner from smart search, refetched practitioner includes `clinic_latitude`, `clinic_longitude`, `products` so hybrid chooser and flows work.
- [ ] **Geo search** – When searching by location, results include hybrid practitioners; distance for hybrid uses `base_* ?? clinic_*` so they appear when within radius.

### 1.2 Client booking page (e.g. `/client/booking` or equivalent)

- [ ] Practitioner list includes `therapist_type`, `clinic_latitude`, `clinic_longitude`, `base_*`, `products` (with `service_type`).
- [ ] Same CTA logic as marketplace: clinic-only → Book; mobile-only → Request; hybrid → both options via `HybridBookingChooser`.

### 1.3 Mobile request status / “new request” (e.g. from email or status page)

- [ ] When opening “new request” or alternate, practitioner is loaded with `*` or at least `clinic_latitude`, `clinic_longitude`, `base_*`, `products` so `MobileBookingRequestFlow` distance and validation work for hybrid.

---

## 2. During booking

### 2.1 Clinic flow (`BookingFlow` / `GuestBookingFlow`)

- [ ] **Mobile-only guard** – If someone opens clinic flow for a **mobile-only** practitioner, they are redirected to mobile request flow (toast + `onRedirectToMobile`). Hybrid and clinic-based are **not** redirected.
- [ ] **Refreshed payload** – When refreshing practitioner from DB for this guard, `refreshed` includes `clinic_latitude`, `clinic_longitude` so `canRequestMobile(refreshed)` is correct for hybrid.
- [ ] **Products** – Only clinic-bookable products (and “both”) are shown/selectable; mobile-only products are excluded.
- [ ] **Guest flow** – Same behaviour for unauthenticated users via `GuestBookingFlow`.

### 2.2 Mobile request flow (`MobileBookingRequestFlow`)

- [ ] **Practitioner** – Accepts practitioner with `therapist_type`, `base_*`, `clinic_*`, `mobile_service_radius_km`, `products`. For **hybrid**, distance and validation use `base_latitude ?? clinic_latitude` and `base_longitude ?? clinic_longitude`.
- [ ] **Services** – Only mobile-bookable products (and “both”) are listed.
- [ ] **Address & distance** – Client enters address; distance from practitioner origin (base or clinic for hybrid) is computed; validated against `mobile_service_radius_km`.
- [ ] **Submit** – Calls `create_mobile_booking_request`; backend uses same origin logic (e.g. `COALESCE(base_*, clinic_*)` for hybrid).

---

## 3. Post-booking

### 3.1 Clinic booking (after payment)

- [ ] Session created (e.g. `client_sessions`); confirmation emails/UI show clinic location where applicable.
- [ ] No address required for clinic; practitioner and client see session in dashboards.

### 3.2 Mobile request (after payment)

- [ ] `mobile_booking_requests` row created; payment held.
- [ ] **Practitioner dashboard:** Pending mobile requests appear in **Today's Schedule** with "Mobile request" and **Review request** (mobile + hybrid). **Review request** → `/practice/mobile-requests?requestId=<id>` where practitioner can **Accept** or **Decline**.
- [ ] On accept: session created (e.g. via `create_session_from_mobile_request` or equivalent); client address/location stored and used for practitioner (e.g. “visit address” in emails or dashboard).
- [ ] Confirmation and reminder emails (client and practitioner) include correct session location (clinic vs visit address).

---

## 4. Code touchpoints (quick reference)

| Area                       | File(s)                                               | What to check                                                                                                                                                                                   |
| -------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Eligibility & CTAs         | `lib/booking-flow-type.ts`                            | `canBookClinic`, `canRequestMobile` (hybrid = base OR clinic coords for mobile).                                                                                                                |
| Marketplace list & modals  | `pages/Marketplace.tsx`                               | Load includes clinic\_\*; cards use canBookClinic/canRequestMobile; HybridBookingChooser when both.                                                                                             |
| Clinic flow (auth)         | `components/marketplace/BookingFlow.tsx`              | Mobile-only redirect; refreshed has clinic\_\* for canRequestMobile.                                                                                                                            |
| Clinic flow (guest)        | `components/marketplace/GuestBookingFlow.tsx`         | Same as BookingFlow.                                                                                                                                                                            |
| Mobile request flow        | `components/marketplace/MobileBookingRequestFlow.tsx` | Distance/validation use base ?? clinic for hybrid.                                                                                                                                              |
| Geo search                 | `lib/geo-search-service.ts`                           | Fallback distance for hybrid uses base ?? clinic.                                                                                                                                               |
| Client booking page        | `pages/client/ClientBooking.tsx`                      | Practitioner has clinic\_\*, products; same CTA/chooser logic.                                                                                                                                  |
| Mobile request status      | `components/client/MobileRequestStatus.tsx`           | Practitioner load includes coords and products for MobileBookingRequestFlow.                                                                                                                    |
| **Practitioner dashboard** | `components/dashboards/TherapistDashboard.tsx`        | Fetches pending mobile requests via `get_practitioner_mobile_requests`; merges into Today's Schedule with `is_mobile_request: true`; "Review request" → `/practice/mobile-requests?requestId=`. |
| **Accept/decline mobile**  | `components/practitioner/MobileRequestManagement.tsx` | Page at `/practice/mobile-requests`; Accept (capture payment, create session), Decline (release, optional alternate); works for mobile and hybrid.                                              |
| Backend mobile request     | `create_mobile_booking_request` (RPC)                 | Origin for hybrid = COALESCE(base*\*, clinic*\*).                                                                                                                                               |

---

## 5. Hybrid-specific summary

- **Rule:** Hybrid = clinic + mobile; no extra restrictions. Same flows as clinic-based (for clinic) and mobile-only (for mobile).
- **Origin for mobile:** Base if set; otherwise clinic. Applied in: `booking-flow-type.ts` (canRequestMobile), `MobileBookingRequestFlow`, geo-search fallback, backend RPC.
- **Data:** Everywhere we pass a practitioner into a booking flow or eligibility check, include `clinic_latitude`, `clinic_longitude` (and `base_*`, `products`) so hybrid is supported.

See also: `docs/product/HYBRID_CLINIC_AND_MOBILE_BOOKING_RULES.md`.
