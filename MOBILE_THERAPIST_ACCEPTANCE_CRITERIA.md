# Mobile Therapist Inclusion - Acceptance Criteria

## Feature: Mobile Therapist Inclusion
**Status:** In Progress  
**BMAD Method Reference:** [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD)

---

## AC1: Onboarding - Therapist Type Selection

### Description
Practitioners must be able to select their practice type during onboarding.

### Acceptance Criteria
- [ ] **AC1.1**: Initial onboarding step displays three large, clearly labeled buttons:
  - "Clinic Based Therapist"
  - "Mobile Therapist" 
  - "Hybrid Therapist"
- [ ] **AC1.2**: Selection is required before proceeding to next step
- [ ] **AC1.3**: Selected type is stored in `users.therapist_type` field
- [ ] **AC1.4**: Selection persists if user navigates back/forward
- [ ] **AC1.5**: Visual feedback (highlight/border) shows selected option

### Test Cases
1. Navigate to onboarding as practitioner
2. Verify three buttons are displayed
3. Select each option and verify it's highlighted
4. Attempt to proceed without selection → should show validation error
5. Select option, proceed, go back → selection should persist

---

## AC2: Onboarding - Location Collection

### Description
Location collection differs based on selected therapist type.

### Acceptance Criteria
- [ ] **AC2.1**: **Clinic-based**: Collects clinic address (shown on marketplace)
- [ ] **AC2.2**: **Mobile**: Collects base address (NOT shown on marketplace, used for radius calculation)
- [ ] **AC2.3**: **Hybrid**: Collects both clinic address AND base address
- [ ] **AC2.4**: Address fields include geocoding (latitude/longitude)
- [ ] **AC2.5**: Clear messaging explains which address is public vs private
- [ ] **AC2.6**: All required addresses are validated before proceeding

### Test Cases
1. **Clinic-based flow**: Select clinic-based → verify only clinic address field shown
2. **Mobile flow**: Select mobile → verify only base address field shown with "not shown on marketplace" message
3. **Hybrid flow**: Select hybrid → verify both address fields shown
4. Attempt to proceed without address → should show validation error
5. Verify latitude/longitude are saved with addresses

---

## AC3: Onboarding - Service Radius Selection

### Description
Mobile and hybrid therapists set their service radius.

### Acceptance Criteria
- [ ] **AC3.1**: Radius step only appears for mobile and hybrid therapists
- [ ] **AC3.2**: Clinic-based therapists skip this step
- [ ] **AC3.3**: Slider allows selection from 5km to 100km (default: 25km)
- [ ] **AC3.4**: Current value is displayed in real-time
- [ ] **AC3.5**: Value is saved to `users.mobile_service_radius_km`
- [ ] **AC3.6**: Clear explanation of what radius means

### Test Cases
1. **Mobile therapist**: Verify radius step appears after location step
2. **Hybrid therapist**: Verify radius step appears after location step
3. **Clinic-based**: Verify radius step is skipped
4. Adjust slider → verify value updates in real-time
5. Proceed → verify value is saved to database

---

## AC4: Profile Setup - Service Management

### Description
Hybrid therapists manage mobile and clinic services separately.

### Acceptance Criteria
- [ ] **AC4.1**: **Mobile therapists**: All services default to `service_type = 'mobile'`
- [ ] **AC4.2**: **Clinic-based therapists**: All services default to `service_type = 'clinic'`
- [ ] **AC4.3**: **Hybrid therapists**: Tabbed interface with:
  - "Mobile Services" tab
  - "Clinic-Based Services" tab
  - "All Services" tab
- [ ] **AC4.4**: When creating service in Mobile tab → `service_type = 'mobile'`
- [ ] **AC4.5**: When creating service in Clinic tab → `service_type = 'clinic'`
- [ ] **AC4.6**: Services can be set to `service_type = 'both'` (available in both ways)
- [ ] **AC4.7**: Services are filtered correctly by tab
- [ ] **AC4.8**: Service type selector visible in form for mobile/hybrid therapists

### Test Cases
1. **Mobile therapist**: Create service → verify service_type is 'mobile'
2. **Clinic-based therapist**: Create service → verify service_type is 'clinic'
3. **Hybrid therapist**: 
   - Verify tabs are displayed
   - Create service in Mobile tab → verify service_type is 'mobile'
   - Create service in Clinic tab → verify service_type is 'clinic'
   - Switch tabs → verify correct services are shown
4. Edit existing service → verify service_type can be changed
5. Verify service_type is saved to `practitioner_products.service_type`

---

## AC5: Marketplace - Search by Location

### Description
Marketplace search includes mobile therapists based on service radius.

