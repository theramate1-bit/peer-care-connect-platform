# Mobile Therapist Inclusion - Phase 2 BMAD Plan

**BMAD Method Reference:** [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD)  
**Status:** Planning Phase  
**Date:** 2025-02-20

---

## Overview

This plan covers Phase 2 implementation of mobile therapist inclusion:
1. Marketplace search updates to include mobile therapists based on service radius
2. Marketplace booking buttons (Request Mobile vs Book Clinic)
3. Mobile booking request flow components
4. Backend RPC functions for mobile booking requests

---

## AC5: Marketplace Search - Mobile Therapist Inclusion

### Description
Update marketplace search to include mobile therapists when client location is within their service radius.

### Acceptance Criteria

- [ ] **AC5.1**: Update `find_practitioners_by_distance` RPC function to:
  - Check `therapist_type` field
  - For **clinic-based**: Use existing logic (clinic address)
  - For **mobile**: Check if client location is within `mobile_service_radius_km` of `base_address` (base_latitude, base_longitude)
  - For **hybrid**: Check if client location is within radius of EITHER base OR clinic address (whichever is closer)
  
- [ ] **AC5.2**: Distance calculation:
  - Use Haversine formula or PostGIS `ST_Distance` for accurate calculations
  - Calculate distance from client location to:
    - Clinic-based: `clinic_latitude/clinic_longitude`
    - Mobile: `base_latitude/base_longitude`
    - Hybrid: Minimum of base or clinic distance
  
- [ ] **AC5.3**: Return therapist type in results:
  - Add `therapist_type` to return columns
  - Add `base_address`, `base_latitude`, `base_longitude` to return columns
  - Add `mobile_service_radius_km` to return columns
  - Add `service_radius_used` (indicates which radius was used for hybrid)
  
- [ ] **AC5.4**: Filter logic:
  - Clinic-based: Show if within reasonable distance (existing logic)
  - Mobile: Show if `distance_km <= mobile_service_radius_km`
  - Hybrid: Show if within radius of base OR clinic
  
- [ ] **AC5.5**: Results sorted by distance (closest first)

### Implementation Tasks

1. **Update RPC Function** (`find_practitioners_by_distance`)
   - Add therapist_type filtering logic
   - Add base address location checks
   - Update distance calculations
   - Add new return columns

2. **Update Frontend Service** (`GeoSearchService`)
   - Handle new return fields
   - Display therapist type badges
   - Show service radius information

3. **Update Marketplace Components**
   - Display therapist type on practitioner cards
   - Show service radius for mobile/hybrid therapists
   - Update distance display

### Test Cases

1. **Clinic-Based Therapist:**
   - Search from location near clinic → verify appears
   - Search from location far from clinic → verify doesn't appear
   - Verify distance calculated from clinic address

2. **Mobile Therapist:**
   - Search from location within radius → verify appears
   - Search from location outside radius → verify doesn't appear
   - Verify distance calculated from base address
   - Verify radius displayed on card

3. **Hybrid Therapist:**
   - Search from location near clinic → verify appears
   - Search from location near base → verify appears
   - Search from location outside both → verify doesn't appear
   - Verify minimum distance is used

4. **Edge Cases:**
   - Therapist with null base_address → handle gracefully
   - Therapist with null mobile_service_radius_km → default to 25km
   - Multiple therapists at same distance → verify sorting

---

## AC6: Marketplace Booking Buttons

### Description
Display appropriate booking buttons based on therapist type and service availability.

### Acceptance Criteria

- [ ] **AC6.1**: **Clinic-Based Services:**
  - Show "Book Clinic Session" button
  - Uses existing booking flow
  - Button links to clinic booking modal

- [ ] **AC6.2**: **Mobile Services (within radius):**
  - Show "Request Mobile Session" button
  - Only visible if client location is within therapist's service radius
  - Button opens mobile booking request flow

- [ ] **AC6.3**: **Hybrid Therapists:**
  - Show both buttons if they have both service types
  - "Book Clinic Session" for clinic services
  - "Request Mobile Session" for mobile services (if within radius)
  - Buttons clearly labeled

