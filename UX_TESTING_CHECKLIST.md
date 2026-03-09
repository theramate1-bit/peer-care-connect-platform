# UX Testing Checklist: Patient Management & History Transfer

## Quick Reference Checklist

Use this checklist during testing sessions to ensure all aspects are covered.

---

## Client Notes Viewing Flow

### Navigation
- [ ] Client can find Notes section in navigation
- [ ] Notes page loads without errors
- [ ] Empty state displays when no notes exist
- [ ] Loading state is clear

### Note List
- [ ] Notes are displayed in chronological order
- [ ] Note types are clearly labeled (SOAP, DAP, HEP)
- [ ] Practitioner names are visible
- [ ] Session dates are displayed
- [ ] Notes are clickable/selectable

### SOAP Note Display
- [ ] SOAP notes are grouped by session
- [ ] All sections are visible (Subjective, Objective, Assessment, Plan)
- [ ] Section headers are clear
- [ ] Content is readable and formatted correctly
- [ ] No content is missing or truncated
- [ ] Sections are visually distinct

### DAP Note Display
- [ ] DAP notes display correctly
- [ ] All sections visible (Data, Assessment, Plan)
- [ ] Formatting matches SOAP style
- [ ] Content is complete

### General Notes
- [ ] General notes display correctly
- [ ] Timestamps are visible
- [ ] Content is readable

---

## Exercise Program Creation Flow

### Access
- [ ] Exercise Program accordion is visible
- [ ] Accordion expands/collapses correctly
- [ ] Form is accessible when expanded

### Form Fields
- [ ] Program title field exists
- [ ] Description field exists
- [ ] Instructions field exists (manual only)
- [ ] **Duration field is NOT present** ✓
- [ ] Sets field exists for exercises
- [ ] Reps field exists for exercises
- [ ] **Duration field is NOT present for exercises** ✓
- [ ] Frequency per week selector exists

### Exercise Management
- [ ] Can add exercises to program
- [ ] Can remove exercises
- [ ] Can update Sets and Reps
- [ ] Exercise list displays correctly

### Creation & Delivery
- [ ] Create button is visible
- [ ] Form validation works
- [ ] Success message appears after creation
- [ ] Form resets after success
- [ ] Success state is displayed (if implemented)
- [ ] No errors during creation

### UI Updates
- [ ] UI reflects program was created
- [ ] Form clears properly
- [ ] No stale data remains
- [ ] Loading states are clear

---

## Exercise Program Transfer Flow

### Initiation
- [ ] Transfer button/option is visible
- [ ] Transfer dialog opens correctly
- [ ] Practitioner selection dropdown works

### Transfer Options
- [ ] "Include Full Patient Record" checkbox exists
- [ ] Checkbox is clearly labeled
- [ ] Description explains what will be transferred
- [ ] Transfer summary appears when practitioner selected
- [ ] Transfer summary shows accurate counts:
  - [ ] Treatment notes count
  - [ ] Progress metrics count
  - [ ] Progress goals count
  - [ ] Exercise programs count
  - [ ] Sessions count (viewable)

### Transfer Process
- [ ] Transfer notes field is optional
- [ ] Transfer button is enabled when valid
- [ ] Transfer processes successfully
- [ ] Success message shows what was transferred
- [ ] Dialog closes after success
- [ ] UI updates to reflect transfer

### Data Verification
- [ ] Transferred data is accessible to new practitioner
- [ ] All notes are visible
- [ ] All metrics are visible
- [ ] All goals are visible
- [ ] All programs are visible

---

## Patient History Request Flow (New Practitioner)

### Request Creation
- [ ] "Request Patient History" button is visible
- [ ] Button is in expected location (client header)
- [ ] Button is only shown when client_id exists
- [ ] Request dialog opens correctly

### Practitioner Selection
- [ ] Previous practitioners dropdown populates
- [ ] Practitioners are listed with session counts
- [ ] Empty state message if no previous practitioners
- [ ] Can select a practitioner

### Transfer Summary
- [ ] Summary appears when practitioner selected
- [ ] Summary shows accurate counts
- [ ] Summary is readable and clear
- [ ] Loading state while fetching summary

### Request Submission
- [ ] Request notes field is optional
- [ ] Submit button is enabled when valid
- [ ] Request submits successfully
- [ ] Success message appears
- [ ] Dialog closes after submission

### Request Tracking
- [ ] Request appears in "My Requests" tab
- [ ] Status is clearly displayed (Pending)
- [ ] Request details are visible
- [ ] Can view request notes
- [ ] Can cancel pending requests

---

## Patient History Request Flow (Previous Practitioner)

### Request Reception
- [ ] "History Requests" tab is visible
- [ ] Incoming requests appear in list
- [ ] Request status is clearly marked (Pending)
- [ ] Request details are visible

### Request Review
- [ ] Can open request to review details
- [ ] Requesting practitioner name is visible
- [ ] Client name is visible
- [ ] Request notes are displayed
- [ ] Transfer summary is shown
- [ ] Summary counts are accurate

