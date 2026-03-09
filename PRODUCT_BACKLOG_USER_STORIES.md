# Product Backlog - User Stories & Acceptance Criteria
**Date:** 2025-01-27  
**Status:** Ready for Development  
**Method:** BMAD Analysis

---

## Table of Contents

1. [Onboarding & Terms](#onboarding--terms)
2. [Profile Setup](#profile-setup)
3. [Goals & Progress Metrics](#goals--progress-metrics)
4. [Exercise Library](#exercise-library)
5. [Diary & Session Management](#diary--session-management)
6. [Treatment Exchange & Credits](#treatment-exchange--credits)
7. [Refund Policy](#refund-policy)
8. [Notifications](#notifications)
9. [Real-time State Management](#real-time-state-management)
10. [Credits Page](#credits-page)
11. [Health Form/Pre-Assessment](#health-formpre-assessment)
12. [Service Management](#service-management)
13. [Mobile Therapists](#mobile-therapists)
14. [SMS Reminders](#sms-reminders)
15. [Confirmation Email](#confirmation-email)

---

## Onboarding & Terms

### User Story 1: Stripe Terms and Conditions Display
**As a** practitioner  
**I want to** see Stripe's terms and conditions during onboarding  
**So that** I understand the payment processing agreement before completing setup

#### Acceptance Criteria
- [ ] Stripe terms and conditions are displayed during payment setup step
- [ ] Terms are presented in a readable format (modal or expandable section)
- [ ] User must acknowledge terms before proceeding
- [ ] Terms link opens Stripe's official terms page
- [ ] Acknowledgment is stored in user profile

#### UX Flow
```
Onboarding → Payment Setup Step
  ↓
Display Stripe Terms (Modal/Expandable)
  ↓
User Reads Terms
  ↓
Checkbox: "I agree to Stripe's Terms and Conditions"
  ↓
[Continue] Button Enabled
  ↓
Proceed to Next Step
```

---

## Profile Setup

### User Story 2: Replace Fix Button with Checkbox
**As a** practitioner  
**I want to** use a checkbox instead of a "Fix" button in profile setup  
**So that** I can easily mark items as complete without navigating away

#### Acceptance Criteria
- [ ] Replace "Fix" buttons with checkboxes in profile setup
- [ ] Checkbox indicates completion status
- [ ] Visual feedback when checkbox is checked/unchecked
- [ ] Checked items are marked as complete
- [ ] Unchecked items show as needing attention
- [ ] Status persists across page refreshes

#### UX Flow
```
Profile Setup Page
  ↓
View Profile Sections
  ↓
[ ] Incomplete Item 1
[✓] Complete Item 2
[ ] Incomplete Item 3
  ↓
Click Checkbox → Toggle Status
  ↓
Visual Update (Green Checkmark/Red Alert)
  ↓
Save Status
```

---

## Goals & Progress Metrics

### User Story 3: Clarify Goals vs Progress Metrics
**As a** practitioner  
**I want to** understand the difference between Goals and Progress Metrics  
**So that** I can use each feature appropriately for client management

#### Acceptance Criteria
- [ ] Separate "Goals" tab in practitioner dashboard
- [ ] Clear explanation: "Goals are tailored to individual clients"
- [ ] Clear explanation: "Progress Metrics are for therapist observation and client visibility"
- [ ] Visual distinction between Goals and Progress sections
- [ ] Help tooltip/icon explaining the difference
- [ ] Goals tab prominently displayed

#### UX Flow
```
Practitioner Dashboard
  ↓
Navigation Tabs:
  - Goals (NEW - Tailored to Client)
  - Progress Metrics (Therapist Observation)
  ↓
Click "Goals" Tab
  ↓
View Client Goals
  ↓
[?] Icon → Tooltip: "Goals are personalized targets for your clients"
  ↓
Click "Progress Metrics" Tab
  ↓
[?] Icon → Tooltip: "Progress Metrics track client performance for both you and the client to view"
```

---

## Exercise Library

### User Story 4: Remove Duplicate Exercises
**As a** practitioner  
**I want to** see only unique exercises in the library  
**So that** I don't get confused by duplicates

#### Acceptance Criteria
- [x] Duplicate exercises identified and removed
- [x] Unique constraint added to prevent future duplicates
- [x] Program references updated to use kept exercises
- [x] No duplicate exercises remain in active library

**Status:** ✅ **COMPLETE**

---

### User Story 5: Custom Exercise Creation
**As a** practitioner  
**I want to** create custom exercises for clients  
**So that** I can provide personalized exercise programs

#### Acceptance Criteria
- [x] "Create Custom" button in HEP Creator/Editor
- [x] Custom exercise dialog with all required fields
- [x] Custom exercises saved to program
- [x] Custom exercises only used in specific program

**Status:** ✅ **COMPLETE**

---

### User Story 6: Exercise Media Attachments
**As a** practitioner  
**I want to** attach videos/images of clients performing exercises  
**So that** clients have visual guidance when doing exercises at home

#### Acceptance Criteria
- [x] Media upload component for each exercise
- [x] Support for images and videos
- [x] Info icon with tooltip explaining feature
- [x] Media displayed in client exercise viewer
- [x] File size and type validation

**Status:** ✅ **COMPLETE**

---

## Diary & Session Management

### User Story 7: Session Attendance Tracking
**As a** practitioner  
**I want to** mark whether a client attended a session  
**So that** I can track attendance accurately

#### Acceptance Criteria
- [ ] Click on session in diary
- [ ] View session details modal/page
- [ ] Under "Status" section, see attendance checkboxes:
  - [✓] Client Attended (default checked)
  - [ ] Client Did Not Attend
- [ ] System defaults to "Client Attended" for all sessions
- [ ] Practitioner can manually change attendance status
- [ ] Attendance status saved and displayed
- [ ] Attendance history visible in session details

#### UX Flow
```
Diary View
  ↓
Click on Session
  ↓
Session Details Modal/Page
  ↓
Status Section:
  [✓] Client Attended (Default)
  [ ] Client Did Not Attend
  ↓
Practitioner Toggles if Needed
  ↓
Save Changes
  ↓
Status Updated in Diary
```

---

### User Story 8: Treatment Notes Navigation & Consistency
**As a** practitioner  
**I want to** easily navigate to treatment notes and have consistent editing rules  
**So that** I can manage session documentation properly

#### Acceptance Criteria
- [ ] Clear navigation path to treatment notes from diary
- [ ] Treatment notes accessible from completed sessions
- [ ] Consistent editing rules across all note types
- [ ] Once notes are finalized, prevent re-editing (or require approval)
- [ ] Standardized note format across all sessions
- [ ] Clear indication of note status (draft/finalized)

#### UX Flow
```
Diary → Session
  ↓
Session Details
  ↓
Navigation Options:
  - View Treatment Notes
  - Edit Treatment Notes (if draft)
  - View Completed Notes (if finalized)
  ↓
Treatment Notes Page
  ↓
If Draft: [Edit] Button Available
If Finalized: [View Only] (No Edit)
  ↓
Consistent Format Across All Notes
```

---

## Treatment Exchange & Credits

### User Story 9: Treatment Exchange Tab
**As a** practitioner  
**I want to** access treatment exchange features from a dedicated tab  
**So that** I can easily manage peer treatment exchanges

#### Acceptance Criteria
- [ ] New "Treatment Exchange" tab in practitioner dashboard
- [ ] Tab visible in navigation menu
- [ ] Treatment exchange features accessible from tab
- [ ] Credits balance visible in profile
- [ ] Clear connection between credits and treatment exchange

#### UX Flow
```
Practitioner Dashboard
  ↓
Navigation Tabs:
  - Dashboard
  - Clients
  - Treatment Exchange (NEW)
  - Credits (in Profile)
  ↓
Click "Treatment Exchange"
  ↓
View Exchange Options
  ↓
View Credits Balance
```

---

## Refund Policy

### User Story 10: Implement Refund Policy
**As a** system administrator  
**I want to** enforce refund policies based on cancellation timing  
**So that** practitioners are protected from last-minute cancellations

#### Acceptance Criteria
- [ ] No refund if cancelled less than 24 hours before session
- [ ] Full refund if cancelled 24+ hours before session
- [ ] 50% refund if cancelled 12-24 hours before session (deposit only)
- [ ] Refund policy clearly displayed during booking
- [ ] Refund policy shown in cancellation confirmation
- [ ] Automatic refund processing based on timing
- [ ] Refund amount calculated correctly

#### UX Flow
```
Client Cancels Session
  ↓
Check Time Until Session
  ↓
< 12 hours: No Refund
12-24 hours: 50% Refund (Deposit)
> 24 hours: Full Refund
  ↓
Display Refund Policy
  ↓
Confirm Cancellation
  ↓
Process Refund Automatically
  ↓
Send Refund Confirmation
```

---

## Notifications

### User Story 11: Message Notifications
**As a** practitioner  
**I want to** receive notifications when I receive new messages  
**So that** I can respond to clients promptly

#### Acceptance Criteria
- [x] Real-time notifications for new messages
- [x] Notification bell shows unread count
- [x] Toast notification on new message
- [x] Email notification for new messages
- [x] Notification preferences in settings

**Status:** ✅ **COMPLETE** (Real-time done, Email pending)

#### Remaining Work
- [ ] Email notification for new messages
- [ ] Notification preferences (in-app, email, SMS)

---

### User Story 12: Email Notifications for Practitioners
**As a** practitioner  
**I want to** receive email notifications for important events  
**So that** I stay informed even when not in the app

#### Acceptance Criteria
- [ ] Email notification for new messages
- [ ] Email notification for booking requests
- [ ] Email notification for session cancellations
- [ ] Email notification for treatment exchange requests
- [ ] Email preferences in settings
- [ ] Opt-in/opt-out for different notification types

---

## Real-time State Management

### User Story 13: Rating-Based Booking Restrictions
**As a** system  
**I want to** restrict bookings based on practitioner ratings  
**So that** practitioners are matched appropriately

#### Acceptance Criteria
- [ ] Real-time rating state management
- [ ] 4-5 star practitioners can book with each other
- [ ] 2-3 star practitioners can book with each other
- [ ] 0-1 star practitioners can book with each other
- [ ] Booking button disabled if ratings don't match
- [ ] Clear message explaining why booking is restricted
- [ ] Rating displayed in practitioner profile
- [ ] Real-time updates when ratings change

#### UX Flow
```
Client Views Practitioner Profile
  ↓
Check Practitioner Rating
  ↓
Check Client Rating (if practitioner)
  ↓
If Ratings Match Category:
  - [Book Session] Button Enabled
  - Show Available Time Slots
  ↓
If Ratings Don't Match:
  - [Book Session] Button Disabled
  - Message: "Booking available for practitioners with similar ratings"
  - Show Rating Requirements
```

---

## Credits Page

### User Story 14: Credits Page Explanation
**As a** user  
**I want to** understand what credits are used for  
**So that** I can make informed decisions about using or saving them

#### Acceptance Criteria
- [ ] Clear explanation in Credits tab
- [ ] Text: "Use credits for peer treatment exchange"
- [ ] Text: "Save credits for upcoming CPD sessions"
- [ ] Visual distinction between use cases
- [ ] Links to treatment exchange and CPD sections
- [ ] Current credit balance prominently displayed

#### UX Flow
```
Profile → Credits Tab
  ↓
Credits Page
  ↓
Header: "Your Credits: [Balance]"
  ↓
Explanation Section:
  "Use credits for peer treatment exchange"
  [View Treatment Exchange] Button
  ↓
"Save credits for upcoming CPD sessions"
  [View CPD Sessions] Button
  ↓
Credit History
  ↓
Earn/Use Credits Options
```

---

## Health Form/Pre-Assessment

### User Story 15: Compulsory Pre-Assessment for First Session
**As a** practitioner  
**I want to** require clients to complete a pre-assessment before their first session  
**So that** I have necessary health information

#### Acceptance Criteria
- [x] Pre-assessment form created
- [x] Form includes all required fields
- [x] Form compulsory for first session
- [x] Form optional for subsequent sessions
- [x] Form cannot be skipped for first session
- [x] Form accessible from booking flow

**Status:** ✅ **COMPLETE**

---

## Service Management

### User Story 16: Edit Services Functionality
**As a** practitioner  
**I want to** edit my services without errors  
**So that** I can keep my service offerings up to date

#### Acceptance Criteria
- [ ] Edit service button works without edge function errors
- [ ] Service edit form loads existing data
- [ ] All service fields editable
- [ ] Changes save successfully
- [ ] Error handling for failed saves
- [ ] Success confirmation message
- [ ] Updated service reflects in marketplace immediately

#### UX Flow
```
Profile → Services
  ↓
View Services List
  ↓
Click [Edit] on Service
  ↓
Service Edit Form (Pre-filled)
  ↓
Make Changes
  ↓
Click [Save]
  ↓
Success: "Service updated successfully"
  ↓
Service Updated in Marketplace
```

---

## Mobile Therapists

### User Story 17: Mobile Service Request Flow
**As a** mobile therapist  
**I want to** receive booking requests instead of direct bookings  
**So that** I can manage my travel time and schedule

#### Acceptance Criteria
- [ ] Mobile services show "Request Session" instead of "Book Session"
- [ ] Client submits booking request with preferred date/time
- [ ] Practitioner receives notification of request
- [ ] Practitioner can accept, decline, or suggest alternative time
- [ ] If accepted, booking is confirmed and payment processed
- [ ] If declined, client receives notification with optional reason
- [ ] Client can accept alternative time or request different time
- [ ] Request status visible to both parties

#### UX Flow
```
Client Views Mobile Therapist
  ↓
[Request Session] Button (Not "Book")
  ↓
Select Service, Date, Time
  ↓
Submit Request
  ↓
Practitioner Receives Notification
  ↓
Practitioner Options:
  - [Accept] → Booking Confirmed, Payment Processed
  - [Decline] → Provide Reason, Client Notified
  - [Suggest Alternative] → New Time Proposed
  ↓
Client Receives Response
  ↓
If Alternative Suggested:
  - [Accept Alternative] → Booking Confirmed
  - [Request Different Time] → New Request
```

---

## SMS Reminders

### User Story 18: SMS Session Reminders
**As a** client  
**I want to** receive SMS reminders for my sessions  
**So that** I don't forget my appointments

#### Acceptance Criteria
- [ ] SMS reminder sent 24 hours before session
- [ ] SMS reminder sent 2 hours before session
- [ ] SMS includes session date, time, and address
- [ ] SMS includes practitioner name
- [ ] SMS includes cancellation link
- [ ] SMS preferences in client settings
- [ ] Opt-in/opt-out for SMS reminders
- [ ] SMS delivery status tracked

#### UX Flow
```
Session Scheduled
  ↓
24 Hours Before Session
  ↓
System Sends SMS:
  "Reminder: Session with [Practitioner] on [Date] at [Time] at [Address]"
  ↓
2 Hours Before Session
  ↓
System Sends SMS:
  "Final Reminder: Session in 2 hours at [Address]"
  ↓
Client Receives SMS
  ↓
Optional: Click Link to View/Cancel
```

---

## Confirmation Email

### User Story 19: Improved Booking Confirmation Email
**As a** client  
**I want to** receive a clear confirmation email with all session details  
**So that** I have all the information I need

#### Acceptance Criteria
- [ ] Email includes session address
- [ ] Email buttons are readable (proper contrast)
- [ ] Email buttons are functional
- [ ] If client doesn't have account, provide account creation option
- [ ] If client creates account, session appears in their account
- [ ] Email includes all session details (date, time, practitioner, address)
- [ ] Email includes cancellation policy
- [ ] Email includes contact information

#### UX Flow
```
Client Books Session
  ↓
Confirmation Email Sent
  ↓
Email Contains:
  - Session Date & Time
  - Practitioner Name
  - Session Address (NEW)
  - Service Details
  - [View Session] Button (Readable)
  - [Cancel Session] Button (Readable)
  ↓
If No Account:
  - [Create Account] Button
  - "Create account to manage your sessions"
  ↓
If Creates Account:
  - Session Appears in "My Bookings"
  - Session Linked to Account
```

---

## Priority Matrix

### High Priority (P0 - Critical)
1. ✅ Exercise Library Duplicates (COMPLETE)
2. ✅ Custom Exercises (COMPLETE)
3. ✅ Exercise Media Attachments (COMPLETE)
4. ✅ Pre-Assessment Form (COMPLETE)
5. ✅ Message Notifications (Real-time COMPLETE)
6. Service Editing (Edge Function Error)
7. Treatment Notes Navigation
8. Confirmation Email Improvements

### Medium Priority (P1 - Important)
9. Session Attendance Tracking
10. Mobile Service Request Flow
11. Rating-Based Booking Restrictions
12. Refund Policy Implementation
13. Email Notifications
14. SMS Reminders
15. Credits Page Explanation

### Low Priority (P2 - Nice to Have)
16. Goals vs Progress Clarity
17. Profile Setup Checkbox
18. Stripe Terms Display
19. Treatment Exchange Tab

---

## Dependencies

### Technical Dependencies
- **SMS Reminders** → Requires SMS service integration (Twilio/AWS SNS)
- **Email Notifications** → Requires email service configuration
- **Rating-Based Booking** → Requires real-time state management
- **Refund Policy** → Requires payment processing integration

### Feature Dependencies
- **Treatment Exchange Tab** → Requires Treatment Exchange feature completion
- **Credits Page** → Requires Credits system completion
- **Mobile Request Flow** → Requires Mobile Therapist feature completion

---

## Testing Checklist

### Functional Testing
- [ ] All buttons are clickable and functional
- [ ] All forms validate input correctly
- [ ] All notifications trigger correctly
- [ ] All email/SMS send successfully
- [ ] All real-time updates work
- [ ] All navigation paths work
- [ ] All error states handled gracefully

### User Experience Testing
- [ ] All text is readable
- [ ] All buttons have proper contrast
- [ ] All flows are intuitive
- [ ] All help text is clear
- [ ] All error messages are helpful

### Integration Testing
- [ ] Email service integration works
- [ ] SMS service integration works
- [ ] Payment processing works
- [ ] Real-time subscriptions work
- [ ] Database constraints work

---

## Next Steps

### Immediate (This Sprint)
1. Fix Service Editing Edge Function Error
2. Improve Confirmation Email (address, buttons, account creation)
3. Fix Treatment Notes Navigation
4. Implement Session Attendance Tracking

### Short Term (Next Sprint)
5. Mobile Service Request Flow
6. Rating-Based Booking Restrictions
7. Refund Policy Implementation
8. Email Notifications for Practitioners

### Medium Term (Future Sprints)
9. SMS Reminders
10. Credits Page Explanation
11. Goals vs Progress Clarity
12. Treatment Exchange Tab

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-27  
**Status:** Ready for Development