- [ ] **AC6.4**: **Out of Service Area:**
  - Show "Out of Service Area" message instead of button
  - Display therapist's service radius
  - Option to "Get Notified" when therapist expands radius

- [ ] **AC6.5**: **Service Type Detection:**
  - Check `practitioner_products.service_type` to determine available services
  - Filter services by type (clinic/mobile/both)
  - Show appropriate buttons based on available services

- [ ] **AC6.6**: **Visual Indicators:**
  - Therapist type badge (Clinic-Based, Mobile, Hybrid)
  - Service radius displayed for mobile/hybrid
  - Clear distinction between booking types

### Implementation Tasks

1. **Update Practitioner Card Component**
   - Add therapist type badge
   - Add service radius display
   - Conditional button rendering
   - Out-of-area messaging

2. **Create Button Logic**
   - Detect available service types
   - Check client location vs service radius
   - Route to appropriate booking flow

3. **Update Marketplace Components**
   - `Marketplace.tsx` - Main marketplace view
   - `TherapistCard.tsx` - Individual practitioner cards
   - `BookingFlow.tsx` - Existing clinic booking
   - New: `MobileBookingRequestFlow.tsx` - Mobile request flow

### Test Cases

1. **Clinic-Based Therapist:**
   - Verify "Book Clinic Session" button shown
   - Click button → verify clinic booking flow opens
   - Verify no mobile button shown

2. **Mobile Therapist (within radius):**
   - Verify "Request Mobile Session" button shown
   - Verify service radius displayed
   - Click button → verify mobile request flow opens

3. **Mobile Therapist (outside radius):**
   - Verify "Out of Service Area" message
   - Verify radius information displayed
   - Verify no booking button shown

4. **Hybrid Therapist:**
   - Verify both buttons shown (if both service types available)
   - Verify correct button for each service type
   - Test both booking flows work

5. **Service Filtering:**
   - Therapist with only clinic services → only clinic button
   - Therapist with only mobile services → only mobile button (if in radius)
   - Therapist with both → both buttons

---

## AC7: Mobile Booking Request - Client Flow

### Description
Clients can request mobile sessions with payment hold until practitioner accepts.

### Acceptance Criteria

- [ ] **AC7.1**: **Request Form Components:**
  - Service selection (mobile services only)
  - Date picker (future dates only)
  - Time picker (available time slots)
  - Client address input (with geocoding)
  - Price confirmation display
  - Optional notes field
  - Terms acceptance checkbox

- [ ] **AC7.2**: **Validation:**
  - Client location must be within therapist's service radius
  - Date must be in the future
  - Time must be within therapist's availability
  - All required fields must be filled
  - Address must be geocoded successfully

- [ ] **AC7.3**: **Payment Intent Creation:**
  - Create Stripe Payment Intent with `capture_method: 'manual'`
  - Amount = service price
  - Store `stripe_payment_intent_id` in request record
  - Payment status = 'pending' (will be 'held' on accept)

- [ ] **AC7.4**: **Request Record Creation:**
  - Create record in `mobile_booking_requests` table
  - Fields: client_id, practitioner_id, product_id, service_type, requested_date, requested_start_time, client_address, client_latitude, client_longitude, total_price_pence, payment_status, status
  - Status = 'pending'
  - Payment status = 'pending'

- [ ] **AC7.5**: **Notifications:**
  - Client receives confirmation: "Request sent! Practitioner will review and respond."
  - Practitioner receives notification: "New mobile booking request from [Client Name]"

- [ ] **AC7.6**: **Error Handling:**
  - Address outside radius → clear error message
  - Payment failure → retry option
  - Network errors → graceful handling

### Implementation Tasks

1. **Create MobileBookingRequestFlow Component**
   - Form with all required fields
   - Location validation
   - Payment intent creation
   - Request submission

2. **Create RPC Function: `create_mobile_booking_request`**
   - Validate location within radius
   - Create payment intent
   - Create request record
   - Send notifications

