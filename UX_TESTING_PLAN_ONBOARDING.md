# 🧪 UX Testing Plan - Onboarding Simplification & Profile Completion

**Version**: 1.0  
**Date**: [Current Date]  
**Focus**: Simplified Onboarding Flow & Profile Completion Gating  
**Status**: Ready for Testing

---

## 📋 Executive Summary

This testing plan validates the streamlined onboarding experience and profile completion workflow. The system has been simplified from 7 steps to 3 steps, with profile completion moved to post-onboarding. Marketplace access is now gated behind profile completion.

### Key Changes to Test
1. **Simplified Onboarding**: Reduced from 7 steps to 3 (Basic Info → Stripe → Subscription)
2. **Profile Completion Widget**: Visual progress indicator and checklist
3. **Profile Settings**: All removed fields now editable in profile
4. **Services Gating**: Marketplace locked until profile is complete

---

## 🎯 Testing Objectives

### Primary Objectives
- ✅ Verify onboarding can be completed in < 2 minutes
- ✅ Confirm profile completion widget guides users effectively
- ✅ Validate services gating prevents incomplete profiles from listing
- ✅ Ensure all removed onboarding fields are accessible in profile settings

### Secondary Objectives
- ✅ Test user understanding of the new flow
- ✅ Verify mobile responsiveness of onboarding and profile widgets
- ✅ Check accessibility of profile completion widget
- ✅ Validate error handling and edge cases

---

## 👥 User Personas

### Persona 1: New Practitioner (Sarah)
- **Background**: Sports therapist, 5 years experience, tech-savvy
- **Goal**: Sign up quickly and start accepting bookings
- **Pain Points**: Long forms, unclear requirements
- **Success Criteria**: Completes onboarding in < 2 minutes, understands next steps

### Persona 2: Returning Practitioner (Mike)
- **Background**: Osteopath, completed old onboarding, needs to update profile
- **Goal**: Complete profile to unlock services
- **Pain Points**: Unclear what's missing, where to find settings
- **Success Criteria**: Finds profile widget, completes missing fields easily

### Persona 3: Mobile User (Emma)
- **Background**: Massage therapist, primarily uses mobile
- **Goal**: Complete onboarding and profile on phone
- **Pain Points**: Small screens, complex forms
- **Success Criteria**: Can complete all steps on mobile without frustration

---

## 📊 Test Scenarios

### Scenario 1: New Practitioner Onboarding
**Objective**: Verify simplified onboarding flow works end-to-end

**Steps**:
1. Navigate to sign-up page
2. Select "Sports Therapist" role
3. Complete Step 1: Basic Info (Name, Phone, Location)
4. Complete Step 2: Stripe Connect setup
5. Complete Step 3: Subscription selection
6. Land on dashboard

**Success Criteria**:
- ✅ No bio field in Step 1
- ✅ No professional details step
- ✅ No availability step
- ✅ No services step
- ✅ Total time < 2 minutes
- ✅ Dashboard shows profile completion widget

**Expected Issues to Watch**:
- Confusion about missing fields
- Uncertainty about next steps
- Stripe Connect flow complexity

---

### Scenario 2: Profile Completion Widget Discovery
**Objective**: Verify users notice and understand the profile completion widget

**Steps**:
1. Complete simplified onboarding
2. Land on dashboard
3. Observe profile completion widget
4. Click "Fix" on incomplete items
5. Navigate to profile settings

**Success Criteria**:
- ✅ Widget visible immediately after onboarding
- ✅ Progress percentage accurate
- ✅ Checklist items clear and actionable
- ✅ "Fix" buttons navigate correctly
- ✅ Widget updates after completing items

**Expected Issues to Watch**:
- Widget not noticed
- Unclear what "Fix" does
- Progress calculation confusion

---

### Scenario 3: Profile Settings - Adding Missing Fields
**Objective**: Verify all removed onboarding fields are accessible and editable

**Steps**:
1. Navigate to Profile → Professional tab
2. Add Professional Bio (50+ characters)
3. Add Years of Experience
4. Add Professional Body & Registration Number
5. Add Qualification Type
6. Set Service Location & Radius
7. Save changes

**Success Criteria**:
- ✅ All fields present and editable
- ✅ Bio field accepts 50+ characters
- ✅ Service radius slider works
- ✅ Changes save successfully
- ✅ Widget updates after save

**Expected Issues to Watch**:
- Fields hard to find
- Unclear field requirements
- Save feedback unclear

---

### Scenario 4: Services Gating - Incomplete Profile
**Objective**: Verify services page is locked for incomplete profiles

**Steps**:
1. Complete onboarding (incomplete profile)
2. Navigate to "Services & Pricing"
3. Observe locked state
4. Review profile completion widget
5. Click "Go to Profile Settings"
6. Complete missing fields
7. Return to Services & Pricing

**Success Criteria**:
- ✅ Services page shows lock message
- ✅ Widget displayed instead of product manager
- ✅ Clear explanation of requirements
- ✅ Link to profile works
- ✅ After completion, services page unlocks
- ✅ Product manager appears

**Expected Issues to Watch**:
- Unclear why locked
- Frustration with gating
- Unclear what's missing

---

### Scenario 5: Services Gating - Complete Profile
**Objective**: Verify services page works normally for complete profiles

**Steps**:
1. Complete onboarding
2. Complete all profile fields
3. Navigate to "Services & Pricing"
4. Verify product manager is accessible
5. Create a test package

**Success Criteria**:
- ✅ No lock message
- ✅ Product manager visible
- ✅ Can create packages
- ✅ Widget not shown (or shows 100%)

