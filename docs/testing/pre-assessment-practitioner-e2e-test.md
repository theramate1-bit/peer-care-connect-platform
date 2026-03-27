# Pre-Assessment Form: Practitioner View E2E Test Plan

## Test Objective

Verify that practitioners can view pre-assessment forms submitted by clients after booking, across all integration points.

## Test Scope

1. **Session List View** (`PracticeClientManagement.tsx`)
   - Past sessions with completed forms
   - Past sessions with required but incomplete forms
   - Upcoming sessions with completed forms
   - Upcoming sessions with required but incomplete forms
   - Sessions where form is optional

2. **Session Detail View** (`SessionDetailView.tsx`)
   - Pre-assessment card displays correctly
   - View button opens modal
   - Form displays correctly in modal
   - All form sections render properly

3. **Data Flow**
   - Queries include pre-assessment fields
   - Data mapping works correctly
   - RLS policies allow practitioner access

## Test Cases

### TC1: Past Session - Form Completed

- **Setup**: Session with `pre_assessment_completed = true`
- **Expected**: Badge shows "Form Completed" (slate gray)
- **Action**: Click session card
- **Expected**: Detail view shows pre-assessment card with "View" button
- **Action**: Click "View" button
- **Expected**: Modal opens with full form

### TC2: Upcoming Session - Form Required (Not Completed)

- **Setup**: Upcoming session with `pre_assessment_required = true`, `pre_assessment_completed = false`
- **Expected**: Badge shows "Form Required" (amber)
- **Action**: Click session card
- **Expected**: Detail view shows pre-assessment card with amber badge, no view button

### TC3: Session - Form Optional

- **Setup**: Session with `pre_assessment_required = false`
- **Expected**: Badge shows "Optional" (muted gray)
- **Action**: Click session card
- **Expected**: Detail view shows pre-assessment card with optional badge

### TC4: Guest Booking Form Access

- **Setup**: Session from guest booking with completed form
- **Expected**: Practitioner can view form (RLS allows via therapist_id match)

### TC5: Authenticated Client Form Access

- **Setup**: Session from authenticated client with completed form
- **Expected**: Practitioner can view form (RLS allows via therapist_id match)

## Verification Checklist

- [ ] Badge colors match neutral/modern design
- [ ] Badges display in correct positions
- [ ] View button appears only when form is completed
- [ ] Modal opens and displays form correctly
- [ ] All form sections render (Background, Session Details, Body Map)
- [ ] No console errors
- [ ] RLS policies work correctly
- [ ] Mobile responsive
- [ ] Dark mode compatible
