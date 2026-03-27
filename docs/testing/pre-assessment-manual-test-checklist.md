# Pre-Assessment Form: Manual Testing Checklist

## Prerequisites

- [ ] Dev server running (`npm run dev`)
- [ ] Practitioner account logged in
- [ ] At least one client with sessions (with and without pre-assessment forms)
- [ ] Test sessions with different pre-assessment states

## Test Scenarios

### Scenario 1: Past Session with Completed Form

**Setup**: Session in past with `pre_assessment_completed = true`

1. Navigate to `/practice/clients`
2. Select a client with past sessions
3. **Verify**: Badge shows "Form Completed" with slate gray background
4. Click on the session card
5. **Verify**: Session detail view shows "Pre-Assessment Form" card
6. **Verify**: Card shows "Form Completed" badge and "View" button
7. Click "View" button
8. **Verify**: Modal opens with full pre-assessment form
9. **Verify**: All sections display (Background, Session Details, Body Map if applicable)
10. **Verify**: Form is read-only (no edit controls)
11. Close modal
12. **Verify**: Returns to session detail view

**Expected Result**: ✅ Practitioner can view completed form from past session

---

### Scenario 2: Upcoming Session with Required Form (Not Completed)

**Setup**: Upcoming session with `pre_assessment_required = true`, `pre_assessment_completed = false`

1. Navigate to `/practice/clients`
2. Select a client with upcoming sessions
3. **Verify**: Badge shows "Form Required" with amber background
4. Click on the session card
5. **Verify**: Session detail view shows "Pre-Assessment Form" card
6. **Verify**: Card shows "Form Required" badge (amber)
7. **Verify**: No "View" button (form not completed yet)
8. **Verify**: Badge is visible and prominent

**Expected Result**: ✅ Practitioner sees that form is required but not yet completed

---

### Scenario 3: Upcoming Session with Completed Form

**Setup**: Upcoming session with `pre_assessment_completed = true`

1. Navigate to `/practice/clients`
2. Select a client with upcoming sessions
3. **Verify**: Badge shows "Form Completed" with slate gray background
4. Click on the session card
5. **Verify**: Session detail view shows "Pre-Assessment Form" card
6. **Verify**: Card shows "Form Completed" badge and "View" button
7. Click "View" button
8. **Verify**: Modal opens with full form
9. **Verify**: Can review client information before session

**Expected Result**: ✅ Practitioner can review form before upcoming session

---

### Scenario 4: Session with Optional Form

**Setup**: Session with `pre_assessment_required = false`

1. Navigate to `/practice/clients`
2. Select a client with sessions
3. **Verify**: Badge shows "Optional" with muted gray background
4. Click on the session card
5. **Verify**: Session detail view shows "Pre-Assessment Form" card
6. **Verify**: Card shows "Optional" badge
7. **Verify**: No "View" button (form not required/completed)

**Expected Result**: ✅ Practitioner sees form is optional

---

### Scenario 5: Guest Booking Form Access

**Setup**: Session from guest booking with completed form

1. Navigate to `/practice/clients`
2. Find a client session from guest booking (check `client_id` is null)
3. **Verify**: Badge shows "Form Completed"
4. Click on session card
5. Click "View" button
6. **Verify**: Modal opens and displays guest booking form
7. **Verify**: Form shows guest booking badge in modal
8. **Verify**: All form data displays correctly

**Expected Result**: ✅ Practitioner can view forms from guest bookings

---

### Scenario 6: Authenticated Client Form Access

**Setup**: Session from authenticated client with completed form

1. Navigate to `/practice/clients`
2. Find a client session from authenticated client (check `client_id` is not null)
3. **Verify**: Badge shows "Form Completed"
4. Click on session card
5. Click "View" button
6. **Verify**: Modal opens and displays client form
7. **Verify**: Form shows client booking badge in modal
8. **Verify**: All form data displays correctly

**Expected Result**: ✅ Practitioner can view forms from authenticated clients

---

### Scenario 7: Mobile Responsiveness

1. Open browser DevTools
2. Switch to mobile view (375px width)
3. Navigate to `/practice/clients`
4. **Verify**: Badges display correctly on mobile
5. **Verify**: Badge text is readable
6. Click session card
7. **Verify**: Pre-assessment card displays correctly
8. Click "View" button (if available)
9. **Verify**: Modal is responsive and scrollable
10. **Verify**: Form content is readable on mobile

**Expected Result**: ✅ All UI elements are mobile responsive

---

### Scenario 8: Dark Mode Compatibility

1. Enable dark mode in browser/system
2. Navigate to `/practice/clients`
3. **Verify**: Badge colors are visible in dark mode
4. **Verify**: Slate gray badge is readable
5. **Verify**: Amber badge is readable
6. Click session card
7. **Verify**: Pre-assessment card is readable
8. Click "View" button
9. **Verify**: Modal and form are readable in dark mode

**Expected Result**: ✅ All colors work in dark mode

---

### Scenario 9: Edge Cases

#### 9a: Session Without Pre-Assessment Data

**Setup**: Session with all pre-assessment fields null/undefined

1. Navigate to `/practice/clients`
2. Find session without pre-assessment data
3. **Verify**: Badge shows "Optional" (default state)
4. Click session card
5. **Verify**: Pre-assessment card shows "Optional" badge
6. **Verify**: No errors in console

**Expected Result**: ✅ Handles missing data gracefully

#### 9b: Multiple Sessions with Different States

**Setup**: Client with multiple sessions (some completed, some required, some optional)

1. Navigate to `/practice/clients`
2. Select client with multiple sessions
3. **Verify**: Each session shows correct badge
4. **Verify**: Badges are visually distinct
5. Click through different sessions
6. **Verify**: Each shows correct pre-assessment status

**Expected Result**: ✅ Multiple states display correctly

---

## Browser Console Checks

While testing, monitor browser console for:

- [ ] No React errors
- [ ] No TypeScript errors
- [ ] No Supabase query errors
- [ ] No RLS policy violations
- [ ] No missing data warnings

## Performance Checks

- [ ] Session list loads quickly with badges
- [ ] Session detail view loads quickly
- [ ] Modal opens smoothly
- [ ] Form data loads without delay
- [ ] No unnecessary re-renders

## Accessibility Checks

- [ ] Badges have readable text contrast
- [ ] Buttons are keyboard accessible
- [ ] Modal can be closed with Escape key
- [ ] Screen reader can read badge states
- [ ] Focus management works correctly

## Final Verification

- [ ] All test scenarios pass
- [ ] No console errors
- [ ] UI matches design specifications
- [ ] Colors are neutral and modern
- [ ] Mobile and dark mode work correctly
- [ ] Edge cases handled gracefully

---

## Test Results Template

```
Test Date: ___________
Tester: ___________
Environment: ___________

Results:
- Scenario 1: [ ] Pass [ ] Fail [ ] N/A
- Scenario 2: [ ] Pass [ ] Fail [ ] N/A
- Scenario 3: [ ] Pass [ ] Fail [ ] N/A
- Scenario 4: [ ] Pass [ ] Fail [ ] N/A
- Scenario 5: [ ] Pass [ ] Fail [ ] N/A
- Scenario 6: [ ] Pass [ ] Fail [ ] N/A
- Scenario 7: [ ] Pass [ ] Fail [ ] N/A
- Scenario 8: [ ] Pass [ ] Fail [ ] N/A
- Scenario 9: [ ] Pass [ ] Fail [ ] N/A

Issues Found:
1. ___________
2. ___________

Notes:
___________
```
