# Client Onboarding UX Testing - Quick Start

**Version**: 1.0  
**Time**: ~30 minutes  
**Purpose**: Rapid validation of critical changes

---

## 🚀 Get Started in 5 Minutes

### Step 1: Setup (2 minutes)
1. Open browser in incognito/private mode
2. Clear cache
3. Navigate to sign-up page

### Step 2: Quick Test (10 minutes)
Run the 3 critical scenarios below

### Step 3: Document Findings (5 minutes)
Note any issues found

---

## ✅ Critical Test Scenarios

### Test 1: Simplified Step 2 (5 minutes)

**What to Test**: Verify Step 2 only shows First Name and Last Name

**Steps**:
1. Complete Step 1 (Phone & Location)
2. **CRITICAL CHECK**: Look at Step 2
   - ✅ Should see: First Name field
   - ✅ Should see: Last Name field
   - ❌ Should NOT see: "Primary Health Goal"
   - ❌ Should NOT see: "Preferred Therapy Types"
3. Complete Step 2
4. Check completion message

**Expected Result**:
- ✅ Only 2 fields visible
- ✅ Completion message shows all 4 features

**If Failed**: Note which removed fields are still visible

---

### Test 2: Completion Message (3 minutes)

**What to Test**: Verify completion message displays correctly

**Steps**:
1. Complete onboarding Steps 1 & 2
2. **CRITICAL CHECK**: Read completion message
   - ✅ Should see: "Account setup complete!"
   - ✅ Should see: "Start finding booking sessions"
   - ✅ Should see: "Track your progress"
   - ✅ Should see: "Ask the search for therapists"
   - ✅ Should see: "Browse on the marketplace"
3. Verify all 4 features listed

**Expected Result**:
- ✅ All 4 features visible
- ✅ Message is clear and readable

**If Failed**: Note which features are missing

---

### Test 3: Booking Flow Updates (5 minutes)

**What to Test**: Verify hourly rate removed and cancellation policy fixed

**Steps**:
1. Navigate to marketplace
2. **CRITICAL CHECK**: View practitioner card
   - ❌ Should NOT see: Hourly rate
   - ✅ Should see: Session count (or other info)
3. Open booking flow
4. **CRITICAL CHECK**: Check pricing
   - ❌ Should NOT see: Hourly rate anywhere
   - ✅ Should see: Package prices only
5. Go to payment/review step
6. **CRITICAL CHECK**: Read cancellation policy
   - ❌ Should NOT see: Duplicate "2+ days" text
   - ✅ Should see: Clear time periods (days or hours)

**Expected Result**:
- ✅ No hourly rate displayed
- ✅ Cancellation policy clear and no duplicates

**If Failed**: Note where hourly rate appears or policy issues

---

## 📊 Quick Results Template

```
Quick Test Results
Date: _____
Tester: _____

Test 1: Simplified Step 2
- Only 2 fields visible: Yes / No
- Removed fields visible: Yes / No
- Status: ✅ Pass / ❌ Fail
- Issues: _____

Test 2: Completion Message
- All 4 features visible: Yes / No
- Message clear: Yes / No
- Status: ✅ Pass / ❌ Fail
- Issues: _____

Test 3: Booking Flow Updates
- Hourly rate removed: Yes / No
- Cancellation policy fixed: Yes / No
- Status: ✅ Pass / ❌ Fail
- Issues: _____

Overall Status: ✅ Pass / ❌ Fail / ⚠️ Partial

Critical Issues Found:
1. _____
2. _____
```

---

## 🔍 Common Issues to Watch For

### Issue 1: Removed Fields Still Visible
**Symptom**: Step 2 shows "Primary Health Goal" or "Preferred Therapy Types"  
**Severity**: Critical  
**Fix**: Check `Onboarding.tsx` - ensure fields removed from UI

### Issue 2: Completion Message Missing Features
**Symptom**: Completion message doesn't show all 4 features  
**Severity**: Critical  
**Fix**: Check `Onboarding.tsx` - verify completion message content

### Issue 3: Hourly Rate Still Displayed
**Symptom**: Practitioner card or booking flow shows hourly rate  
**Severity**: Critical  
**Fix**: Check `PractitionerCard.tsx` - ensure hourly rate removed

### Issue 4: Cancellation Policy Duplicates
**Symptom**: Policy shows "2+ days" multiple times  
**Severity**: High  
**Fix**: Check `BookingFlow.tsx` and `GuestBookingFlow.tsx` - verify policy formatting

### Issue 5: Validation Errors for Removed Fields
**Symptom**: Errors appear for primaryGoal or preferredTherapyTypes  
**Severity**: Critical  
**Fix**: Check `onboarding-utils.ts` and `onboarding-validation.ts` - remove validation

---

## ⚡ Priority Fixes Guide

### If Test 1 Fails (Step 2 shows removed fields)
1. **Immediate**: Check `Onboarding.tsx` line 618-639
2. Verify fields removed from formData state
3. Verify fields removed from UI
4. Re-test

### If Test 2 Fails (Completion message issues)
1. **Immediate**: Check `Onboarding.tsx` line 623-637
2. Verify all 4 features in message
3. Check message styling
4. Re-test

### If Test 3 Fails (Booking flow issues)
1. **Immediate**: Check `PractitionerCard.tsx` line 175
2. Check `BookingFlow.tsx` and `GuestBookingFlow.tsx` cancellation policy
3. Verify hourly rate removed from all locations
4. Re-test

---

## 📱 Quick Mobile Test (Optional - 5 minutes)

### Mobile Quick Check
1. Open sign-up on mobile device
2. Complete Step 1
3. **CRITICAL**: Check Step 2 - only 2 fields?
4. Complete Step 2
5. Check completion message readable

**Expected**: All works on mobile, only 2 fields visible

---

## ✅ Success Criteria

### Must Pass (Critical)
- ✅ Step 2 shows only First Name and Last Name
- ✅ Completion message shows all 4 features
- ✅ No hourly rate in booking flows
- ✅ Cancellation policy has no duplicates

### Should Pass (High Priority)
- ✅ Mobile experience works
- ✅ No validation errors for removed fields
- ✅ Forms submit correctly

---

## 🚨 If Critical Issues Found

### Immediate Actions
1. **Document**: Note exact issue and location
2. **Screenshot**: Capture the issue
3. **Reproduce**: Verify steps to reproduce
4. **Priority**: Mark as Critical
5. **Fix**: Address immediately or escalate

### Escalation
- If critical issues found, escalate to development team
- Provide detailed reproduction steps
- Include screenshots
- Note browser/device information

---

## 📝 Next Steps After Quick Test

### If All Tests Pass
- ✅ Proceed to full testing (see `CLIENT_ONBOARDING_UX_TESTING_PLAN.md`)
- ✅ Set up comprehensive test data
- ✅ Run full test scenarios

### If Tests Fail
- ❌ Fix critical issues first
- ❌ Re-run quick test after fixes
- ❌ Proceed to full testing once critical issues resolved

---

## 💡 Tips for Quick Testing

1. **Focus on Critical**: Only test the 3 critical scenarios
2. **Be Fast**: Don't overthink, just verify functionality
3. **Document Issues**: Note any problems immediately
4. **Screenshot**: Capture any failures
5. **Move On**: If critical issues found, stop and fix first

---

**Time Estimate**: 30 minutes total
- Setup: 2 minutes
- Test 1: 5 minutes
- Test 2: 3 minutes
- Test 3: 5 minutes
- Mobile test: 5 minutes (optional)
- Documentation: 10 minutes

**Ready?** Start with Test 1 and work through quickly!



