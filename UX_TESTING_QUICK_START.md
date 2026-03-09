# UX Testing Quick Start Guide

**Time Required**: 30 minutes  
**Purpose**: Quick validation of core functionality

## Prerequisites

1. Test accounts set up (see `UX_TEST_DATA_SETUP.md`)
2. Sample data with notes and programs
3. Browser with DevTools

## Quick Test Scenarios

### Scenario 1: Client Views SOAP Notes (5 minutes)

**Steps**:
1. Log in as client
2. Navigate to Notes
3. Open a SOAP note
4. Verify all sections visible

**Check**:
- ✓ Notes page loads
- ✓ SOAP note displays
- ✓ All 4 sections visible (Subjective, Objective, Assessment, Plan)
- ✓ Content is readable

**Pass/Fail**: __________

---

### Scenario 2: Create Exercise Program (5 minutes)

**Steps**:
1. Log in as practitioner
2. Go to Client Management → Progress tab
3. Expand Exercise Program accordion
4. Create program (Sets/Reps only, no duration)
5. Add manual instructions
6. Create and deliver

**Check**:
- ✓ No duration field visible
- ✓ Sets and Reps fields work
- ✓ Instructions field is manual
- ✓ Success message appears
- ✓ Form resets

**Pass/Fail**: __________

---

### Scenario 3: Transfer Full Patient Record (5 minutes)

**Steps**:
1. Log in as practitioner
2. Find exercise program
3. Click Transfer
4. Check "Include Full Patient Record"
5. Review summary
6. Complete transfer

**Check**:
- ✓ Checkbox is visible
- ✓ Summary shows accurate counts
- ✓ Transfer completes
- ✓ Success message shows transferred items

**Pass/Fail**: __________

---

### Scenario 4: Request Patient History (5 minutes)

**Steps**:
1. Log in as new practitioner
2. Select client with previous practitioner
3. Click "Request Patient History"
4. Select previous practitioner
5. Submit request

**Check**:
- ✓ Request button visible
- ✓ Previous practitioners list populated
- ✓ Request submits
- ✓ Request appears in "My Requests"

**Pass/Fail**: __________

---

### Scenario 5: Approve History Request (5 minutes)

**Steps**:
1. Log in as previous practitioner
2. Go to History Requests tab
3. Find incoming request
4. Review and approve

**Check**:
- ✓ Incoming requests visible
- ✓ Transfer summary accurate
- ✓ Approval works
- ✓ Success message appears

**Pass/Fail**: __________

---

### Scenario 6: Mobile Experience (5 minutes)

**Steps**:
1. Open mobile view (DevTools → Toggle device toolbar)
2. Test client notes viewing
3. Test exercise program creation
4. Test history request

**Check**:
- ✓ Layout adapts to mobile
- ✓ Forms are usable
- ✓ Buttons are appropriately sized
- ✓ No horizontal scrolling

**Pass/Fail**: __________

---

## Quick Results Template

### Test Date: __________
### Tester: __________

| Scenario | Status | Time | Issues | Priority |
|----------|--------|------|--------|----------|
| 1. Client Views SOAP Notes | ⬜ Pass ⬜ Fail | ___ min | | |
| 2. Create Exercise Program | ⬜ Pass ⬜ Fail | ___ min | | |
| 3. Transfer Full Record | ⬜ Pass ⬜ Fail | ___ min | | |
| 4. Request History | ⬜ Pass ⬜ Fail | ___ min | | |
| 5. Approve Request | ⬜ Pass ⬜ Fail | ___ min | | |
| 6. Mobile Experience | ⬜ Pass ⬜ Fail | ___ min | | |

### Critical Issues Found
1. _________________________________
2. _________________________________
3. _________________________________

### Overall Assessment
- **Usability**: ⬜ Excellent ⬜ Good ⬜ Fair ⬜ Poor
- **Ready for Launch**: ⬜ Yes ⬜ No (explain: _______________)

---

## Common Issues to Watch For

### Critical (P0)
- ❌ Notes don't display for clients
- ❌ Exercise programs can't be created
- ❌ Transfers fail
- ❌ History requests don't work
- ❌ Data loss

### High Priority (P1)
- ⚠️ Confusing UI elements
- ⚠️ Missing important information
- ⚠️ Unclear error messages
- ⚠️ Mobile layout broken
- ⚠️ Accessibility issues

### Medium Priority (P2)
- ⚠️ Minor usability issues
- ⚠️ Inconsistent styling
- ⚠️ Performance problems

---

## Priority Fixes Guide

### If Scenario 1 Fails
**Issue**: Clients can't see notes
**Priority**: P0 - Critical
**Action**: Check RLS policies, verify data fetching

### If Scenario 2 Fails
**Issue**: Exercise program creation broken
**Priority**: P0 - Critical
**Action**: Check form validation, API calls

### If Scenario 3 Fails
**Issue**: Transfer doesn't work
**Priority**: P0 - Critical
**Action**: Verify transfer service, check database

### If Scenario 4 Fails
**Issue**: History request broken
**Priority**: P0 - Critical
**Action**: Check migration applied, verify service

### If Scenario 5 Fails
**Issue**: Approval doesn't work
**Priority**: P0 - Critical
**Action**: Verify transfer on approval, check permissions

### If Scenario 6 Fails
**Issue**: Mobile experience poor
**Priority**: P1 - High
**Action**: Review responsive CSS, test on real devices

---

## Next Steps

### If All Pass
✅ Proceed to full testing program
✅ Test with real users
✅ Document any minor improvements

### If Any Fail
1. Document issue clearly
2. Assign priority (P0/P1/P2/P3)
3. Fix critical issues immediately
4. Re-test after fixes
5. Continue with full testing

---

## Quick Accessibility Check (5 minutes)

### Keyboard Navigation
- [ ] Tab through all interactive elements
- [ ] Focus indicators visible
- [ ] Can complete tasks keyboard-only

### Screen Reader (Quick Test)
- [ ] Turn on screen reader
- [ ] Navigate to Notes page
- [ ] Verify announcements are clear

### Color Contrast (Quick Check)
- [ ] Text is readable
- [ ] Status badges distinguishable
- [ ] Error messages visible

---

## Notes Section

**Date**: __________  
**Tester**: __________  
**Environment**: __________  
**Browser**: __________  
**Device**: __________  

**Observations**:
_________________________________
_________________________________
_________________________________

**Recommendations**:
_________________________________
_________________________________
_________________________________