**Expected Issues to Watch**:
- False positives (locked when shouldn't be)
- Widget still showing at 100%

---

### Scenario 6: Mobile Onboarding Experience
**Objective**: Verify onboarding works smoothly on mobile devices

**Steps**:
1. Open sign-up on mobile device
2. Complete all 3 onboarding steps
3. Complete profile fields
4. Navigate services page

**Success Criteria**:
- ✅ All fields accessible on mobile
- ✅ Stripe Connect works on mobile
- ✅ Profile widget responsive
- ✅ Service radius slider works on touch
- ✅ No horizontal scrolling

**Expected Issues to Watch**:
- Form fields too small
- Stripe modal issues
- Widget layout breaks

---

### Scenario 7: Error Handling - Incomplete Stripe Setup
**Objective**: Verify error handling when Stripe Connect incomplete

**Steps**:
1. Complete Step 1
2. Attempt to skip Stripe Connect
3. Try to proceed to Subscription
4. Observe error message
5. Complete Stripe Connect
6. Proceed

**Success Criteria**:
- ✅ Clear error message
- ✅ Cannot proceed without Stripe
- ✅ Error explains what's needed
- ✅ Can retry after fixing

**Expected Issues to Watch**:
- Unclear error messages
- Dead ends
- No way to retry

---

### Scenario 8: Profile Widget - Progress Updates
**Objective**: Verify widget updates in real-time as fields are completed

**Steps**:
1. Start with incomplete profile
2. Note initial completion %
3. Add bio
4. Check widget update
5. Add experience
6. Check widget update
7. Add qualification
8. Verify 100% completion

**Success Criteria**:
- ✅ Progress updates after each save
- ✅ Checklist items check off
- ✅ Percentage increases correctly
- ✅ Widget hides at 100% (or shows success)

**Expected Issues to Watch**:
- Widget not updating
- Incorrect percentage
- Items not checking off

---

### Scenario 9: Accessibility - Screen Reader
**Objective**: Verify profile widget is accessible to screen readers

**Steps**:
1. Enable screen reader (NVDA/JAWS)
2. Navigate to dashboard
3. Listen to widget announcement
4. Navigate through checklist
5. Activate "Fix" buttons

**Success Criteria**:
- ✅ Widget announced properly
- ✅ Progress percentage read
- ✅ Checklist items announced
- ✅ Buttons have accessible labels
- ✅ Navigation logical

**Expected Issues to Watch**:
- Missing ARIA labels
- Unclear announcements
- Navigation order issues

---

### Scenario 10: Edge Case - Already Complete Profile
**Objective**: Verify system handles users who already completed old onboarding

**Steps**:
1. Log in as existing practitioner (complete profile)
2. Navigate to dashboard
3. Check for widget
4. Navigate to services
5. Verify no gating

**Success Criteria**:
- ✅ Widget not shown (or shows 100%)
- ✅ Services accessible
- ✅ No false locks
- ✅ Profile fields still editable

**Expected Issues to Watch**:
- False locks on complete profiles
- Widget showing incorrectly

---

## 📱 Device & Browser Testing

### Desktop
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

### Mobile
- iOS Safari (iPhone 12+)
- Android Chrome (Samsung Galaxy S21+)
- iPad Safari

### Tablet
- iPad (Safari)
- Android Tablet (Chrome)

---

## ♿ Accessibility Testing

### Screen Readers
- NVDA (Windows)
- JAWS (Windows)
- VoiceOver (macOS/iOS)

### Keyboard Navigation
- Tab through all interactive elements
- Enter/Space to activate buttons
- Escape to close modals

### Color Contrast
- WCAG AA compliance
- Widget text readable
- Progress bar visible

---

## ⏱️ Testing Schedule

### Phase 1: Quick Validation (Day 1)
- Scenarios 1, 2, 4 (Core flows)
- 3-5 testers
- 2 hours

### Phase 2: Comprehensive Testing (Day 2-3)
- All scenarios
- 5-8 testers
- 4-6 hours

### Phase 3: Edge Cases & Accessibility (Day 4)
- Scenarios 7, 8, 9, 10
- 2-3 testers
- 2-3 hours

---

## 📈 Success Metrics

### Quantitative
- Onboarding completion time: **Target < 2 minutes**
- Profile completion rate: **Target > 80% within 24 hours**
- Services unlock rate: **Target > 90% after profile complete**
- Error rate: **Target < 5%**

### Qualitative
- User satisfaction: **Target > 4/5**
- Clarity of next steps: **Target > 4/5**
- Widget usefulness: **Target > 4/5**

---

## 🐛 Known Issues to Watch

1. **Stripe Connect Flow**: May be complex for non-tech users
2. **Widget Visibility**: May be missed if not prominent enough
3. **Profile Field Discovery**: Users may not know where to find fields
4. **Gating Frustration**: Some users may find gating restrictive

---

## 📝 Reporting Template

After each test session, document:
- **Tester**: Name/ID
- **Scenario**: Number and name
- **Device**: Browser/OS
- **Completion**: ✅ Pass / ⚠️ Partial / ❌ Fail
- **Time**: Duration
- **Issues**: List of problems found
- **Severity**: Critical / High / Medium / Low
- **Screenshots**: Attach relevant images

---

## 🔄 Next Steps

1. Review this plan with stakeholders
2. Set up test data (see `UX_TEST_DATA_SETUP.md`)
3. Recruit testers
4. Run Phase 1 quick validation
5. Iterate based on findings
6. Run comprehensive testing
7. Document findings (see `UX_TEST_SCRIPTS.md`)

---

**Ready to start?** See `UX_TESTING_QUICK_START.md` for immediate testing, or `UX_TEST_SCRIPTS.md` for detailed scripts.



