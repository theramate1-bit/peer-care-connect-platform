# Marketplace & Booking Flow Edge Cases

**Date:** March 2025  
**Status:** 🔍 Discovery & Tracking  
**Scope:** Marketplace listing, practitioner cards, clinic/mobile/guest booking flows

---

## Overview

This document captures edge cases, failure modes, and UX gaps across the marketplace discovery and booking flows—for both logged-in users and guests.

---

## 🔴 Marketplace Listing & Filtering

### 1. **Practitioner with no active products**

**Current state:** Marketplace loads practitioners and filters via `isPractitionerEligibleForMarketplace`, which now requires `canBookClinic(p) || canRequestMobile(p)`.

**Impact:** Practitioners with no bookable clinic or mobile products are hidden from the marketplace.

**Status:** ✅ Fixed: practitioners without bookable products are filtered out.

---

### 2. **Availability filter "today" does nothing**

**Current state:** No UI exposes "today" filter; slot availability is checked in the booking flow.

**Impact:** N/A – availability filtering at list level would require per-practitioner slot data.

**Status:** ✅ Documented; no-op block removed. Slot availability remains in-booking only.

---

### 3. **Price sort uses `Math.min` for both low and high**

**Current state:** `price_low` and `price_high` both sort by **minimum** product price.

**Impact:** "Sort by price (high to low)" actually sorts by minimum price descending, not maximum.

**Status:** ✅ Fixed: `price_high` now uses `Math.max` for most expensive practitioners first.

---

### 4. **Location filter is text substring, not geo**

**Current state:** `selectedLocation` filters by `p.location.toLowerCase().includes(selectedLocation)`.

**Impact:** "London" matches "London" and "Greater London" but not nearby towns. No distance-based filtering unless geo-search is active.

**Status:** ✅ Documented behavior; geo-search provides distance when enabled.

---

### 5. **Practitioner type "unknown"**

**Current state:** When `therapist_type` is null/undefined, badge now defaults to "Clinic-based" with neutral gray styling instead of alarming "Unknown type" red.

**Status:** ✅ Fixed: neutral default for legacy or incomplete profiles.

---

## 🔴 Booking Flow Entry & Routing

### 6. **Hybrid practitioner: neither flow configured**

**Current state:** `canBookClinic` and `canRequestMobile` both require products + config. If practitioner is `hybrid` but has no products with `service_type` both/clinic/mobile, or missing `base_lat/lng` for mobile, both return false.

**Impact:** User clicks "Book" → "Booking not available for this practitioner. No active clinic or mobile services are configured yet."

**Status:** ✅ Handled with toast; user is informed.

---

### 7. **DirectBooking: practitioner with 0 products**

**Current state:** When `offerClinic` and `offerMobile` are both false, page sets error and practitioner null, showing "This practitioner is not currently accepting bookings. No active services are configured."

**Status:** ✅ Fixed: explicit error message when practitioner has no bookable services.

---

### 8. **Mobile practitioner opens clinic flow (redirect)**

**Current state:** `BookingFlow` and `GuestBookingFlow` run `useEffect` that closes clinic flow and opens mobile flow when `therapist_type === 'mobile'` and `canRequestMobile` is true.

**Impact:** User landing on clinic flow (e.g. from old link) is redirected; good UX. If `onRedirectToMobile` is not passed, user just sees error toast and flow closes.

**Status:** ✅ Redirect works when `onRedirectToMobile` provided (Marketplace, DirectBooking). Some entry points may not pass it.

---

## 🟠 Slot Selection & Hold Expiration

### 9. **Payment after reservation expiry**

**Current state:** `BookingExpirationTimer` calls `onExpired` when time runs out. `handleBookingExpired` resets step to 1, clears slot, shows toast.

**Impact:** User on payment step when timer hits 0 is correctly reset. If they somehow bypass (e.g. slow network) and submit payment after expiry, `create_booking_with_validation` may still reject (session status/expiry). Backend should enforce `expires_at`.

**Status:** ✅ Timer UX good; backend expiry enforcement should be verified.

---

### 10. **Slot conflict between selection and create_booking**

**Current state:** User selects slot at T0. Another user books same slot at T1. User submits at T2. `create_booking_with_validation` returns `CONFLICT_BOOKING` or `CONFLICT_BLOCKED`.

**Impact:** Both `BookingFlow` and `GuestBookingFlow` handle both error codes → reset to step 1, `slotUnavailableReturned`, toast.

**Status:** ✅ Fixed: GuestBookingFlow now handles `CONFLICT_BLOCKED` same as `CONFLICT_BOOKING`.

---

### 11. **CalendarTimeSelector: slots not refreshed after expiry**

**Current state:** When `handleBookingExpired` runs, user is sent back to step 1. `bookingData.session_date` and `start_time` are cleared. Calendar re-renders with existing props; slot data comes from parent's fetch.

**Impact:** If slot fetch is cached or not refetched, expired slot might still appear "available" until user changes date. Minor race; usually user picks a new date.

