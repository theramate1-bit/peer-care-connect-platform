# Treatment Exchange Booking Validation - Complete Flow

## Overview
This document outlines the complete validation flow for treatment exchange bookings to ensure consistency across frontend, backend, and database layers.

## Booking Flow 1: Accepting Exchange Request (Original Booking)

### Frontend (`ExchangeAcceptanceModal.tsx`)
1. **Initial Check**: Validates date/time selection before accepting
2. **Real-time Updates**: Subscribes to `client_sessions` and `calendar_events` changes
3. **Last Minute Check**: Before calling `acceptExchangeRequest`, checks for existing bookings at exact time slot

### Backend (`treatment-exchange.ts` - `acceptExchangeRequest`)
1. **Request Status Check**: Validates request is still pending
2. **Slot Hold Check**: Verifies slot hold exists or recreates it
3. **Blocked Time Check**: Checks for blocked/unavailable time before recreating slot hold
4. **Existing Bookings Check**: Checks for existing bookings before recreating slot hold (NEW)
5. **Final Conflict Check**: Checks for existing bookings right before calling RPC (NEW)

### Database (`create_accepted_exchange_session` RPC)
1. **Advisory Lock**: Uses `pg_advisory_xact_lock` to prevent concurrent bookings
2. **Conflict Check**: Checks for existing bookings with overlapping times (NEW)
3. **Blocked Time Check**: Checks for blocked/unavailable time (NEW)
4. **Atomic Insert**: Creates both `mutual_exchange_sessions` and `client_sessions` in transaction
5. **Broadcast**: Sends `pg_notify` for availability changes

## Booking Flow 2: Reciprocal Booking (Return Session)

### Frontend (`ExchangeAcceptanceModal.tsx`)
1. **Time Slot Generation**: Fetches available slots based on practitioner availability
2. **Real-time Updates**: Subscribes to `client_sessions` and `calendar_events` changes
3. **Last Minute Check**: Before calling `bookReciprocalExchange`, checks for existing bookings at exact time slot
4. **Blocked Time Check**: Checks for blocked/unavailable time

### Backend (`treatment-exchange.ts` - `bookReciprocalExchange`)
1. **Request Status Check**: Validates request is accepted
2. **Session Status Check**: Validates mutual exchange session exists
3. **Reciprocal Booking Check**: Checks if recipient already booked (with recovery logic)
4. **Credit Balance Check**: Validates sufficient credits
5. **Blocked Time Check**: Checks for blocked/unavailable time
6. **Final Conflict Check**: Checks for existing bookings right before calling RPC (NEW)

### Database (`create_treatment_exchange_booking` RPC)
1. **Advisory Lock**: Uses `pg_advisory_xact_lock` to prevent concurrent bookings
2. **Idempotency Check**: Prevents duplicate requests
3. **Conflict Check**: Checks for existing bookings with overlapping times
4. **Blocked Time Check**: Checks for blocked/unavailable time
5. **Atomic Insert**: Creates `client_sessions` in transaction
6. **Broadcast**: Sends `pg_notify` for availability changes

## Real-time Updates

### Frontend Subscriptions
- **`client_sessions`**: Updates available time slots when bookings change
- **`calendar_events`**: Updates available time slots when blocked time changes
- **`practitioner_availability`**: Updates time slots when working hours change
- **`mutual_exchange_sessions`**: Updates reciprocal booking status

### Backend Notifications
- **`pg_notify('availability_changes', ...)`**: Broadcasts when bookings are created
- Used by frontend to refresh availability in real-time

## Validation Layers

### Layer 1: Frontend (User Experience)
- Prevents user from selecting unavailable times
- Shows real-time updates when slots become unavailable
- Provides immediate feedback

### Layer 2: Backend (Business Logic)
- Validates before calling RPC functions
- Handles edge cases and recovery logic
- Provides detailed error messages

### Layer 3: Database (Data Integrity)
- Advisory locks prevent race conditions
- Conflict checks ensure no double bookings
- Atomic transactions ensure consistency

## Key Improvements Made

1. **Added conflict checking to `create_accepted_exchange_session` RPC**
   - Prevents double bookings at database level
   - Uses advisory locks for concurrency control
   - Checks both existing bookings and blocked time

2. **Added final conflict checks in backend functions**
   - `acceptExchangeRequest`: Checks before calling RPC
   - `bookReciprocalExchange`: Checks before calling RPC
   - Prevents race conditions between frontend check and RPC call

3. **Real-time subscriptions**
   - Modal subscribes to `client_sessions` changes
   - Modal subscribes to `calendar_events` changes
   - Availability updates automatically when bookings change

4. **Consistent error handling**
   - Frontend shows user-friendly messages
   - Backend throws descriptive errors
   - Database returns structured error codes

## Status Check Alignment

### Frontend (`checkReciprocalBooking`)
- Checks `mutual_exchange_sessions` for `practitioner_b_booked` flag
- Verifies actual active sessions exist (not just flag)
- Handles edge cases where flag is true but session is cancelled

### Backend (`bookReciprocalExchange`)
- Checks `practitioner_b_booked` flag
- Verifies actual active sessions exist
- Auto-recovers if flag is true but no active session exists

## Error Messages

### Frontend
- "This time slot was just booked by someone else. Please select another time."
- "The selected time slot is no longer available. Please select another time."

### Backend
- "This time slot has been booked by someone else. The request cannot be accepted."
- "This time slot is now blocked or unavailable. The request cannot be accepted."

### Database
- `CONFLICT_BOOKING: This time slot is already booked. Please select another time.`
- `CONFLICT_BLOCKED: This time slot is blocked or unavailable. Please select another time.`

## Testing Checklist

- [ ] Frontend shows "time not available" → booking should fail
- [ ] Frontend shows available → booking should succeed
- [ ] Real-time updates when someone else books the slot
- [ ] Real-time updates when blocked time is added
- [ ] Race condition: Two users try to book same slot → only one succeeds
- [ ] Reciprocal booking flag recovery works correctly
- [ ] Error messages are consistent across all layers

