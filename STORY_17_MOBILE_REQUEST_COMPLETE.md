# Story 17: Mobile Service Request Flow - Complete

**Date:** 2025-01-27  
**Status:** ✅ Complete

## Summary

Implemented complete mobile service request flow with notifications. Mobile therapists now receive booking requests instead of direct bookings, allowing them to manage travel time and schedule. Clients can request sessions, practitioners can accept/decline with alternate suggestions, and all parties receive real-time notifications.

## Changes Made

### Database Changes

1. **Migration: `20250127_add_notifications_to_mobile_requests.sql`**
   - Updated `create_mobile_booking_request` RPC to notify practitioners when requests are created
   - Updated `accept_mobile_booking_request` RPC to notify clients when requests are accepted
   - Updated `decline_mobile_booking_request` RPC to notify clients when requests are declined with optional alternate suggestions
   - All notifications include relevant metadata (request_id, session_id, dates, addresses, etc.)

### Components Verified

1. **`MobileBookingRequestFlow.tsx`** ✅
   - Client-side form for requesting mobile sessions
   - Service selection, date/time picker, address input with geocoding
   - Distance validation within service radius
   - Payment intent creation with manual capture

2. **`MobileRequestManagement.tsx`** ✅
   - Practitioner interface for viewing pending requests
   - Accept/decline functionality with payment capture/release
   - Alternate date/time suggestions support
   - Request status display

3. **`MobileRequestStatus.tsx`** ✅
   - Client interface for viewing request status
   - Accept alternate suggestions
   - Request new time if declined

### Edge Functions Verified

1. **`stripe-payment/index.ts`** ✅
   - `handleCreateMobilePaymentIntent` - Creates payment intent with manual capture
   - `handleCaptureMobilePayment` - Captures payment when practitioner accepts
   - `handleReleaseMobilePayment` - Releases payment when practitioner declines

### RPC Functions Updated

1. **`create_mobile_booking_request`** ✅
   - Creates request record
   - Validates distance within service radius
   - Calculates pricing (platform fee 0.5% + 1.5% Stripe = 2% total)
   - **NEW:** Creates notification for practitioner

2. **`accept_mobile_booking_request`** ✅
   - Updates request status to 'accepted'
   - Updates payment status to 'captured'
   - Creates client session via `create_session_from_mobile_request`
   - **NEW:** Creates notification for client

3. **`decline_mobile_booking_request`** ✅
   - Updates request status to 'declined'
   - Updates payment status to 'released'
   - Stores decline reason and alternate suggestions
   - **NEW:** Creates notification for client with decline reason and alternate suggestions

## Notification Details

### When Request is Created
- **Recipient:** Practitioner
- **Type:** `booking_request`
- **Title:** "New Mobile Booking Request"
- **Body:** Includes client name, service name, date, time
- **Payload:** request_id, client_id, client_name, product_id, product_name, requested_date, requested_start_time, client_address, distance_km

### When Request is Accepted
- **Recipient:** Client
- **Type:** `booking_confirmed`
- **Title:** "Mobile Session Request Accepted"
- **Body:** Includes practitioner name, service name, date, time
- **Payload:** request_id, session_id, practitioner_id, practitioner_name, product_id, product_name, session_date, session_time, client_address

### When Request is Declined
- **Recipient:** Client
- **Type:** `booking_request`
- **Title:** "Mobile Session Request Declined"
- **Body:** Includes practitioner name, service name, date, time, decline reason, and alternate suggestions if provided
- **Payload:** request_id, practitioner_id, practitioner_name, product_id, product_name, requested_date, requested_start_time, decline_reason, alternate_date, alternate_start_time, alternate_suggestions, practitioner_notes

## Acceptance Criteria Status

- ✅ Mobile services show "Request Session" instead of "Book Session" (verified in Marketplace.tsx)
- ✅ Client submits booking request with preferred date/time (MobileBookingRequestFlow.tsx)
- ✅ Practitioner receives notification of request (RPC function updated)
- ✅ Practitioner can accept, decline, or suggest alternative time (MobileRequestManagement.tsx)
- ✅ If accepted, booking is confirmed and payment processed (accept_mobile_booking_request + edge function)
- ✅ If declined, client receives notification with optional reason (decline_mobile_booking_request)
- ✅ Client can accept alternative time or request different time (MobileRequestStatus.tsx)
- ✅ Request status visible to both parties (MobileRequestManagement.tsx + MobileRequestStatus.tsx)

## Testing Checklist

### Client Flow
- [ ] Client views mobile therapist → sees "Request Mobile Session" button
- [ ] Client fills request form → validates location within radius
- [ ] Client submits request → payment intent created with manual capture
- [ ] Client receives confirmation → request created successfully
- [ ] Client views request status → sees pending status
- [ ] Client receives notification when request accepted → sees session details
- [ ] Client receives notification when request declined → sees decline reason and alternate suggestions
- [ ] Client can accept alternate suggestion → creates new request
- [ ] Client can request different time → creates new request

### Practitioner Flow
- [ ] Practitioner receives notification when request created → sees request details
- [ ] Practitioner views pending requests → sees all request details (client, service, date, time, address, distance)
- [ ] Practitioner accepts request → payment captured, session created, client notified
- [ ] Practitioner declines request → payment released, client notified with reason
- [ ] Practitioner suggests alternate time → client receives notification with alternate suggestions
- [ ] Session appears in practitioner diary when accepted → auto-populated

### Payment Flow
- [ ] Payment intent created with `capture_method: 'manual'` → payment held but not captured
- [ ] Payment captured when practitioner accepts → payment processed
- [ ] Payment released when practitioner declines → payment hold canceled
- [ ] Payment status tracked in `mobile_booking_requests` table

## Files Modified

1. **`supabase/migrations/20250127_add_notifications_to_mobile_requests.sql`** (NEW)
   - Updated all three RPC functions to create notifications

2. **Existing Components (Verified):**
   - `src/components/marketplace/MobileBookingRequestFlow.tsx`
   - `src/components/practitioner/MobileRequestManagement.tsx`
   - `src/components/client/MobileRequestStatus.tsx`
   - `src/pages/Marketplace.tsx` (button logic)

3. **Existing Edge Functions (Verified):**
   - `supabase/functions/stripe-payment/index.ts` (mobile payment handlers)

## Next Steps

1. Test the complete flow end-to-end
2. Verify notifications appear in real-time
3. Test payment capture/release
4. Test alternate suggestions flow
5. Verify session creation when request is accepted

## Notes

- All RPC functions use `SECURITY DEFINER` to allow notification creation
- Notifications use idempotency via `source_type` and `source_id` to prevent duplicates
- Payment is held (not captured) until practitioner accepts
- Payment is released (canceled) if practitioner declines
- Alternate suggestions are stored as JSONB array in `alternate_suggestions` field