**Status:** ✅ Fixed – GuestBookingFlow and BookingFlow pass a key that changes when `slotUnavailableReturned` is set, forcing CalendarTimeSelector to remount and fetch fresh slots after expiry.

---

## 🟠 Guest vs Logged-in

### 12. **Guest booking with registered email (already fixed)**

**Current state:** `check_email_registered` on blur; "Sign in to book with your account" banner.

**Status:** ✅ Implemented.

---

### 13. **Guest flow: CONFLICT_BLOCKED handling**

**Current state:** See #10.

**Status:** ✅ Fixed. GuestBookingFlow handles `CONFLICT_BLOCKED` same as `CONFLICT_BOOKING`; resets to step 1, shows slot-unavailable toast.

---

### 14. **Switching practitioner mid-flow**

**Current state:** `selectedPractitioner` is set when user clicks a card. If user opens practitioner A's flow, then (without closing) navigates/clicks practitioner B, behavior depends on parent. Marketplace typically sets `selectedPractitioner` and opens one flow at a time.

**Impact:** If parent passes stale `practitioner` prop, BookingFlow could show wrong practitioner name/data. Unlikely with current UI.

**Status:** ✅ Low risk with single-flow modal.

---

## 🟠 Payment & Completion

### 15. **Stripe checkout redirect back**

**Current state:** User completes Stripe Checkout; redirects to success/return URL. If session expired during redirect, user may land on success page with invalid session.

**Status:** ✅ Fixed. BookingSuccess shows "Find my booking" and "Contact support" when session can't be loaded (expired, delayed webhook).

---

### 16. **Same-day booking approval expiry**

**Current state:** Practitioner must approve same-day bookings within a window. If they don't, `approval_expires_at` passes; client's booking may be auto-cancelled or stuck.

**Impact:** See MOBILE_PRACTITIONER_EDGE_CASES.md for same-day flow details.

**Status:** 📋 Documented elsewhere.

---

## 🟡 Data & Consistency

### 17. **Marketplace practitioner payload vs DB**

**Current state:** Practitioner cards use data from initial load. `products` and `therapist_type` can change (practitioner updates profile). User may see stale "Book" eligibility.

**Impact:** User clicks Book on practitioner who just disabled clinic; flow may fail or redirect.

**Status:** ✅ Fixed. Marketplace refetches practitioner (with products) when booking modal opens.

---

### 18. **Unique locations from `p.location`**

**Current state:** `uniqueLocations` built from practitioner locations for filter dropdown.

**Status:** ✅ Fixed – Marketplace, ClientBooking, Credits: trim locations, filter empty, sort for consistent dropdown.

---

### 19. **Services offered filter vs products**

**Current state:** Filter uses `services_offered` (user profile array, e.g. "massage", "cupping"). Products have `name`/`category`. These may not align.

**Impact:** Filter "Massage" might exclude practitioners who offer massage but use different `services_offered` value.

**Status:** ⚠️ Schema alignment; verify filter values match data.

---

## Summary Table

| # | Area              | Severity | Status   |
|---|-------------------|----------|----------|
| 1 | No active products| 🟠       | ✅ Fixed |
| 2 | Availability today| 🔴      | ✅ Documented |
| 3 | Price sort bug    | 🔴       | ✅ Fixed |
| 4 | Location filter   | 🟡       | ✅       |
| 5 | Unknown type      | 🟡       | ✅ Fixed |
| 6 | Hybrid neither    | 🟢       | ✅       |
| 7 | DirectBooking 0 products | 🟠 | ✅ Fixed |
| 8 | Mobile redirect   | 🟢       | ✅       |
| 9 | Payment after expiry | 🟢    | ✅       |
| 10| CONFLICT_BLOCKED guest| 🔴   | ✅ Fixed |
| 11| Slot refresh post-expiry | 🟡 | ✅ Fixed |
| 12| Email registered  | 🟢       | ✅       |
| 13| Guest CONFLICT_BLOCKED | 🔴  | ✅ Fixed |
| 14| Practitioner switch | 🟢     | ✅       |
| 15| Stripe redirect   | 🟠       | ✅ Fixed |
| 17| Stale practitioner data | 🟠  | ✅ Fixed |
| 18| Location strings  | 🟡       | ✅ Fixed |
| 19| Services filter   | 🟠       | ⚠️       |

---

## Related Docs

- [GUEST_EDGE_CASES.md](./GUEST_EDGE_CASES.md) – Guest identity, mobile requests, sessions
- [MOBILE_PRACTITIONER_EDGE_CASES.md](./MOBILE_PRACTITIONER_EDGE_CASES.md) – Mobile request lifecycle, conflicts, travel time
- [STRIPE_RECONCILIATION.md](./STRIPE_RECONCILIATION.md) – Stripe success / DB fail runbook
- [EDGE_CASES_OPEN.md](./EDGE_CASES_OPEN.md) – Master list of open edge cases
