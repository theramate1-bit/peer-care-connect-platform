# Booking E2E: Pre to Post Checklist

**Use this checklist to verify all booking paths (clinic, mobile request, hybrid) work end-to-end before demos or production.**

---

## 1. Pre-booking (Discovery & entry points)

### 1.1 Discovery / client booking (web)

Routes vary by branch; common entry points are **`src/pages/discovery/TherapistSearch.tsx`** and **`src/pages/client/ClientBooking.tsx`**, backed by **`src/lib/marketplacePractitioners.ts`** and **`src/lib/clientMarketplaceBooking.ts`**.

- [ ] **List load** – Practitioners include `therapist_type`, coordinates, radius, and `products` (`service_type`, `is_active`) as required by your listing query.
- [ ] **Eligibility** – Only practitioners who should appear in the marketplace are returned (see RPC / view used by `fetchMarketplacePractitioners`).
- [ ] **Hybrid / mobile** – If the UI exposes separate clinic vs mobile actions, confirm both paths load the fields needed for distance and validation (native parity: **`theramate-ios-client/app/(tabs)/explore/[id].tsx`** and booking APIs).
- [ ] **Card CTAs** – Match product rules in [Clinic, mobile & hybrid flows](../features/clinic-mobile-hybrid-flows.md); this checkout’s web **`BookingFlow`** may be **clinic-slot** oriented — confirm mobile request UI exists where you expect (web vs native only).

### 1.2 Client booking page (e.g. `/client/booking` or equivalent)

- [ ] Same data requirements as discovery: practitioner row must carry whatever **`BookingFlow`** / **`clientMarketplaceBooking`** need for CTAs and payment.

### 1.3 Mobile request status / “new request” (e.g. from email or status page)

- [ ] Mobile request checkout uses **`createMobileRequestAndOpenCheckout`** (see **`src/lib/clientMarketplaceBooking.ts`**) or the native equivalent; practitioner payload includes coords, radius, and products for hybrid distance rules.

---

## 2. During booking

### 2.1 Clinic flow (`BookingFlow`, `guestMode`)

- [ ] **Mobile-only guard** – If your branch redirects mobile-only practitioners out of the clinic flow, confirm the refreshed practitioner row still includes coordinates used for that guard.
- [ ] **Products** – Clinic-bookable products match what `fetchPractitionerProducts(..., { clinicBooking: true })` returns.
- [ ] **Guest flow** – Same component with **`guestMode`** (query `?guest=1` on **`ClientBooking`** when implemented).

### 2.2 Mobile request flow (web and/or native)

- [ ] **Web:** **`createMobileRequestAndOpenCheckout`** in **`src/lib/clientMarketplaceBooking.ts`** (RPC `create_mobile_booking_request`, Stripe checkout as wired).
- [ ] **Native:** parity flows under **`theramate-ios-client/`** (search `mobile_booking_requests`, `create_mobile_booking_request`).
- [ ] **Practitioner row** – Includes `therapist_type`, `base_*`, `clinic_*`, `mobile_service_radius_km`, `products` when hybrid rules apply.
- [ ] **Address & distance** – Client-entered address vs practitioner origin (`COALESCE(base_*, clinic_*)` pattern in RPCs) and radius checks.

---

## 3. Post-booking

### 3.1 Clinic booking (after payment)

- [ ] Session created (e.g. `client_sessions`); confirmation emails/UI show clinic location where applicable.
- [ ] No address required for clinic; practitioner and client see session in dashboards.

### 3.2 Mobile request (after payment)

- [ ] `mobile_booking_requests` row created; payment held.
- [ ] **Practitioner dashboard:** Pending mobile requests surface where your practitioner UI lists them (web **`src/pages/practice/*`** and/or native schedule — search `mobile_booking_requests`).
- [ ] On accept: session created (e.g. via `create_session_from_mobile_request` or equivalent); client address/location stored and used for practitioner (e.g. “visit address” in emails or dashboard).
- [ ] Confirmation and reminder emails (client and practitioner) include correct session location (clinic vs visit address).

---

## 4. Code touchpoints (quick reference)

| Area                    | File(s) (repo-root web unless noted)                                                             | What to check                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Eligibility & CTAs      | `src/lib/clientMarketplaceBooking.ts`, native `theramate-ios-client/app/(tabs)/explore/[id].tsx` | Therapist type + product rules; see [clinic-mobile-hybrid-flows.md](../features/clinic-mobile-hybrid-flows.md). |
| Marketplace / discovery | `src/lib/marketplacePractitioners.ts`, `src/pages/discovery/TherapistSearch.tsx`                 | Payload shape, filters, and any hybrid/mobile CTAs your route implements.                                       |
| Clinic flow             | `src/components/booking/BookingFlow.tsx`                                                         | Product load (`clinicBooking`), slots, guest vs auth payment behaviour.                                         |
| Client booking entry    | `src/pages/client/ClientBooking.tsx`                                                             | Deep links (`therapistId`, `guest=1`) and hand-off into `BookingFlow`.                                          |
| Mobile request (web)    | `src/lib/clientMarketplaceBooking.ts` (`createMobileRequestAndOpenCheckout`)                     | RPC + Stripe path; hybrid origin rules.                                                                         |
| Backend mobile request  | `create_mobile_booking_request` (RPC in `supabase/migrations`)                                   | Origin for hybrid = `COALESCE(base_*, clinic_*)` (confirm in migration body).                                   |

---

## 5. Hybrid-specific summary

- **Rule:** Hybrid = clinic + mobile; no extra restrictions. Same flows as clinic-based (for clinic) and mobile-only (for mobile).
- **Origin for mobile:** Base if set; otherwise clinic. Applied in **RPCs** (`create_mobile_booking_request` and related), **`clientMarketplaceBooking`**, and native booking helpers — search the repo for `base_latitude` / `clinic_latitude` in the path you are testing.
- **Data:** Everywhere we pass a practitioner into a booking flow or eligibility check, include `clinic_latitude`, `clinic_longitude` (and `base_*`, `products`) so hybrid is supported.

See also: `docs/product/HYBRID_CLINIC_AND_MOBILE_BOOKING_RULES.md`.