3. **Update Stripe Service**
   - Add manual capture payment intent creation
   - Handle payment intent storage

4. **Create Notification System**
   - Client confirmation
   - Practitioner notification

### Test Cases

1. **Valid Request:**
   - Fill form with valid data
   - Submit → verify payment intent created
   - Verify request record created
   - Verify notifications sent

2. **Invalid Location:**
   - Enter address outside radius
   - Submit → verify validation error
   - Verify no payment intent created

3. **Payment Failure:**
   - Simulate payment failure
   - Verify error message
   - Verify retry option

4. **Network Errors:**
   - Simulate network failure
   - Verify graceful error handling
   - Verify data not lost

---

## AC8: Mobile Booking Request - Practitioner Management

### Description
Practitioners can view, accept, or decline mobile booking requests.

### Acceptance Criteria

- [ ] **AC8.1**: **Request List View:**
  - Show all pending requests
  - Display: client name, service, date/time, client address, distance from base, price
  - Sort by requested date (soonest first)
  - Filter by status (pending, accepted, declined)

- [ ] **AC8.2**: **Request Details:**
  - Full client information
  - Service details and price
  - Requested date/time
  - Client address with map preview
  - Distance from practitioner's base address
  - Client notes (if provided)
  - Request status and payment status

- [ ] **AC8.3**: **Accept Request:**
  - "Accept" button on pending requests
  - On accept:
    - Capture Stripe Payment Intent
    - Create `client_sessions` record
    - Update request status to 'accepted'
    - Update payment status to 'captured'
    - Auto-populate practitioner's diary
    - Send confirmation to client
  - Session appears in practitioner's calendar

- [ ] **AC8.4**: **Decline Request:**
  - "Decline" button opens decline form
  - Decline form requires:
    - Reason (required, dropdown or text)
    - OR alternate date/time suggestions (optional)
  - On decline:
    - Release payment hold
    - Update request status to 'declined'
    - Update payment status to 'released'
    - Store decline reason and suggestions
    - Send notification to client

- [ ] **AC8.5**: **Alternate Suggestions:**
  - Practitioner can suggest alternate dates/times
  - Multiple suggestions allowed
  - Stored in `alternate_suggestions` JSONB field
  - Client can accept or request different time

- [ ] **AC8.6**: **Request Expiration:**
  - Requests expire after 48 hours if not responded to
  - Auto-cancel expired requests
  - Release payment hold on expiration
  - Notify client of expiration

### Implementation Tasks

1. **Create MobileRequestManagement Component**
   - Request list view
   - Request details modal
   - Accept/decline actions
   - Decline form with suggestions

2. **Create RPC Functions:**
   - `accept_mobile_booking_request(request_id)`
   - `decline_mobile_booking_request(request_id, reason, alternate_suggestions)`
   - `get_practitioner_mobile_requests(practitioner_id)`

3. **Update Stripe Service**
   - Payment intent capture
   - Payment hold release

4. **Create Session Creation Logic**
   - Auto-create client_sessions on accept
   - Populate diary/calendar

5. **Create Expiration Job**
   - Background job to check expired requests
   - Auto-cancel and release payments

### Test Cases

1. **Accept Request:**
   - Practitioner views pending request
   - Clicks "Accept"
   - Verify payment captured
   - Verify session created
   - Verify diary populated
   - Verify client notified

2. **Decline with Reason:**
   - Practitioner clicks "Decline"
   - Enters reason
   - Submits
   - Verify payment released
   - Verify status updated
   - Verify client notified with reason

3. **Decline with Suggestions:**
   - Practitioner declines with alternate suggestions
   - Verify suggestions stored
   - Verify client can accept suggestions

4. **Request Expiration:**
   - Create request
   - Wait 48 hours (or simulate)
   - Verify auto-cancellation
   - Verify payment released

---

## AC9: Mobile Booking Request - Client Status View

### Description
Clients can view request status and respond to declined requests.

### Acceptance Criteria

