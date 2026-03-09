# UX Testing Plan: Onboarding Simplification & Profile Completion Gating

**Date**: January 2025  
**Version**: 1.0  
**Status**: Ready for Testing

---

## 📋 Overview

This testing plan covers the simplified practitioner onboarding flow and profile completion gating system. The changes reduce onboarding friction while ensuring quality marketplace entries through post-onboarding profile completion requirements.

### Key Changes Tested
1. **Simplified Onboarding**: Reduced from 6 steps to 3 steps (Basic Info → Stripe Connect → Subscription)
2. **Profile Completion Gating**: Services & Pricing locked until profile is complete
3. **Profile Completion Widget**: Visual progress indicator and actionable checklist
4. **Marketplace Access**: Profile completion required before creating services

---

## 🎯 Testing Objectives

### Primary Goals
1. Verify onboarding completion time is reduced by 2-3 minutes
2. Confirm practitioners can complete onboarding without detailed professional information
3. Validate profile completion gating prevents marketplace access until requirements met
4. Test Profile Completion Widget guides users effectively
5. Ensure all moved fields are accessible in Profile settings

### Success Metrics
- **Onboarding Time**: < 5 minutes (down from 8-10 minutes)
- **Completion Rate**: > 85% of practitioners complete onboarding
- **Profile Completion**: > 70% complete profile within 24 hours
- **Task Success Rate**: > 90% for all critical paths
- **User Satisfaction**: > 4.0/5.0 rating

---

## 👥 User Personas

### Persona 1: New Practitioner (Sarah)
- **Age**: 32
- **Role**: Sports Therapist
- **Tech Comfort**: Medium
- **Goal**: Quick signup, complete details later
- **Pain Points**: Long forms, unclear requirements

### Persona 2: Returning Practitioner (Mike)
- **Age**: 45
- **Role**: Osteopath
- **Tech Comfort**: Low
- **Goal**: Get started quickly, add details when needed
- **Pain Points**: Information overload, time constraints

### Persona 3: Tech-Savvy Practitioner (Alex)
- **Age**: 28
- **Role**: Massage Therapist
- **Tech Comfort**: High
- **Goal**: Fast onboarding, understands gating concept
- **Pain Points**: Unnecessary steps, unclear navigation

---

## 📝 Test Scenarios

### Scenario 1: New Practitioner Onboarding
**Objective**: Verify simplified onboarding flow works correctly

**Steps**:
1. Navigate to sign-up page
2. Select "Sports Therapist" role
3. Complete Step 1: Basic Info (Name, Phone, Location)
4. Complete Step 2: Stripe Connect setup
5. Complete Step 3: Subscription selection
6. Verify onboarding completion

**Success Criteria**:
- ✅ No professional bio required in Step 1
- ✅ No professional details step (Step 2 removed)
- ✅ No availability setup step (Step 3 removed)
- ✅ Onboarding completes in < 5 minutes
- ✅ User redirected to dashboard after completion

**What to Observe**:
- Time to complete each step
- Confusion points or hesitation
- Error messages or validation issues
- User satisfaction with speed

---

### Scenario 2: Profile Completion Widget Display
**Objective**: Verify widget appears and guides users correctly

**Steps**:
1. Complete simplified onboarding
2. Navigate to dashboard
3. Check for Profile Completion Widget
4. Review checklist items
5. Click "Fix" button on incomplete item
6. Verify navigation to correct profile section

**Success Criteria**:
- ✅ Widget appears for practitioners with incomplete profiles
- ✅ Progress percentage displays correctly
- ✅ All required items listed in checklist
- ✅ "Fix" buttons navigate to correct sections
- ✅ Widget updates in real-time as items completed

**What to Observe**:
- Widget visibility and prominence
- User understanding of requirements
- Navigation accuracy
- Real-time update behavior

---

### Scenario 3: Services Gating - Incomplete Profile
**Objective**: Verify services page is locked for incomplete profiles

**Steps**:
1. Complete simplified onboarding (incomplete profile)
2. Navigate to "Services & Pricing" page
3. Observe lock message and widget
4. Attempt to access ProductManager (should be blocked)
5. Review required fields in widget

**Success Criteria**:
- ✅ Services page shows lock message
- ✅ Profile Completion Widget displayed
- ✅ ProductManager not accessible
- ✅ Clear message about requirements
- ✅ "Go to Profile Settings" button works

**What to Observe**:
- User reaction to gating
- Understanding of requirements
- Willingness to complete profile
- Confusion or frustration levels

---

### Scenario 4: Profile Completion Flow
**Objective**: Verify all moved fields are accessible and save correctly

**Steps**:
1. Navigate to Profile → Professional tab
2. Fill in Professional Bio (min 50 chars)
3. Add Years of Experience
4. Select Qualification Type
5. Add Service Location
6. Set Service Radius
7. Save profile
8. Verify Profile Completion Widget updates