### Acceptance Criteria
- [ ] **AC5.1**: All therapist types (clinic, mobile, hybrid) appear in search results
- [ ] **AC5.2**: **Clinic-based**: Shown if client location is within reasonable distance of clinic
- [ ] **AC5.3**: **Mobile/Hybrid**: Shown if client location is within `mobile_service_radius_km` of:
  - Mobile: `base_address` (base_latitude, base_longitude)
  - Hybrid: `base_address` OR `clinic_address` (whichever is closer)
- [ ] **AC5.4**: Distance calculation uses Haversine formula or equivalent
- [ ] **AC5.5**: Results are sorted by distance (closest first)
- [ ] **AC5.6**: Therapist type badge displayed on practitioner cards

### Test Cases
1. Search from location within mobile therapist's radius → verify they appear
2. Search from location outside radius → verify they don't appear
3. Search from location near hybrid therapist's clinic → verify they appear
4. Search from location near hybrid therapist's base → verify they appear
5. Verify distance calculation is accurate
6. Verify results are sorted by distance

---

## AC6: Marketplace - Booking Buttons

### Description
Appropriate booking buttons shown based on therapist type and service availability.

### Acceptance Criteria
- [ ] **AC6.1**: **Clinic-based services**: Show "Book Clinic Session" button (existing flow)
- [ ] **AC6.2**: **Mobile services** (within radius): Show "Request Mobile Session" button
- [ ] **AC6.3**: **Hybrid therapists**: Show both options if they have both service types
- [ ] **AC6.4**: Mobile services outside radius: Show "Out of Service Area" message
- [ ] **AC6.5**: Button text clearly indicates session type
- [ ] **AC6.6**: Service radius displayed on mobile therapist cards

### Test Cases
1. View clinic-based therapist → verify "Book Clinic Session" button
2. View mobile therapist (within radius) → verify "Request Mobile Session" button
3. View mobile therapist (outside radius) → verify "Out of Service Area" message
4. View hybrid therapist → verify both buttons if applicable
5. Verify radius is displayed on mobile/hybrid therapist cards

---

## AC7: Mobile Booking Request - Client Flow

### Description
Clients can request mobile sessions with payment hold.

### Acceptance Criteria
- [ ] **AC7.1**: "Request Mobile Session" opens mobile booking request form
- [ ] **AC7.2**: Form includes:
  - Service selection (mobile services only)
  - Date selection
  - Time selection
  - Client address input (with geocoding)
  - Price confirmation display
  - Optional notes field
- [ ] **AC7.3**: Validates client location is within therapist's service radius
- [ ] **AC7.4**: Creates Stripe Payment Intent with `capture_method: 'manual'`
- [ ] **AC7.5**: Creates record in `mobile_booking_requests` table with status 'pending'
- [ ] **AC7.6**: Payment status set to 'pending' (will be 'held' on accept)
- [ ] **AC7.7**: Client receives confirmation that request was sent
- [ ] **AC7.8**: Practitioner receives notification of new request

### Test Cases
1. Click "Request Mobile Session" → verify form opens
2. Fill form with valid data → verify request is created
3. Fill form with address outside radius → verify validation error
4. Submit request → verify Payment Intent created (manual capture)
5. Verify `mobile_booking_requests` record created with correct data
6. Verify client sees confirmation message
7. Verify practitioner receives notification

---

## AC8: Mobile Booking Request - Practitioner Acceptance

### Description
Practitioners can accept mobile booking requests.

### Acceptance Criteria
- [ ] **AC8.1**: Practitioner sees pending requests in request management interface
- [ ] **AC8.2**: Request details include:
  - Client name and contact info
  - Service name and price
  - Requested date/time
  - Client address and distance from base
- [ ] **AC8.3**: "Accept" button:
  - Captures Stripe Payment Intent
  - Creates `client_sessions` record
  - Updates request status to 'accepted'
  - Updates payment status to 'captured'
  - Sends confirmation to client
- [ ] **AC8.4**: Session is auto-populated in practitioner's diary
- [ ] **AC8.5**: Client receives acceptance notification

### Test Cases
1. Practitioner views pending requests → verify all details displayed
2. Click "Accept" → verify payment is captured
3. Verify `client_sessions` record created
4. Verify request status updated to 'accepted'
5. Verify session appears in practitioner diary
6. Verify client receives acceptance notification

---

## AC9: Mobile Booking Request - Practitioner Decline

### Description
Practitioners can decline requests with reason or alternate suggestions.

### Acceptance Criteria
- [ ] **AC9.1**: "Decline" button opens decline form
- [ ] **AC9.2**: Decline form requires:
  - Reason (required)
  - OR alternate date/time suggestions (optional)
- [ ] **AC9.3**: On decline:
  - Releases payment hold
  - Updates request status to 'declined'
  - Updates payment status to 'released'
  - Stores decline reason and suggestions
  - Sends notification to client