### Request Response
- [ ] Response notes field is optional
- [ ] Approve button is visible and functional
- [ ] Deny button is visible and functional
- [ ] Approval processes successfully
- [ ] Denial processes successfully
- [ ] Success message appears
- [ ] Patient data transfers on approval

### Status Updates
- [ ] Request status updates after response
- [ ] Status badge reflects new state
- [ ] Response notes are visible
- [ ] Responded date is shown

---

## Accessibility Checklist

### Screen Reader (NVDA/VoiceOver)
- [ ] All interactive elements are announced
- [ ] Form fields have labels
- [ ] Buttons have descriptive text
- [ ] Status messages are announced
- [ ] Error messages are announced
- [ ] Accordion sections are navigable
- [ ] Modal dialogs trap focus
- [ ] Focus order is logical

### Keyboard Navigation
- [ ] All functions work with keyboard only
- [ ] Tab order is logical
- [ ] Focus indicators are visible
- [ ] Enter/Space activate buttons
- [ ] Escape closes modals
- [ ] Arrow keys navigate lists
- [ ] No keyboard traps

### Color Contrast
- [ ] Text meets WCAG AA (4.5:1)
- [ ] Large text meets WCAG AA (3:1)
- [ ] Status badges are distinguishable
- [ ] Error messages are visible
- [ ] Success messages are clear
- [ ] Links are distinguishable

---

## Responsive Design Checklist

### Mobile (320px - 768px)
- [ ] Client notes list is scrollable
- [ ] SOAP notes sections stack vertically
- [ ] Exercise program form fits screen
- [ ] Transfer dialog is usable
- [ ] History request forms are usable
- [ ] Buttons are appropriately sized (min 44x44px)
- [ ] Text is readable without zooming
- [ ] No horizontal scrolling
- [ ] Accordion works on touch

### Tablet (768px - 1024px)
- [ ] Layout adapts appropriately
- [ ] Two-column layouts work
- [ ] Forms are readable
- [ ] Modals are centered
- [ ] Touch targets are adequate

### Desktop (1024px+)
- [ ] Full layout displays correctly
- [ ] Multi-column layouts work
- [ ] Hover states function
- [ ] Spacing is appropriate
- [ ] No wasted space

---

## Error Handling Checklist

### Empty States
- [ ] Client with no notes sees helpful message
- [ ] Practitioner with no previous practitioners sees message
- [ ] No requests shows appropriate empty state
- [ ] Empty states are helpful, not just "No data"

### Validation
- [ ] Required fields show errors
- [ ] Invalid data shows clear messages
- [ ] Error messages are actionable
- [ ] Form prevents submission with errors

### Network Errors
- [ ] Network errors show user-friendly messages
- [ ] Retry options are available
- [ ] Partial failures are handled gracefully
- [ ] Loading states don't hang indefinitely

### Edge Cases
- [ ] Very long notes display correctly
- [ ] Many notes don't break layout
- [ ] Special characters in content work
- [ ] Concurrent requests are handled
- [ ] Duplicate requests are prevented

---

## Performance Checklist

### Load Times
- [ ] Client notes page loads in < 2 seconds
- [ ] SOAP notes render quickly
- [ ] Exercise program form is responsive
- [ ] Transfer summary loads in < 1 second
- [ ] History requests list loads efficiently

### Interactions
- [ ] Button clicks respond immediately
- [ ] Form submissions are responsive
- [ ] Accordion expands smoothly
- [ ] Modal opens without delay
- [ ] No janky animations

### Real-time Updates
- [ ] UI updates after program creation
- [ ] Request status updates reflect immediately
- [ ] No unnecessary re-renders
- [ ] Optimistic updates work correctly

---

## Cross-Browser Testing

### Chrome
- [ ] All features work
- [ ] Styling is correct
- [ ] No console errors

### Firefox
- [ ] All features work
- [ ] Styling is correct
- [ ] No console errors

### Safari
- [ ] All features work
- [ ] Styling is correct
- [ ] No console errors

### Edge
- [ ] All features work
- [ ] Styling is correct
- [ ] No console errors

---

## Critical Issues to Watch For

### P0 (Critical - Block Release)
- [ ] Clients cannot view their notes
- [ ] Exercise programs cannot be created
- [ ] Transfers fail silently
- [ ] History requests cannot be submitted
- [ ] Data loss during transfer

### P1 (High - Fix Before Launch)
- [ ] Confusing UI that causes errors
- [ ] Missing critical information
- [ ] Unclear success/error messages
- [ ] Poor mobile experience
- [ ] Accessibility blockers

### P2 (Medium - Fix Soon)
- [ ] Minor usability issues
- [ ] Inconsistent styling
- [ ] Non-critical missing features
- [ ] Performance issues

### P3 (Low - Nice to Have)
- [ ] Minor visual improvements
- [ ] Additional helpful text
- [ ] Enhanced animations