**Success Criteria**:
- ✅ All fields from removed onboarding steps are present
- ✅ Fields save correctly to database
- ✅ Widget updates immediately after save
- ✅ Progress percentage increases
- ✅ No data loss

**What to Observe**:
- Field discoverability
- Save success/failure
- Real-time updates
- User satisfaction with organization

---

### Scenario 5: Availability Setup (Post-Onboarding)
**Objective**: Verify availability can be set up after onboarding

**Steps**:
1. Complete onboarding
2. Navigate to Profile → Services tab (or /scheduler)
3. Set up working hours
4. Enable at least one day
5. Save availability
6. Verify Profile Completion Widget updates

**Success Criteria**:
- ✅ Availability accessible from profile
- ✅ Working hours save correctly
- ✅ Widget "Availability Schedule" check updates
- ✅ No errors during save

**What to Observe**:
- Ease of finding availability settings
- Save process clarity
- Widget update timing

---

### Scenario 6: Services Access After Profile Completion
**Objective**: Verify services unlock after profile completion

**Steps**:
1. Complete all profile requirements
2. Verify Profile Completion Widget shows 100%
3. Navigate to "Services & Pricing"
4. Verify ProductManager is accessible
5. Create a test service package
6. Verify service appears in marketplace

**Success Criteria**:
- ✅ Widget shows 100% completion
- ✅ Services page no longer shows lock
- ✅ ProductManager fully accessible
- ✅ Services can be created
- ✅ Services appear in marketplace

**What to Observe**:
- Unlock behavior
- User satisfaction with access
- Service creation flow
- Marketplace visibility

---

### Scenario 7: Mobile Onboarding Experience
**Objective**: Test simplified onboarding on mobile devices

**Steps**:
1. Open app on mobile device
2. Complete onboarding flow
3. Test Profile Completion Widget on mobile
4. Test profile completion on mobile
5. Test services gating on mobile

**Success Criteria**:
- ✅ All steps work on mobile
- ✅ Widget displays correctly on small screens
- ✅ "Fix" buttons always visible (not hover-only)
- ✅ Forms are mobile-friendly
- ✅ Navigation works on touch devices

**What to Observe**:
- Mobile UI/UX issues
- Touch interaction problems
- Form usability on small screens
- Navigation clarity

---

### Scenario 8: Error Handling & Edge Cases
**Objective**: Test error scenarios and edge cases

**Steps**:
1. Attempt to access services with incomplete profile
2. Try to save profile with invalid data
3. Test with missing availability
4. Test with partial profile completion
5. Test widget with null/empty data

**Success Criteria**:
- ✅ Clear error messages
- ✅ Graceful handling of edge cases
- ✅ No crashes or broken states
- ✅ Helpful guidance provided

**What to Observe**:
- Error message clarity
- Recovery paths
- User frustration levels
- System stability

---

### Scenario 9: Real-Time Updates
**Objective**: Verify real-time synchronization works

**Steps**:
1. Open profile in two browser tabs
2. Update profile in Tab 1
3. Verify Tab 2 updates automatically
4. Check Profile Completion Widget updates
5. Verify services gating updates

**Success Criteria**:
- ✅ Changes sync across tabs
- ✅ Widget updates without refresh
- ✅ Services gating updates immediately
- ✅ No stale data displayed

**What to Observe**:
- Update latency
- Sync reliability
- User awareness of updates

---

### Scenario 10: Accessibility Testing
**Objective**: Verify accessibility compliance

**Steps**:
1. Test with screen reader (NVDA/JAWS)
2. Test keyboard navigation
3. Test color contrast
4. Test focus indicators
5. Test ARIA labels

**Success Criteria**:
- ✅ Screen reader announces all elements
- ✅ Keyboard navigation works throughout
- ✅ Color contrast meets WCAG AA
- ✅ Focus indicators visible
- ✅ ARIA labels present

**What to Observe**:
- Screen reader experience
- Keyboard navigation flow
- Visual accessibility
- Overall accessibility score

---

## 🔍 Testing Types

### 1. Usability Testing
- **Moderated**: 5-8 participants
- **Unmoderated**: 10-15 participants
- **Duration**: 30-45 minutes per session
- **Focus**: Task completion, confusion points, satisfaction

### 2. Accessibility Testing
- **Screen Readers**: NVDA, JAWS, VoiceOver
- **Keyboard Navigation**: Full flow testing
- **Color Contrast**: WCAG AA compliance
- **Focus Management**: Tab order and indicators

### 3. Responsive Testing
- **Devices**: iPhone, Android, Tablet, Desktop
- **Browsers**: Chrome, Safari, Firefox, Edge
- **Screen Sizes**: 320px - 2560px
- **Orientations**: Portrait and Landscape

### 4. Performance Testing
- **Load Times**: Page load < 2s
- **Interaction Response**: < 100ms
- **Real-time Updates**: < 500ms latency
- **Database Queries**: < 200ms

