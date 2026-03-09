# Availability & Booking System - BMAD Plan

**Date:** 2025-02-20  
**Method:** BMAD (Breakthrough Method for Agile AI Driven Development)  
**Feature:** Availability Management & Double-Booking Prevention

---

## Executive Summary

This plan addresses critical availability and booking system requirements to ensure:
1. Customers only see available time slots
2. Staff can manually book without causing double bookings
3. System prevents overlapping bookings
4. Temporary holds during checkout (5 minutes)

---

## Acceptance Criteria

### AC1: Customer - Only Available Time Slots Displayed

**As a customer**, I want to only see time slots that are actually available, so that I can book confidently without risking cancellation or rescheduling.

**Acceptance Criteria:**
- ✅ Only available time slots are displayed
- ✅ Booked slots are not shown or are visibly disabled
- ✅ Availability updates in real time
- ✅ If two customers attempt to book the same slot, only the first completed booking is confirmed
- ✅ Once booked, the slot is immediately removed from availability

**Current Status:**
- ✅ Database-level validation prevents double bookings
- ✅ Real-time subscriptions exist for availability updates
- ⚠️ Need to verify UI properly filters unavailable slots
- ⚠️ Hold time is 15 minutes (should be 5 minutes per requirements)

---

### AC2: Business Owner/Staff - Manual Booking

**As a business owner/staff member**, I want to manually book a time slot, so that my calendar stays accurate and prevents online double bookings.

**Acceptance Criteria:**
- ✅ Staff can view all availability in calendar format (day/week view)
- ✅ Staff can create a booking directly in the dashboard
- ✅ Once saved, that time slot becomes unavailable online instantly
- ✅ The system prevents staff from booking over an existing appointment
- ⚠️ The system shows a warning if a conflict is attempted

**Current Status:**
- ✅ `AppointmentScheduler.tsx` allows manual booking
- ✅ Database triggers prevent conflicts
- ⚠️ Need to verify conflict warning UI

---

### AC3: System-Level - Prevent Double Bookings

Prevent two bookings from occupying the same resource at the same time, so that no double-bookings occur.

**Acceptance Criteria:**
- ✅ Each booking is tied to:
  - A time slot
  - A service duration
  - A specific resource (staff member, chair, room, etc.)
- ✅ The system checks for overlapping time ranges before confirming
- ✅ Overlapping bookings are blocked
- ✅ Buffer times (if configured) are respected
- ✅ Time zone handling is consistent

**Current Status:**
- ✅ Database triggers: `prevent_overlapping_bookings()`
- ✅ RPC validation: `create_booking_with_validation()`
- ✅ 15-minute buffer enforced
- ✅ Timezone support in `practitioner_availability`

---

### AC4: Temporary Reservation During Checkout

**As a customer**, when I select a time slot, I want it temporarily reserved while I complete checkout.

**Acceptance Criteria:**
- ⚠️ Selecting a slot places a temporary hold (e.g., 5 minutes) - **CURRENTLY 15 MINUTES**
- ✅ If checkout is completed → slot is confirmed
- ✅ If abandoned → slot is released automatically
- ✅ Other users cannot book a slot while it is held

**Current Status:**
- ✅ `pending_payment` status with `expires_at` implemented
- ⚠️ Hold time is 15 minutes (should be 5 minutes)
- ✅ Automatic expiration via database triggers

---

## Implementation Tasks

### Task 1: Reduce Hold Time to 5 Minutes

**Files to Update:**
- `supabase/migrations/20260203_reduce_booking_hold_time.sql` - Update to 5 minutes
- `src/components/marketplace/BookingFlow.tsx` - Update frontend hold time
- `src/components/marketplace/GuestBookingFlow.tsx` - Update frontend hold time

**Changes:**
1. Update `create_booking_with_validation` function to use 5 minutes
2. Update `enforce_paid_before_schedule` trigger to use 5 minutes
3. Update frontend booking flows to use 5 minutes

---

### Task 2: Verify UI Slot Filtering

**Files to Check:**
- `src/components/booking/UnifiedBookingModal.tsx`
- `src/components/booking/CalendarTimeSelector.tsx`
- `src/components/booking/EnhancedBookingCalendar.tsx`
- `src/components/marketplace/BookingFlow.tsx`

**Verification:**
1. Ensure booked slots are filtered out
2. Ensure expired `pending_payment` slots are filtered out
3. Ensure blocked time slots are filtered out
4. Ensure slots outside working hours are filtered out

---

### Task 3: Add Conflict Warning for Manual Bookings

**Files to Update:**
- `src/pages/practice/AppointmentScheduler.tsx`

**Changes:**
1. Check for conflicts before creating manual booking
2. Show warning dialog if conflict detected
3. Allow user to proceed or cancel

---

### Task 4: Verify Real-Time Updates

**Files to Check:**
- `src/components/booking/UnifiedBookingModal.tsx` - Real-time subscription
- `src/components/BookingCalendar.tsx` - Real-time subscription
- `src/pages/practice/AppointmentScheduler.tsx` - Real-time subscription

**Verification:**
1. Test that slots disappear when booked by another user
2. Test that slots appear when hold expires
3. Test that blocked time updates in real-time

---

## Test Cases

### Test 1: Customer - Available Slots Only
1. Open booking modal for a practitioner
2. Select a date
3. **Verify:** Only available slots are shown
4. **Verify:** Booked slots are not visible
5. **Verify:** Expired holds are not visible

### Test 2: Real-Time Updates
1. Open booking modal in two browser windows
2. Select same date and practitioner
3. Book a slot in window 1
4. **Verify:** Slot disappears in window 2 immediately

### Test 3: Temporary Hold (5 Minutes)
1. Select a time slot
2. **Verify:** Slot is held (status: `pending_payment`)
3. Wait 5 minutes without completing checkout
4. **Verify:** Slot is released and available again

### Test 4: Manual Booking Conflict Prevention
1. As staff, open AppointmentScheduler
2. Try to create booking for already-booked slot
3. **Verify:** System prevents booking
4. **Verify:** Warning message shown

### Test 5: Double Booking Prevention
1. Two users attempt to book same slot simultaneously
2. **Verify:** Only first completed booking succeeds
3. **Verify:** Second booking receives conflict error

---

## Database Verification

### Check Current Hold Time
```sql
-- Check current hold time in function
SELECT 
  p.proname,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'create_booking_with_validation';
```

### Check Trigger Function
```sql
-- Check trigger function for hold time
SELECT 
  p.proname,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'enforce_paid_before_schedule';
```

---

## Success Criteria

- ✅ Hold time reduced to 5 minutes
- ✅ UI properly filters unavailable slots
- ✅ Real-time updates work correctly
- ✅ Manual bookings prevent online double bookings
- ✅ Conflict warnings shown for manual bookings
- ✅ All test cases pass

---

## Notes

- Current hold time is 15 minutes (migration `20260203_reduce_booking_hold_time.sql`)
- Need to reduce to 5 minutes per requirements
- Database-level validation is working correctly
- Real-time subscriptions are in place
- Need to verify UI filtering logic