- [ ] **AC9.1**: **Request Status Display:**
  - Show all client's mobile booking requests
  - Display: practitioner name, service, date/time, status, payment status
  - Sort by date (most recent first)
  - Filter by status

- [ ] **AC9.2**: **Status Types:**
  - **Pending**: "Awaiting practitioner response"
  - **Accepted**: "Request accepted! Session confirmed."
  - **Declined**: Show reason and suggestions (if any)
  - **Expired**: "Request expired - payment released"
  - **Cancelled**: "Request cancelled"

- [ ] **AC9.3**: **Accepted Request:**
  - Show session details
  - Link to session management
  - Payment status: "Payment captured"
  - Session appears in client's bookings

- [ ] **AC9.4**: **Declined Request:**
  - Display decline reason
  - Display alternate suggestions (if provided)
  - Actions:
    - "Accept Suggested Time" → creates new request with suggested date/time
    - "Request Different Time" → opens new request form
    - "Cancel Request" → cancels request

- [ ] **AC9.5**: **New Request from Suggestion:**
  - Client accepts alternate suggestion
  - Creates new request with suggested date/time
  - Pre-fills form with suggestion data
  - Follows same flow as original request

- [ ] **AC9.6**: **Payment Status:**
  - Pending: "Payment held - will be charged on acceptance"
  - Held: "Payment held - awaiting acceptance"
  - Captured: "Payment captured - session confirmed"
  - Released: "Payment released - not charged"
  - Refunded: "Payment refunded"

### Implementation Tasks

1. **Create MobileRequestStatus Component**
   - Request list view
   - Status display
   - Action buttons
   - Decline response handling

2. **Create RPC Functions:**
   - `get_client_mobile_requests(client_id)`
   - `accept_alternate_suggestion(request_id, suggestion_index)`
   - `cancel_mobile_request(request_id)`

3. **Update Request Flow**
   - Pre-fill form from suggestions
   - Handle suggestion acceptance

### Test Cases

1. **View Pending Request:**
   - Client views pending request
   - Verify status displayed correctly
   - Verify payment status shown

2. **Accept Alternate Suggestion:**
   - Client views declined request with suggestions
   - Clicks "Accept Suggested Time"
   - Verify new request created with suggested time
   - Verify original request remains visible

3. **Request Different Time:**
   - Client views declined request
   - Clicks "Request Different Time"
   - Verify new request form opens
   - Verify can enter different date/time

---

## AC10: Database Schema & RPC Functions

### Description
Verify database schema and create RPC functions for mobile booking requests.

### Acceptance Criteria

- [x] **AC10.1**: **Verify `mobile_booking_requests` Table:**
  - ✅ Table exists with all required fields
  - ✅ Includes: `id`, `client_id`, `practitioner_id`, `product_id`, `service_type`, `requested_date`, `requested_start_time`, `duration_minutes`
  - ✅ Includes: `client_address`, `client_latitude`, `client_longitude`
  - ✅ Includes: `total_price_pence`, `platform_fee_pence`, `practitioner_earnings_pence`
  - ✅ Includes: `stripe_payment_intent_id`, `payment_status`, `status`
  - ✅ Includes: `decline_reason`, `alternate_date`, `alternate_start_time`, `alternate_suggestions`
  - ✅ Includes: `client_notes`, `practitioner_notes`, `expires_at`, `accepted_at`, `declined_at`
  - ✅ RLS policies enabled
  - ✅ Indexes created for performance

- [ ] **AC10.2**: **Create Indexes:**
  - Index on `practitioner_id` for practitioner queries
  - Index on `client_id` for client queries
  - Index on `status` for filtering
  - Index on `expires_at` for expiration job
  - Composite index on `(practitioner_id, status)`

