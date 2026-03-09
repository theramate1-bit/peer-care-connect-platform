# UX Testing Quick Start: Onboarding Simplification

**Get Started in 30 Minutes**  
**Version**: 1.0

---

## ⚡ Quick Validation (30 Minutes)

This quick start guide helps you validate the core functionality in 30 minutes. For comprehensive testing, use the full test plan.

---

## 🎯 Essential Test Scenarios

### Test 1: Onboarding Speed (5 minutes)
**Goal**: Verify onboarding is faster

**Steps**:
1. Sign up as new practitioner
2. Complete Step 1 (Basic Info)
3. Complete Step 2 (Stripe Connect)
4. Complete Step 3 (Subscription)
5. Note total time

**Success**: < 5 minutes total

**Check**:
- [ ] No bio field in Step 1
- [ ] No professional details step
- [ ] No availability step
- [ ] Onboarding completes

---

### Test 2: Widget Display (5 minutes)
**Goal**: Verify widget appears and works

**Steps**:
1. Complete onboarding (incomplete profile)
2. Check dashboard for widget
3. Review checklist items
4. Click one "Fix" button
5. Verify navigation

**Success**: Widget visible, buttons work, navigation correct

**Check**:
- [ ] Widget appears
- [ ] Progress shows
- [ ] Checklist visible
- [ ] "Fix" buttons work
- [ ] Navigation correct

---

### Test 3: Services Gating (5 minutes)
**Goal**: Verify services are locked

**Steps**:
1. With incomplete profile, go to Services & Pricing
2. Verify lock message
3. Verify widget shown
4. Click "Go to Profile Settings"
5. Verify navigation

**Success**: Services locked, clear message, navigation works

**Check**:
- [ ] Lock message visible
- [ ] Widget displayed
- [ ] ProductManager blocked
- [ ] Navigation button works

---

### Test 4: Profile Completion (10 minutes)
**Goal**: Verify profile fields work

**Steps**:
1. Go to Profile → Professional
2. Fill in Bio (50+ chars)
3. Add Experience Years
4. Select Qualification Type
5. Add Location and Radius
6. Save and verify widget updates

**Success**: All fields save, widget updates

**Check**:
- [ ] All fields present
- [ ] Fields save correctly
- [ ] Widget updates
- [ ] Progress increases

---

### Test 5: Services Unlock (5 minutes)
**Goal**: Verify services unlock after completion

**Steps**:
1. Complete all profile requirements
2. Set up availability (at least one day)
3. Verify widget shows 100%
4. Go to Services & Pricing
5. Verify ProductManager accessible

**Success**: Services unlock, can create packages

**Check**:
- [ ] Widget shows 100%
- [ ] Services page unlocked
- [ ] ProductManager accessible
- [ ] Can create services

---

## 📋 Quick Results Template

### Test Results: [Date]

#### Test 1: Onboarding Speed
- **Time**: [ ] minutes
- **Status**: [ ] Pass [ ] Fail
- **Issues**: [Notes]

#### Test 2: Widget Display
- **Status**: [ ] Pass [ ] Fail
- **Issues**: [Notes]

#### Test 3: Services Gating
- **Status**: [ ] Pass [ ] Fail
- **Issues**: [Notes]

#### Test 4: Profile Completion
- **Status**: [ ] Pass [ ] Fail
- **Issues**: [Notes]

#### Test 5: Services Unlock
- **Status**: [ ] Pass [ ] Fail
- **Issues**: [Notes]

### Overall
- **Critical Issues**: [Count]
- **Blockers**: [List]
- **Ready for User Testing**: [ ] Yes [ ] No

---

## 🚨 Common Issues to Watch

### Issue 1: Widget Not Updating
**Symptom**: Widget doesn't update after completing items  
**Check**: Real-time subscription, database save  
**Fix**: Refresh page, check console errors

### Issue 2: Services Not Unlocking
**Symptom**: Services still locked after completion  
**Check**: All requirements met, widget shows 100%  
**Fix**: Verify all checks pass, refresh page

### Issue 3: Mobile Buttons Hidden
**Symptom**: "Fix" buttons not visible on mobile  
**Check**: CSS hover-only styles  
**Fix**: Buttons should always be visible on mobile

### Issue 4: Fields Not Saving
**Symptom**: Profile fields don't persist  
**Check**: Database save, network errors  
**Fix**: Check console, verify database

### Issue 5: Availability Not Detected
**Symptom**: Widget shows availability incomplete  
**Check**: Availability saved, at least one day enabled  
**Fix**: Verify `practitioner_availability` table

---

## 🎯 Priority Fixes

### Critical (Fix Immediately)
1. Services not unlocking when profile complete
2. Widget not updating in real-time
3. Fields not saving to database
4. Mobile buttons not visible

### High (Fix Before User Testing)
1. Navigation goes to wrong section
2. Error messages unclear
3. Performance issues (slow loads)
4. Accessibility issues

### Medium (Fix in Next Iteration)
1. UI polish and styling
2. Additional guidance text
3. Enhanced error messages
4. Performance optimizations

---

## ✅ Quick Validation Checklist

- [ ] Onboarding completes in < 5 minutes
- [ ] Widget appears for incomplete profiles
- [ ] Widget updates in real-time
- [ ] Services locked for incomplete profiles
- [ ] Services unlock after completion
- [ ] All profile fields save correctly
- [ ] Mobile experience works
- [ ] No critical errors

---

## 📞 Next Steps

### If All Tests Pass
1. ✅ Proceed to full user testing
2. ✅ Use detailed test scripts
3. ✅ Schedule moderated sessions

### If Issues Found
1. ❌ Fix critical issues first
2. ❌ Re-run quick validation
3. ❌ Document fixes
4. ✅ Then proceed to user testing

---

## 📚 Full Documentation

For comprehensive testing:
- **Full Plan**: `UX_TESTING_PLAN_ONBOARDING_SIMPLIFICATION.md`
- **Test Scripts**: `UX_TESTING_SCRIPTS_ONBOARDING_SIMPLIFICATION.md`
- **Checklist**: `UX_TESTING_CHECKLIST_ONBOARDING_SIMPLIFICATION.md`
- **Test Data**: `UX_TEST_DATA_SETUP_ONBOARDING_SIMPLIFICATION.md`

---

**Quick Start Complete**: If all tests pass, you're ready for full user testing!