### 5. Error Handling Testing
- **Validation Errors**: Clear messages
- **Network Errors**: Graceful degradation
- **Edge Cases**: Null/empty data handling
- **Recovery Paths**: User guidance

---

## ✅ Testing Checklist

### Onboarding Flow
- [ ] Step 1: Basic Info only (Name, Phone, Location)
- [ ] No Professional Bio in Step 1
- [ ] No Professional Details step
- [ ] No Availability step
- [ ] Step 2: Stripe Connect works
- [ ] Step 3: Subscription selection works
- [ ] Onboarding completes successfully
- [ ] Redirect to dashboard works

### Profile Completion Widget
- [ ] Widget appears for incomplete profiles
- [ ] Progress percentage displays
- [ ] Checklist items are accurate
- [ ] "Fix" buttons navigate correctly
- [ ] Widget updates in real-time
- [ ] Widget hides at 100% completion
- [ ] Mobile: Buttons always visible (not hover-only)

### Services Gating
- [ ] Lock message displays for incomplete profiles
- [ ] Widget shown on services page
- [ ] ProductManager not accessible when locked
- [ ] "Go to Profile Settings" button works
- [ ] Services unlock after profile completion
- [ ] No bypass methods available

### Profile Fields
- [ ] All moved fields present in Profile → Professional
- [ ] Bio field (min 50 chars)
- [ ] Experience Years
- [ ] Qualification Type
- [ ] Professional Body
- [ ] Registration Number
- [ ] Service Location
- [ ] Service Radius
- [ ] Professional Statement (therapist_profiles)
- [ ] Treatment Philosophy (therapist_profiles)
- [ ] All fields save correctly

### Availability
- [ ] Accessible from Profile → Services or /scheduler
- [ ] Working hours save correctly
- [ ] Widget updates when availability set
- [ ] At least one day must be enabled

### Real-Time Updates
- [ ] Profile changes sync across tabs
- [ ] Widget updates without refresh
- [ ] Services gating updates immediately
- [ ] No stale data

### Mobile Experience
- [ ] Onboarding works on mobile
- [ ] Widget displays correctly
- [ ] "Fix" buttons visible (not hover-only)
- [ ] Forms are mobile-friendly
- [ ] Navigation works on touch

### Accessibility
- [ ] Screen reader compatible
- [ ] Keyboard navigation works
- [ ] Color contrast meets WCAG AA
- [ ] Focus indicators visible
- [ ] ARIA labels present

---

## 📊 Success Metrics

### Quantitative Metrics
- **Onboarding Time**: Target < 5 minutes (baseline: 8-10 minutes)
- **Completion Rate**: Target > 85%
- **Profile Completion Rate**: Target > 70% within 24 hours
- **Task Success Rate**: Target > 90%
- **Error Rate**: Target < 5%

### Qualitative Metrics
- **User Satisfaction**: Target > 4.0/5.0
- **Ease of Use**: Target > 4.0/5.0
- **Clarity of Requirements**: Target > 4.0/5.0
- **Perceived Speed**: Target "Much Faster" or "Faster"

---

## 📅 Testing Schedule

### Week 1: Internal Testing
- **Days 1-2**: Developer testing and bug fixes
- **Days 3-4**: QA testing and edge cases
- **Day 5**: Internal review and documentation

### Week 2: User Testing
- **Days 1-3**: Moderated usability testing (5-8 participants)
- **Days 4-5**: Unmoderated testing (10-15 participants)

### Week 3: Analysis & Iteration
- **Days 1-2**: Data analysis and report generation
- **Days 3-4**: Bug fixes and improvements
- **Day 5**: Final validation testing

---

## 🐛 Known Issues & Limitations

### Current Limitations
- Profile Completion Widget requires page refresh in some edge cases
- Real-time updates may have slight latency (< 500ms)
- Mobile "Fix" buttons always visible (by design, not a bug)

### Areas for Future Improvement
- AI-powered service creation (roadmap item)
- Enhanced profile completion guidance
- Progressive disclosure for profile fields

---

## 📚 Related Documentation

- `UX_TEST_SCRIPTS_ONBOARDING_SIMPLIFICATION.md` - Detailed test scripts
- `UX_TESTING_CHECKLIST_ONBOARDING_SIMPLIFICATION.md` - Quick reference checklist
- `UX_TESTING_QUICK_START_ONBOARDING_SIMPLIFICATION.md` - Quick start guide
- `UX_TEST_DATA_SETUP_ONBOARDING_SIMPLIFICATION.md` - Test data setup
- `UX_TESTING_README_ONBOARDING_SIMPLIFICATION.md` - Overview and navigation

---

## ✅ Sign-Off

**Prepared by**: [Your Name]  
**Reviewed by**: [Reviewer Name]  
**Approved by**: [Approver Name]  
**Date**: [Date]

---

**Next Steps**: Proceed to `UX_TEST_SCRIPTS_ONBOARDING_SIMPLIFICATION.md` for detailed test execution scripts.



