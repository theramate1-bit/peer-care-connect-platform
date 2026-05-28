# Treatment Exchange Manual Test Checklist

**Date**: _______________  
**Tester**: _______________  
**Environment**: _______________

---

## Test Scenario 1: Happy Path - Complete Exchange Flow

**Objective**: Verify end-to-end treatment exchange from request to completion

**Prerequisites**:
- [ ] Two practitioner accounts created (Practitioner A: requester, Practitioner B: recipient)
- [ ] Both accounts have sufficient credits (100+ credits)
- [ ] Both accounts have completed profiles

### Step 1: Send Request (Practitioner A)

- [ ] Navigate to Treatment Exchange page
- [ ] Select Practitioner B from list
- [ ] Choose date/time (future date, at least 24h ahead)
- [ ] Select 60-minute session
- [ ] Add optional notes
- [ ] Click "Send Request"
- [ ] **Verify**: Success message displayed
- [ ] **Verify**: Request sent successfully
- [ ] **Verify**: Slot hold created (check database: `slot_holds` table)

**Result**: ☐ Pass ☐ Fail  
**Notes**: ________________________________________________

### Step 2: View Request (Practitioner B)

- [ ] Navigate to Dashboard
- [ ] **Verify**: Pending request appears in "Upcoming Sessions"
- [ ] **Verify**: Neutral styling (not orange/colorful)
- [ ] **Verify**: "Accept" button visible
- [ ] **Verify**: "Decline" button visible
- [ ] **Verify**: No "Start Session" button visible
- [ ] **Verify**: Request details displayed correctly (date, time, duration, requester name)

**Result**: ☐ Pass ☐ Fail  
**Notes**: ________________________________________________

### Step 3: Accept Request (Practitioner B)

- [ ] Click "Accept" button
- [ ] Confirm acceptance in dialog
- [ ] **Verify**: Success message displayed
- [ ] **Verify**: Request status changes to "accepted" (check database)
- [ ] **Verify**: Session appears in dashboard "Upcoming Sessions"
- [ ] **Verify**: Credits deducted from Practitioner A (check credits: should be -60)
- [ ] **Verify**: Credits added to Practitioner B (check credits: should be +60)
- [ ] **Verify**: `mutual_exchange_sessions` record created (check database)
- [ ] **Verify**: `client_sessions` record created with `is_peer_booking: true` (check database)
- [ ] **Verify**: Conversation created and linked (check `conversations` table)

**Result**: ☐ Pass ☐ Fail  
**Notes**: ________________________________________________

### Step 4: View Accepted Session (Both Practitioners)

**As Practitioner A:**
- [ ] Navigate to session detail view
- [ ] **Verify**: "Treatment Exchange" badge displayed
- [ ] **Verify**: "Cancel" button visible
- [ ] **Verify**: "Start Session" button NOT visible
- [ ] **Verify**: "Treatment Notes" button NOT visible
- [ ] **Verify**: "Send Message" button visible
- [ ] **Verify**: Credit deduction status displayed correctly

**As Practitioner B:**
- [ ] Navigate to session detail view
- [ ] **Verify**: "Treatment Exchange" badge displayed
- [ ] **Verify**: "Cancel" button visible
- [ ] **Verify**: "Start Session" button NOT visible
- [ ] **Verify**: "Treatment Notes" button NOT visible
- [ ] **Verify**: "Send Message" button visible
- [ ] **Verify**: Credit deduction status displayed correctly

**Result**: ☐ Pass ☐ Fail  
**Notes**: ________________________________________________

### Step 5: Cancel Session (Practitioner A - 24+ hours before)

- [ ] Click "Cancel" button
- [ ] Enter cancellation reason
- [ ] Confirm cancellation
- [ ] **Verify**: Session status changes to "cancelled" (check database)
- [ ] **Verify**: 100% refund processed (60 credits returned to Practitioner A)
- [ ] **Verify**: Credits deducted from Practitioner B (60 credits)
- [ ] **Verify**: Both `client_sessions` records marked as cancelled
- [ ] **Verify**: `mutual_exchange_sessions` status = 'cancelled'
- [ ] **Verify**: Refund percentage = 100%

**Result**: ☐ Pass ☐ Fail  
**Notes**: ________________________________________________

**Overall Scenario Result**: ☐ Pass ☐ Fail  
**Issues Found**: ________________________________________________

---

## Test Scenario 2: Decline Request Flow

**Objective**: Verify declining a request doesn't deduct credits

**Prerequisites**:
- [ ] Two practitioner accounts
- [ ] Practitioner A has 100 credits (note initial balance: _______)

### Steps:

1. [ ] Send request (Practitioner A)
2. [ ] Decline request (Practitioner B)
   - [ ] Click "Decline" button
   - [ ] Confirm decline
   - [ ] **Verify**: Request status changes to "declined" (check database)
   - [ ] **Verify**: Slot hold released/expired (check database)
   - [ ] **Verify**: No credits deducted from Practitioner A (balance still: _______)
   - [ ] **Verify**: No `mutual_exchange_sessions` record created
   - [ ] **Verify**: Request removed from dashboard

**Result**: ☐ Pass ☐ Fail  
**Notes**: ________________________________________________

---

## Test Scenario 3: Expired Request Handling

**Objective**: Verify expired requests are handled correctly

**Prerequisites**:
- [ ] Two practitioner accounts
- [ ] Ability to manipulate request expiry (or wait 24 hours)

### Steps:

1. [ ] Send request (Practitioner A)
2. [ ] Wait for request to expire OR manually set `expires_at` in database to past time
3. [ ] Attempt to accept expired request (Practitioner B)
   - [ ] **Verify**: Error message displayed: "Request has expired"
   - [ ] **Verify**: Cannot accept expired request
   - [ ] **Verify**: Slot hold expired/released (check database)

**Result**: ☐ Pass ☐ Fail  
**Notes**: ________________________________________________

---

## Test Scenario 4: Slot Hold Expiration and Recreation

**Objective**: Verify slot hold recreation logic when hold expires but request is valid

**Prerequisites**:
- [ ] Two practitioner accounts
- [ ] Ability to manipulate slot hold expiry

### Steps:

1. [ ] Send request (Practitioner A)
   - [ ] **Verify**: Slot hold created with 10-minute expiration (check database)
2. [ ] Wait for slot hold to expire OR manually expire in database (set `expires_at` to past)
3. [ ] Accept request (Practitioner B) - within 24-hour request window
   - [ ] **Verify**: Slot hold recreated automatically (check database)
   - [ ] **Verify**: Request accepted successfully
   - [ ] **Verify**: Session created correctly

**Result**: ☐ Pass ☐ Fail  
**Notes**: ________________________________________________

---

## Test Scenario 5: Insufficient Credits

**Objective**: Verify error handling when requester has insufficient credits

**Prerequisites**:
- [ ] Two practitioner accounts
- [ ] Practitioner A has 0 credits (or less than required: _______)

### Steps:

1. [ ] Attempt to send request (Practitioner A)
   - [ ] Select 60-minute session (requires 60 credits)
   - [ ] **Verify**: Error message displayed: "Insufficient credits" or similar
   - [ ] **Verify**: Request not sent
   - [ ] **Verify**: No slot hold created (check database)

**Result**: ☐ Pass ☐ Fail  
**Notes**: ________________________________________________

---

## Test Scenario 6: Cancellation Refund Logic (Time-Based)

**Objective**: Verify refund percentages based on cancellation time

**Prerequisites**:
- [ ] Two practitioner accounts
- [ ] Accepted treatment exchange session

### Test Case 6a: 24+ Hours Before Session

- [ ] Create session scheduled 25+ hours in future
- [ ] Cancel session (Practitioner A)
- [ ] **Verify**: 100% refund (60 credits returned to Practitioner A)
- [ ] **Verify**: Refund percentage = 100% (check database)
- [ ] **Verify**: Credits deducted from Practitioner B (60 credits)

**Result**: ☐ Pass ☐ Fail  
**Notes**: ________________________________________________

### Test Case 6b: 2-24 Hours Before Session

- [ ] Create session scheduled 12 hours in future
- [ ] Cancel session (Practitioner A)
- [ ] **Verify**: 50% refund (30 credits returned to Practitioner A)
- [ ] **Verify**: Refund percentage = 50% (check database)
- [ ] **Verify**: Credits deducted from Practitioner B (30 credits)

**Result**: ☐ Pass ☐ Fail  
**Notes**: ________________________________________________

### Test Case 6c: <2 Hours Before Session

- [ ] Create session scheduled 1 hour in future
- [ ] Cancel session (Practitioner A)
- [ ] **Verify**: 0% refund (no credits returned)
- [ ] **Verify**: Refund percentage = 0% (check database)
- [ ] **Verify**: No credits transferred

**Result**: ☐ Pass ☐ Fail  
**Notes**: ________________________________________________

---

## Test Scenario 7: Dashboard Display and Filtering

**Objective**: Verify treatment exchange sessions appear correctly in dashboard

**Prerequisites**:
- [ ] Practitioner with accepted treatment exchange session
- [ ] Practitioner with pending treatment exchange request
- [ ] Practitioner with regular client session

### Steps:

1. [ ] Navigate to Dashboard
2. [ ] **Verify**: Pending exchange requests appear in "Upcoming Sessions"
3. [ ] **Verify**: Accepted exchange sessions appear in "Upcoming Sessions"
4. [ ] **Verify**: Regular sessions appear alongside exchange sessions
5. [ ] **Verify**: Sessions sorted by date/time (earliest first)
6. [ ] **Verify**: "Start Session" button NOT visible for exchange sessions
7. [ ] **Verify**: "Start Session" button visible for regular sessions
8. [ ] **Verify**: Correct styling for each session type

**Result**: ☐ Pass ☐ Fail  
**Notes**: ________________________________________________

---

## Test Scenario 8: Messaging Integration

**Objective**: Verify conversation creation and navigation

**Prerequisites**:
- [ ] Two practitioner accounts
- [ ] Accepted treatment exchange session

### Steps:

1. [ ] Navigate to session detail view
2. [ ] Click "Send Message" button
   - [ ] **Verify**: Navigates to messaging page
   - [ ] **Verify**: Conversation pre-selected (if exists)
   - [ ] **Verify**: Can send messages
3. [ ] Navigate to messaging page directly
   - [ ] **Verify**: Conversation appears in conversation list
   - [ ] **Verify**: Can access conversation from list
   - [ ] **Verify**: Conversation shows both practitioners

**Result**: ☐ Pass ☐ Fail  
**Notes**: ________________________________________________

---

## Overall Test Summary

**Total Scenarios**: 8  
**Passed**: _______  
**Failed**: _______  
**Blocked**: _______

**Critical Issues**: ________________________________________________

**High Priority Issues**: ________________________________________________

**Medium Priority Issues**: ________________________________________________

**Low Priority Issues**: ________________________________________________

**Screenshots/Evidence**: (Attach screenshots of any issues found)

---

## Sign-off

**Tester Name**: _______________  
**Date**: _______________  
**Approved**: ☐ Yes ☐ No










