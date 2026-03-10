# Booking Modal Edge Cases

**Date:** March 2025  
**Status:** 🔍 Discovery & Tracking  
**Scope:** RescheduleBooking, UnifiedBookingModal, MobileBookingRequestFlow, PracticeClientManagement

---

## Overview

Edge cases specific to booking modals and dialogs, including reschedule, clinic booking, and mobile request flows.

---

## ✅ Fixed

### 1. **RescheduleBooking: Fake availability**
**Was:** Hardcoded 9:00–18:00 slots every 30 min; no check of practitioner availability, bookings, or blocks.  
**Now:** Uses `RescheduleService.getAvailableTimesForDate()` to fetch real available slots based on working hours, existing bookings (excluding the session being rescheduled), and blocked time.

### 2. **UnifiedBookingModal: Idempotency key**
**Was:** Idempotency key included `Date.now()`, allowing duplicate bookings on double-click.  
**Now:** Removed `Date.now()` for duplicate-click protection.

### 3. **UnifiedBookingModal: check_email_registered**
**Was:** Guest path had no check if email was already registered.  
**Now:** On email blur, calls `check_email_registered` and shows "Sign in to book with your account" banner when applicable.

### 4. **MobileBookingRequestFlow: check_email_registered**
**Was:** Guest path had no check if email was already registered.  
**Now:** Same pattern as above; on email blur, shows sign-in banner when email is registered.

### 5. **UnifiedBookingModal: Guest clientId = 'anonymous' (verified via Supabase MCP)**
**Was:** For non-authenticated users, `p_client_id` was passed as `'anonymous'`. `create_booking_with_validation` expects `p_client_id uuid` — 'anonymous' is not a valid UUID and would fail.  
**Now:** Calls `upsert_guest_user` first for guests, uses returned UUID as `p_client_id`, and passes `p_is_guest_booking: true`.

### 6. **PracticeClientManagement: No pre-validation of slots**
**Was:** Book Session modal used raw date/time inputs; `create_booking_with_validation` only checked on submit.  
**Now:** Integrated `CalendarTimeSelector`; practitioners see only available slots (working hours, bookings, blocks). Idempotency key also fixed (removed `Date.now()`).

---

### 7. **UnifiedBookingModal: Empty services**
**Was:** If services failed to load, `selectedServiceId` stayed `''`; no clear state; Next could be clicked with invalid selection.  
**Now:** Added `servicesLoading` state; shows "Loading services..." while fetching; "No services available" message when empty; Next disabled when loading or no services.

### 8. **Slot refresh after expiry**
**Was:** Returning to step 1 after slot expiry could show stale available slots.  
**Now:** UnifiedBookingModal: `handleBack` calls `fetchAvailableSlots()` when returning to step 1. Marketplace flows (GuestBookingFlow, BookingFlow): CalendarTimeSelector key changes on expiry to force remount and fresh slot fetch. See [MARKETPLACE_BOOKING_EDGE_CASES.md](./MARKETPLACE_BOOKING_EDGE_CASES.md) #11.

### 9. **Guest checkout email warning**
**Was:** No guidance about using same email at Stripe checkout.  
**Now:** GuestBookingFlow step 2 shows "Use this same email when paying to receive your confirmation."

---

## ⚠️ Remaining (Design / Known)

- **24-hour reschedule rule** – Design decision: strict 24h notice. When blocked, RescheduleBooking shows "Message Practitioner" button for urgent requests. Documented; no code change planned.

---

## Supabase MCP Verification (March 2025)

- `create_booking_with_validation`: `p_client_id` is `uuid`; 'anonymous' is invalid and would fail.
- `check_email_registered`: Exists; returns boolean for non-guest email lookup.
- `accept_mobile_booking_request`: Performs conflict checks (sessions, blocks, expiry) before creating session.

---

## Related Docs

- [SUPABASE_SCHEMA_EDGE_CASES.md](./SUPABASE_SCHEMA_EDGE_CASES.md)
- [MOBILE_PRACTITIONER_EDGE_CASES.md](./MOBILE_PRACTITIONER_EDGE_CASES.md) – hybrid/mobile buffer, PracticeClientManagement clinic vs mobile, dashboard mobile requests
- [MARKETPLACE_BOOKING_EDGE_CASES.md](./MARKETPLACE_BOOKING_EDGE_CASES.md)
- [GUEST_EDGE_CASES.md](./GUEST_EDGE_CASES.md)
- [EDGE_CASES_OPEN.md](./EDGE_CASES_OPEN.md)
