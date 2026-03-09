# Availability System in Marketplace Booking Flow - Explained

## Overview

The availability system in the marketplace booking flow determines which time slots are available for clients to book with practitioners. It combines **practitioner working hours**, **existing bookings**, and **blocked time** to generate available time slots.

---

## How It Works

### 1. **Component Architecture**

The booking flow uses the `CalendarTimeSelector` component, which is used in:
- `BookingFlow.tsx` (authenticated clients)
- `GuestBookingFlow.tsx` (guest bookings)

### 2. **Data Sources**

Availability is calculated from three main sources:

#### a) **Practitioner Working Hours** (`practitioner_availability` table)
- Stored in `working_hours` JSONB field
- Format: `{ "monday": { "enabled": true, "hours": [{ "start": "09:00", "end": "17:00" }] }, ... }`
- Defines when a practitioner is available each day of the week
- Supports multiple time blocks per day (e.g., 9:00-12:00 and 14:00-17:00)

#### b) **Existing Bookings** (`client_sessions` table)
- Fetches all bookings for the selected date with status:
  - `scheduled`
  - `confirmed`
  - `in_progress`
  - `pending_payment`
- Excludes cancelled or completed sessions
- Used to mark time slots as unavailable

#### c) **Blocked Time** (`calendar_events` table)
- Practitioner can manually block specific time periods
- Includes both "blocked" and "unavailable" event types
- Fetched via `getBlocksForDate()` utility function

---

## Real-Time Updates

### ✅ **YES - Real-Time Subscriptions Are Implemented**

The `CalendarTimeSelector` component **does have real-time subscriptions** that listen for changes to:

1. **`calendar_events` table** - When blocked time is added/removed
2. **`client_sessions` table** - When bookings are created/cancelled
3. **`practitioner_availability` table** - When working hours are updated

**Implementation** (lines 108-131 in `CalendarTimeSelector.tsx`):
```typescript
useEffect(() => {
  if (!therapistId || !selectedDate) return;

  const channel = supabase
    .channel(`calendar-selector-${therapistId}-${selectedDateStr}`)
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'calendar_events', 
      filter: `user_id=eq.${therapistId}` 
    }, () => {
      fetchAvailableSlots();  // Refresh slots
      fetchMonthAvailability();  // Refresh calendar view
    })
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'client_sessions', 
      filter: `therapist_id=eq.${therapistId}` 
    }, () => {
      fetchAvailableSlots();
      fetchMonthAvailability();
    })
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'practitioner_availability', 
      filter: `user_id=eq.${therapistId}` 
    }, () => {
      fetchAvailableSlots();
      fetchMonthAvailability();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [therapistId, selectedDate]);
```

### What This Means:

✅ **Real-Time Behavior:**
- If a practitioner changes their availability while a client is viewing the booking flow, the slots **automatically refresh**
- If another client books a slot, it **immediately disappears** from other clients' views
- If a practitioner blocks time, it **instantly updates** in all open booking flows

---

## Slot Generation Process

### Step-by-Step Flow:

1. **User Selects a Date**
   - `CalendarTimeSelector` calls `fetchAvailableSlots()`
   - Fetches practitioner's `working_hours` for that day of the week
   - Checks if the day is `enabled`

2. **Fetch Existing Data**
   - Queries `client_sessions` for bookings on that date
   - Calls `getBlocksForDate()` to get blocked time
   - All data is fetched fresh (not cached)

3. **Generate Time Slots**
   - Uses `generate15MinuteSlots()` utility function
   - Creates 15-minute interval slots within working hours
   - Filters out slots that:
     - Overlap with existing bookings
     - Overlap with blocked time
     - Don't fit the requested session duration
     - Are in the past

4. **Display Available Slots**
   - Shows only slots that are fully available
   - Sorted chronologically
   - Visual indicators for availability status

---

## Conflict Detection

### At Booking Time (Before Payment)

When a client clicks "Book", the system performs **additional validation**:

1. **Re-checks for Conflicts** (`BookingFlow.tsx` lines 371-392):
   ```typescript
   const { data: conflictingBookings } = await supabase
     .from('client_sessions')
     .select('start_time, duration_minutes, status, expires_at')
     .eq('session_date', bookingData.session_date)
     .in('status', ['scheduled', 'confirmed', 'in_progress', 'pending_payment'])
     .or(`therapist_id.eq.${practitioner.user_id},client_id.eq.${practitioner.user_id}`);

   const hasConflict = hasConflictWithBuffer(
     bookingData.start_time,
     bookingData.duration_minutes,
     conflictingBookings ?? [],
     nowIso
   );
   ```

2. **Checks for Blocked Time**:
   ```typescript
   const blocks = await getOverlappingBlocks(
     practitioner.user_id,
     bookingData.session_date,
     bookingData.start_time,
     bookingData.duration_minutes
   );
   ```

3. **Database-Level Validation**:
   - Calls `create_booking_with_validation` RPC function
   - Performs final validation including:
     - Rating tier restrictions (for peer bookings)
     - Availability checks
     - Conflict detection

### Why Double-Check?

Even with real-time updates, there's a small window where:
- Two clients might select the same slot simultaneously
- A practitioner might block time right before booking
- Network delays could cause race conditions

The double-check ensures **no double bookings** occur.

---

## Performance Optimizations

### 1. **Month View Optimization**
- The calendar month view (`fetchMonthAvailability`) only checks if days are enabled
- Doesn't calculate exact slot counts (for performance)
- Shows "available" if the day is enabled, regardless of actual bookings

### 2. **Date-Specific Slot Loading**
- Time slots are only fetched when a date is selected
- Not pre-loaded for all dates (would be too slow)
- Cached in component state while date is selected

### 3. **Expired Slot Cleanup**
- On component mount, calls `release_expired_slot_holds` RPC
- Cleans up any expired slot holds that might block bookings
- Prevents stale data from blocking availability

---

## Limitations & Known Issues

### ⚠️ **Issue 1: Availability Changes with Existing Bookings**

**Problem**: When a practitioner changes their availability, existing bookings outside the new hours are not flagged or warned about.

**Example**:
- Practitioner has a booking on Monday at 9:00 AM
- Changes Monday availability from 9:00-17:00 to 10:00-17:00
- The 9:00 AM booking still exists (not cancelled or flagged)

**Status**: Documented in `AVAILABILITY_CHANGES_UX_TEST.md` but not yet fixed

### ✅ **Issue 2: Real-Time Updates - FIXED**

**Previous Issue**: The old test document (`AVAILABILITY_CHANGES_UX_TEST.md`) stated that real-time subscriptions were missing.

**Current Status**: ✅ **FIXED** - Real-time subscriptions are now implemented in `CalendarTimeSelector.tsx`

---

## User Experience Flow

### For Clients:

1. **Open Booking Flow** → Calendar shows month view with availability indicators
2. **Select Date** → Time slots load (15-minute intervals)
3. **Select Time** → Slot is highlighted
4. **Real-Time Updates** → If slot becomes unavailable, it disappears automatically
5. **Click Book** → Final validation → Payment → Confirmation

### For Practitioners:

1. **Change Availability** → Updates immediately reflected in all open booking flows
2. **Block Time** → Slots disappear instantly for clients
3. **New Booking Created** → Slot becomes unavailable for other clients

---

## Technical Details

### Slot Generation Algorithm

The `generate15MinuteSlots()` function:
- Creates slots at 15-minute intervals (9:00, 9:15, 9:30, etc.)
- Checks each slot against:
  - Working hours boundaries
  - Existing bookings (with buffer time)
  - Blocked time periods
  - Session duration fit
- Returns only fully available slots

### Buffer Time

The system includes buffer time between bookings:
- Prevents back-to-back bookings
- Accounts for session overruns
- Configurable (typically 15-30 minutes)

---

## Summary

✅ **Real-Time**: Yes - Uses Supabase real-time subscriptions  
✅ **Conflict Detection**: Yes - Multiple layers of validation  
✅ **Performance**: Optimized - Lazy loading, date-specific fetching  
⚠️ **Known Issues**: Availability changes don't warn about existing bookings  

The availability system is **robust and real-time**, automatically updating when practitioners change their schedule or when bookings are created/cancelled.