- [ ] **AC9.4**: Client can view decline reason and suggestions
- [ ] **AC9.5**: Client can accept alternate suggestion or request new date/time

### Test Cases
1. Practitioner clicks "Decline" → verify form opens
2. Submit decline with reason only → verify payment released, status updated
3. Submit decline with alternate suggestions → verify suggestions stored
4. Verify client receives decline notification
5. Client views decline → verify reason and suggestions displayed
6. Client accepts alternate → verify new request created with suggested date/time

---

## AC10: Mobile Booking Request - Client Response to Decline

### Description
Clients can respond to declined requests.

### Acceptance Criteria
- [ ] **AC10.1**: Client sees declined request with:
  - Decline reason
  - Alternate suggestions (if provided)
- [ ] **AC10.2**: Client can:
  - Accept alternate date/time → creates new request with suggested date/time
  - Request different date/time → creates new request (process repeats)
  - Cancel request
- [ ] **AC10.3**: New request follows same flow (payment hold, practitioner review)
- [ ] **AC10.4**: Original declined request remains visible for reference

### Test Cases
1. Client views declined request → verify reason and suggestions shown
2. Client accepts alternate → verify new request created with suggested date/time
3. Client requests different date/time → verify new request created
4. Verify new request follows same flow as original
5. Verify original request remains visible

---

## AC11: Data Integrity

### Description
All data is correctly stored and relationships maintained.

### Acceptance Criteria
- [ ] **AC11.1**: `users.therapist_type` is correctly set during onboarding
- [ ] **AC11.2**: Location data (clinic/base addresses, lat/lng) is correctly stored
- [ ] **AC11.3**: `mobile_service_radius_km` is set for mobile/hybrid therapists
- [ ] **AC11.4**: `practitioner_products.service_type` is correctly set
- [ ] **AC11.5**: `mobile_booking_requests` records have all required fields
- [ ] **AC11.6**: Foreign key relationships are maintained
- [ ] **AC11.7**: Existing practitioners default to `therapist_type = 'clinic_based'`
- [ ] **AC11.8**: Existing services default to `service_type = 'clinic'`

### Test Cases
1. Complete onboarding → verify all fields saved correctly
2. Create service → verify service_type saved
3. Create mobile request → verify all fields in mobile_booking_requests
4. Verify foreign keys are valid
5. Check existing data → verify defaults applied correctly

---

## AC12: Error Handling

### Description
System handles errors gracefully.

### Acceptance Criteria
- [ ] **AC12.1**: Validation errors show clear messages
- [ ] **AC12.2**: Network errors are handled gracefully
- [ ] **AC12.3**: Payment failures are handled and user notified
- [ ] **AC12.4**: Invalid locations show appropriate errors
- [ ] **AC12.5**: Out-of-radius requests are rejected with clear message
- [ ] **AC12.6**: Expired requests are handled (auto-cancel after X days)

### Test Cases
1. Submit invalid form data → verify clear error messages
2. Simulate network failure → verify graceful error handling
3. Submit payment with invalid card → verify error message
4. Request outside radius → verify clear rejection message
5. Let request expire → verify auto-cancellation

---

## Testing Checklist

### Phase 1: Onboarding (AC1-AC3)
- [ ] Test therapist type selection
- [ ] Test location collection for each type
- [ ] Test radius selection for mobile/hybrid
- [ ] Verify data persistence

### Phase 2: Profile Setup (AC4)
- [ ] Test service creation for each therapist type
- [ ] Test hybrid therapist tabs
- [ ] Verify service_type is set correctly

### Phase 3: Marketplace (AC5-AC6)
- [ ] Test location-based search
- [ ] Test radius calculations
- [ ] Test booking button display
- [ ] Verify therapist type badges

### Phase 4: Mobile Booking (AC7-AC10)
- [ ] Test request creation
- [ ] Test payment hold
- [ ] Test practitioner acceptance
- [ ] Test practitioner decline
- [ ] Test client response to decline

### Phase 5: Data & Error Handling (AC11-AC12)
- [ ] Verify data integrity
- [ ] Test error scenarios
- [ ] Verify existing data defaults

---

## Success Criteria

✅ **Feature is complete when:**
1. All acceptance criteria (AC1-AC12) pass
2. All test cases pass
3. No critical bugs remain
4. Data integrity is maintained
5. Error handling is robust
6. User experience is smooth and intuitive

---

## Notes

- Follow BMAD Method principles: structured workflows, scale-adaptive intelligence
- Reference: [BMAD-METHOD Documentation](https://github.com/bmad-code-org/BMAD-METHOD)
- Test incrementally, fix issues as they arise
- Document any deviations from acceptance criteria
