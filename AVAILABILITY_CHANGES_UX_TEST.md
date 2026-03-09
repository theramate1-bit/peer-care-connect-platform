# Availability Changes UX Test Report

## Test Objective
Test whether practitioner availability changes are properly reflected in:
1. The marketplace booking flow
2. Existing bookings that may conflict with new availability

## Test Date
2025-01-XX

## Test Findings

### ✅ **PASS: New Bookings Validate Against Current Availability**
- **Location**: `BookingValidator.checkPractitionerAvailability()` (booking-validation.ts:156-228)
- **Behavior**: When creating a new booking, the system validates that:
  - The day is enabled in practitioner availability
  - The requested time is within working hours
  - The session duration fits within working hours
- **Result**: ✅ New bookings correctly respect current availability

### ❌ **FAIL: Marketplace Doesn't Update in Real-Time**
- **Location**: `BookingFlow.fetchAvailableTimeSlots()` (BookingFlow.tsx:201-303)
- **Issue**: 
  - Availability is fetched directly from database each time slots are requested
  - **No real-time subscription** to `practitioner_availability` table changes
  - If a practitioner changes availability while a client is viewing the booking flow, the client won't see updated slots until they:
    - Select a different date
    - Close and reopen the booking modal
    - Refresh the page
- **Impact**: 
  - Clients may see stale availability
  - Practitioners may receive booking requests for times they're no longer available
- **Severity**: Medium

### ❌ **FAIL: Existing Bookings Not Validated Against New Availability**
- **Location**: `AvailabilityManager.handleSave()` (AvailabilityManager.tsx:78-120)
- **Issue**:
  - When a practitioner updates availability, the system:
    - ✅ Saves new availability to `practitioner_availability` table
    - ✅ Updates `users.availability` field
    - ❌ **Does NOT check existing bookings** for conflicts
    - ❌ **Does NOT warn practitioner** if existing bookings fall outside new hours
- **Example Scenario**:
  - Practitioner has a booking on Monday at 9:00 AM
  - Practitioner changes Monday availability from 9:00-17:00 to 10:00-17:00
  - The 9:00 AM booking still exists and is not flagged
- **Impact**:
  - Practitioners may have bookings outside their new availability
  - No notification system to alert about conflicts
  - Potential scheduling confusion
- **Severity**: High

### ⚠️ **PARTIAL: Booking Flow Fetches Fresh Data**
- **Location**: `BookingFlow.fetchAvailableTimeSlots()` (BookingFlow.tsx:215-219)
- **Behavior**: 
  - Fetches availability from database each time a date is selected
  - This is good for preventing stale data
  - However, if availability changes while the modal is open, it won't refresh
- **Result**: ⚠️ Works correctly but could be improved with real-time updates

## Detailed Test Scenarios

### Scenario 1: Practitioner Changes Availability While Client Views Booking Flow
**Steps:**
1. Client opens booking flow for Practitioner A
2. Client selects a date (e.g., Monday)
3. Client sees available time slots (e.g., 9:00, 10:00, 11:00)
4. **While booking flow is still open**, Practitioner A changes Monday availability from 9:00-17:00 to 10:00-17:00
5. Client still sees 9:00 as available (stale data)

**Expected**: Client should see updated slots (only 10:00, 11:00, etc.)
**Actual**: Client still sees 9:00 as available
**Status**: ❌ FAIL

### Scenario 2: Practitioner Changes Availability with Existing Bookings
**Steps:**
1. Practitioner has existing booking on Monday at 9:00 AM
2. Practitioner goes to Profile → Availability
3. Practitioner changes Monday availability from 9:00-17:00 to 10:00-17:00
4. Practitioner clicks "Save Changes"

**Expected**: 
- System should warn: "You have 1 existing booking(s) outside your new availability: Monday 9:00 AM"
- Option to keep or reschedule conflicting bookings

**Actual**: 
- No warning shown
- Booking remains unchanged
- No conflict detection

**Status**: ❌ FAIL

### Scenario 3: New Booking After Availability Change
**Steps:**
1. Practitioner changes Monday availability from 9:00-17:00 to 10:00-17:00
2. Client tries to book Monday at 9:00 AM

**Expected**: Booking should be rejected with message: "Requested time is outside working hours (10:00 - 17:00)"
**Actual**: ✅ Booking is correctly rejected
**Status**: ✅ PASS

## Recommendations

### Priority 1: High Severity Issues

#### 1. Add Conflict Detection When Updating Availability
**File**: `peer-care-connect/src/components/practice/AvailabilityManager.tsx`
**Action**: 
- Before saving availability, check existing bookings
- Query `client_sessions` for bookings that fall outside new availability
- Show warning dialog with list of conflicting bookings
- Allow practitioner to:
  - Cancel the availability change
  - Proceed anyway (bookings remain but flagged)
  - Reschedule conflicting bookings

**Code Location**: Add before `handleSave()` line 78

#### 2. Add Real-Time Subscription to Booking Flow
**File**: `peer-care-connect/src/components/marketplace/BookingFlow.tsx`
**Action**:
- Subscribe to `practitioner_availability` table changes
- When availability updates, refresh time slots if date is already selected
- Use `useRealtimeSubscription` hook similar to Profile.tsx

**Code Location**: Add after `fetchAvailableTimeSlots()` definition

### Priority 2: Medium Severity Issues

#### 3. Add Visual Indicator for Stale Availability
**File**: `peer-care-connect/src/components/marketplace/BookingFlow.tsx`
**Action**:
- Add timestamp showing when availability was last fetched
- Add "Refresh" button to manually refresh slots
- Show subtle indicator if data might be stale (>30 seconds old)

### Priority 3: Nice to Have

#### 4. Add Availability Change Notifications
**Action**:
- When practitioner changes availability, notify clients with pending bookings
- Send email/notification: "Your practitioner has updated their availability. Please review your upcoming sessions."

## Code References

### Files Involved:
1. `peer-care-connect/src/components/practice/AvailabilityManager.tsx` - Availability management
2. `peer-care-connect/src/components/marketplace/BookingFlow.tsx` - Booking flow
3. `peer-care-connect/src/lib/booking-validation.ts` - Booking validation
4. `peer-care-connect/src/pages/Profile.tsx` - Profile page (has real-time subscription example)

### Key Functions:
- `AvailabilityManager.handleSave()` - Saves availability (needs conflict detection)
- `BookingFlow.fetchAvailableTimeSlots()` - Fetches slots (needs real-time subscription)
- `BookingValidator.checkPractitionerAvailability()` - Validates new bookings (works correctly)

## Test Environment
- **Browser**: Chrome/Firefox
- **User Roles**: Practitioner, Client
- **Database**: Supabase (practitioner_availability, client_sessions tables)

## Conclusion

**Critical Issues Found**: 2
- ❌ Marketplace doesn't update availability in real-time
- ❌ Existing bookings not validated when availability changes

**Recommendation**: Implement Priority 1 fixes before production release to prevent scheduling conflicts and improve user experience.

