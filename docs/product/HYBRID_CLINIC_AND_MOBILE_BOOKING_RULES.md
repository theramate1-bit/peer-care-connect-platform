# Hybrid Practitioners: Clinic + Mobile Booking Rules

**Canonical product/engineering rules for hybrid practitioners on the marketplace and all booking entry points.**

> **Update (current behaviour):** The “Mobile Origin for Hybrid” rule below used to allow clinic as fallback when base was missing. **Current implementation uses base only:** mobile requests and “can request mobile” require real `base_latitude`/`base_longitude` (and radius). Profile/Onboarding sync base from clinic on save so hybrids get base after first save. See **`docs/product/PRACTITIONER_TYPES_HANDOVER_AND_GAPS.md`** for the full handover and gap list.

## Rule: Hybrid = Both Clinic and Mobile

- **Hybrid** practitioners offer **both**:
  1. **Clinic bookings** – client books a session at the practitioner’s clinic (same as clinic-based).
  2. **Mobile requests** – client requests a visit to their location (same flow as mobile-only).

- **Hybrid mobile bookings MUST follow the same flow as mobile-only.** They use `create_mobile_booking_request` and the practitioner Accept/Decline flow in **New Bookings**, never same-day approval. Same-day approval is for **clinic** bookings only.

- On the **marketplace** (and any entry point that lists or books practitioners):
  - Show **both** options for hybrid: “Book at clinic” and “Request mobile session” (e.g. via `HybridBookingChooser` or equivalent).
  - **Clinic flow:** `BookingFlow` / `GuestBookingFlow` (existing).
  - **Mobile flow:** `MobileBookingRequestFlow` (existing); backend uses `create_mobile_booking_request` and related RPCs.

- The **entire flow** for hybrid must match mobile-only for the mobile path and clinic-based for the clinic path. No special-case restrictions that block hybrid from either path.

## Rule: Mobile origin for hybrid (current = base only)

- **Current implementation:** Mobile request flow and “can request mobile” require **real** `base_latitude`/`base_longitude` (and `mobile_service_radius_km`) for both mobile and hybrid. There is **no** clinic fallback in backend or in `canRequestMobile` / geo-search.
- **Backend:** `create_mobile_booking_request` requires `base_latitude` and `base_longitude`; returns a clear error if missing.
- **Frontend:**
  - **Eligibility:** `canRequestMobile()` is true only when `base_latitude` and `base_longitude` are set (plus radius and mobile-bookable product).
  - **Distance:** `MobileBookingRequestFlow` and geo-search fallback use **base** coords only for mobile/hybrid.
- **Profile/Onboarding:** For hybrid, base is synced from clinic on save, so after first save the practitioner has base\_\* and can receive mobile requests.

## Implementation Checklist (current)

- [x] **`lib/booking-flow-type.ts`** – `canRequestMobile()` requires base_lat/lon only (no clinic fallback).
- [x] **Marketplace** – Eligibility for hybrid allows clinic OR base so they can appear and offer clinic; mobile CTA only when `canRequestMobile` (base set). Hybrid shows `HybridBookingChooser` when both flows available.
- [x] **`MobileBookingRequestFlow`** – Distance and validation use **base** coords only; “Practitioner must set base address for mobile bookings” when base missing.
- [x] **Backend** – `create_mobile_booking_request` requires base\_\* for mobile and hybrid; no clinic fallback.
- [x] **Geo-search** – Fallback uses base only for mobile/hybrid; hybrids without base drop out of mobile results.
- [x] **BookingFlow / GuestBookingFlow** – Pass `therapistType` and `requestedAppointmentType`; refetch includes base*\* (clinic*\* not required for `canRequestMobile`).

## Same-day approval vs mobile requests

- **Same-day approval** (`SameDayBookingApproval`, `get_pending_same_day_bookings`): For **clinic** bookings only, when a client books a same-day clinic session. Practitioner approves/declines in the dashboard.
- **Mobile requests** (Accept/Decline in **New Bookings**): For **all mobile bookings** (mobile-only and hybrid). Uses `create_mobile_booking_request` → practitioner Accept/Decline. Never uses same-day approval.
- `create_booking_with_validation` rejects same-day mobile (error: "Mobile sessions for today must use Request Visit to My Location") so no mobile session ever enters the same-day approval queue.

## Practitioner dashboard and accept/decline (mobile + hybrid)

- **Today's Schedule** (and upcoming list) includes **pending mobile booking requests** for the logged-in practitioner. Each appears as "Mobile request" with client name, service, duration and a **Review request** button.
- **Review request** navigates to **`/practice/mobile-requests?requestId=<id>`** (Mobile Request Management page). There the practitioner can:
  - **Accept** – capture payment hold, create session, send acceptance notification to client.
  - **Decline** – release payment hold, optionally give reason and/or suggest alternate date/time; client is notified.
- This applies to **both mobile-only and hybrid** practitioners; the RPC `get_practitioner_mobile_requests` returns requests for the practitioner regardless of `therapist_type`. The dashboard fetches pending requests and merges them into the session list so they appear in Today's Schedule.

## References

- `peer-care-connect/src/lib/booking-flow-type.ts` – `canBookClinic`, `canRequestMobile`, `isProductClinicBookable`, `isProductMobileBookable`.
- `peer-care-connect/src/pages/Marketplace.tsx` – cards, `HybridBookingChooser`, modal routing.
- `peer-care-connect/src/components/marketplace/MobileBookingRequestFlow.tsx` – distance from base/clinic for hybrid.
- Backend: `create_mobile_booking_request` (Supabase RPC) – origin coords for hybrid.
