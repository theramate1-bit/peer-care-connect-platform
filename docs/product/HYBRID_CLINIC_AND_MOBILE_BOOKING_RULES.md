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

- [x] **Eligibility** — `canRequestMobile`-style checks require **base** coords only (see native explore `[id].tsx` and web `BookingFlow` search for `therapist_type` / mobile).
- [x] **Marketplace** — hybrid can list with clinic-only coords; mobile CTA appears when base exists (after profile sync).
- [x] **Mobile request UI** — native `mobileRequests` + RPCs; web may be partial — search `src/` for `mobile_booking`.

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

- [Clinic, mobile & hybrid flows](../features/clinic-mobile-hybrid-flows.md) — narrative source of truth for CTAs and flows.
- [src/components/booking/BookingFlow.tsx](../../src/components/booking/BookingFlow.tsx) — web clinic booking (`guestMode` for guests).
- [src/lib/marketplacePractitioners.ts](../../src/lib/marketplacePractitioners.ts) — practitioner list for web discovery.
- Native: `theramate-ios-client/app/(tabs)/explore/[id].tsx`, [theramate-ios-client/lib/api/mobileRequests.ts](../../theramate-ios-client/lib/api/mobileRequests.ts).
- Backend: `create_mobile_booking_request` and related RPCs under **`supabase/`**.