- [ ] **AC10.3**: **Create/Verify RPC Functions:**
  - ✅ `create_session_from_mobile_request` - Already exists (verify functionality)
  - [ ] `create_mobile_booking_request(...)` - Create request with validation and location check
  - [ ] `accept_mobile_booking_request(request_id)` - Accept and capture payment
  - [ ] `decline_mobile_booking_request(request_id, reason, suggestions)` - Decline and release payment
  - [ ] `get_practitioner_mobile_requests(practitioner_id, status)` - Get practitioner's requests
  - [ ] `get_client_mobile_requests(client_id, status)` - Get client's requests
  - [ ] `cancel_mobile_request(request_id)` - Cancel request
  - [ ] `expire_mobile_requests()` - Background job to expire old requests

- [ ] **AC10.4**: **RLS Policies:**
  - Practitioners can view their own requests
  - Clients can view their own requests
  - Practitioners can update status of their requests
  - Clients can cancel their own pending requests

- [ ] **AC10.5**: **Triggers:**
  - Auto-set `expires_at` on insert (48 hours)
  - Auto-update `updated_at` on update

### Implementation Tasks

1. **Verify Database Schema** ✅
   - ✅ Table structure verified
   - ✅ Indexes exist
   - ✅ RLS policies enabled
   - ✅ Triggers exist (expires_at auto-set)

2. **Create/Update RPC Functions**
   - Verify `create_session_from_mobile_request` functionality
   - Create `create_mobile_booking_request` with location validation
   - Create `accept_mobile_booking_request` with payment capture
   - Create `decline_mobile_booking_request` with payment release
   - Create `get_practitioner_mobile_requests` for practitioner dashboard
   - Create `get_client_mobile_requests` for client view
   - Create `cancel_mobile_request` for client cancellation
   - Create `expire_mobile_requests` for background job
   - Proper error handling
   - Transaction management

3. **Test Database Schema**
   - ✅ Table structure verified
   - ✅ Indexes verified
   - ✅ RLS policies verified
   - Test RPC functions

### Test Cases

1. **Table Creation:**
   - Run migration
   - Verify table exists
   - Verify all columns present
   - Verify constraints work

2. **RPC Functions:**
   - Test each function
   - Verify error handling
   - Verify transaction rollback on errors

3. **RLS Policies:**
   - Test practitioner access
   - Test client access
   - Test unauthorized access blocked

---

## Implementation Order

### Phase 2.1: Database & Backend (AC10)
1. Create `mobile_booking_requests` table
2. Create RPC functions
3. Test database schema

### Phase 2.2: Marketplace Search (AC5)
1. Update `find_practitioners_by_distance` RPC
2. Update `GeoSearchService`
3. Update marketplace components
4. Test search functionality

### Phase 2.3: Booking Buttons (AC6)
1. Update practitioner cards
2. Create button logic
3. Test button display

### Phase 2.4: Mobile Request Flow (AC7)
1. Create `MobileBookingRequestFlow` component
2. Integrate with RPC functions
3. Test request creation

### Phase 2.5: Practitioner Management (AC8)
1. Create `MobileRequestManagement` component
2. Implement accept/decline logic
3. Test practitioner workflow

### Phase 2.6: Client Status View (AC9)
1. Create `MobileRequestStatus` component
2. Implement suggestion acceptance
3. Test client workflow

---

## Testing Strategy

### Unit Tests
- RPC function logic
- Distance calculations
- Payment intent creation
- Request status transitions

### Integration Tests
- End-to-end request flow
- Payment hold/capture
- Notification delivery
- Session creation

### Manual Testing
- Complete workflows for each therapist type
- Edge cases (expired requests, payment failures)
- UI/UX validation

---

## Success Criteria

✅ **Phase 2 is complete when:**
1. All acceptance criteria (AC5-AC10) pass
2. Mobile therapists appear in search results when client is within radius
3. Appropriate booking buttons displayed
4. Clients can create mobile booking requests
5. Practitioners can accept/decline requests
6. Payment hold/capture works correctly
7. All notifications sent
8. No critical bugs
9. Performance is acceptable

---

## Notes

- Follow BMAD Method principles throughout
- Reference: [BMAD-METHOD Documentation](https://github.com/bmad-code-org/BMAD-METHOD)
- Test incrementally after each phase
- Document any deviations from acceptance criteria
- Consider mobile responsiveness for all components
