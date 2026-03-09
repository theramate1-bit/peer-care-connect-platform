# Client Onboarding UX Testing Checklist

**Version**: 1.0  
**Quick Reference**: Use this checklist during testing sessions

---

## ✅ Pre-Test Setup

### Environment
- [ ] Browser cache cleared
- [ ] Incognito/private window
- [ ] Screen recording started (if applicable)
- [ ] Test data ready
- [ ] Test accounts created

### Test Data
- [ ] Test practitioner account
- [ ] Test client account (if needed)
- [ ] Packages created for testing
- [ ] Availability set up

---

## 📱 Scenario 1: New Client Onboarding

### Step 1: Phone & Location
- [ ] Phone field accessible
- [ ] Location picker works
- [ ] Validation works (empty field)
- [ ] Can proceed to Step 2
- [ ] Time: _____ seconds

### Step 2: Personal Information
- [ ] **CRITICAL**: Only First Name field visible
- [ ] **CRITICAL**: Only Last Name field visible
- [ ] **CRITICAL**: NO "Primary Health Goal" field
- [ ] **CRITICAL**: NO "Preferred Therapy Types" section
- [ ] Validation works (empty fields)
- [ ] Can proceed after filling both fields
- [ ] Time: _____ seconds

### Completion Message
- [ ] Message appears after Step 2
- [ ] Shows "Account setup complete!"
- [ ] Lists "Start finding booking sessions"
- [ ] Lists "Track your progress"
- [ ] Lists "Ask the search for therapists"
- [ ] Lists "Browse on the marketplace"
- [ ] All 4 features visible
- [ ] Message is readable

### Navigation
- [ ] Can proceed to dashboard
- [ ] No errors during navigation
- [ ] Dashboard loads correctly

### Overall
- [ ] Total time: _____ seconds
- [ ] User satisfaction: _____ / 5
- [ ] Status: ✅ Pass / ❌ Fail

---

## 📋 Scenario 2: Completion Message Verification

### Message Display
- [ ] Message appears immediately
- [ ] Green background box visible
- [ ] CheckCircle icon visible
- [ ] Text is readable
- [ ] Good contrast

### Features List
- [ ] Feature 1: "Start finding booking sessions"
- [ ] Feature 2: "Track your progress"
- [ ] Feature 3: "Ask the search for therapists"
- [ ] Feature 4: "Browse on the marketplace"
- [ ] All features in list format
- [ ] Features are clear and understandable

### Visual Design
- [ ] Styling matches design
- [ ] Spacing appropriate
- [ ] Typography readable
- [ ] Colors accessible

### Overall
- [ ] Status: ✅ Pass / ❌ Fail

---

## 💰 Scenario 3: Booking Flow - Hourly Rate Removal

### Practitioner Card
- [ ] **CRITICAL**: NO hourly rate displayed
- [ ] **CRITICAL**: Session count displayed (if applicable)
- [ ] No "£X per hour" text
- [ ] Card displays correctly

### Booking Flow
- [ ] **CRITICAL**: NO hourly rate in booking flow
- [ ] Only package prices shown
- [ ] Pricing is clear
- [ ] No hourly rate calculations

### Service Selection
- [ ] Services show package prices
- [ ] Duration shown (e.g., "60 minutes")
- [ ] Price shown (e.g., "£50")
- [ ] No hourly rate mentioned

### Overall
- [ ] Status: ✅ Pass / ❌ Fail

---

## 📄 Scenario 4: Cancellation Policy Display

### Policy Location
- [ ] Policy visible in booking flow
- [ ] Located in payment/review step
- [ ] Easy to find

### Policy Content
- [ ] **CRITICAL**: NO duplicate "2+ days" text
- [ ] Time periods clearly formatted
- [ ] Proper day/hour conversion (>= 24 hours = days)
- [ ] Consistent units (all days or all hours)
- [ ] Easy to read

### Policy Logic
- [ ] Full refund period clear
- [ ] Partial refund period clear
- [ ] No refund period clear
- [ ] User can understand policy

### Overall
- [ ] Status: ✅ Pass / ❌ Fail

---

## 📱 Scenario 5: Mobile Onboarding

### Step 1 (Mobile)
- [ ] Page loads on mobile
- [ ] No horizontal scrolling
- [ ] Phone input works
- [ ] Location picker works
- [ ] Keyboard appears correctly
- [ ] Touch targets appropriate size
- [ ] Time: _____ seconds

### Step 2 (Mobile)
- [ ] **CRITICAL**: Only 2 fields visible
- [ ] Fields accessible on mobile
- [ ] Keyboard works correctly
- [ ] Touch targets appropriate
- [ ] No usability issues
- [ ] Time: _____ seconds

### Completion Message (Mobile)
- [ ] Message readable on small screen
- [ ] All features visible
- [ ] No scrolling needed
- [ ] Text size appropriate

### Overall Mobile
- [ ] Rating: _____ / 5
- [ ] Status: ✅ Pass / ❌ Fail

---

## ✅ Scenario 6: Validation Error Handling

### Step 1 Validation
- [ ] Empty phone shows error
- [ ] Empty location shows error
- [ ] Error messages clear
- [ ] Can proceed after fixing

### Step 2 Validation
- [ ] Empty first name shows error
- [ ] Empty last name shows error
- [ ] **CRITICAL**: NO errors for removed fields
- [ ] Error messages helpful
- [ ] Can proceed after fixing

### Overall
- [ ] Status: ✅ Pass / ❌ Fail

---

## 🔄 Scenario 7: Returning User Experience

### Existing User
- [ ] Existing user not prompted to re-onboard
- [ ] Dashboard accessible immediately
- [ ] No errors or warnings
- [ ] User experience unchanged

### Overall
- [ ] Status: ✅ Pass / ❌ Fail

---

## ♿ Scenario 8: Accessibility Testing

### Screen Reader
- [ ] All fields announced correctly
- [ ] Labels read properly
- [ ] Buttons announced
- [ ] Completion message read
- [ ] Navigation works

### Keyboard Navigation
- [ ] All fields keyboard accessible
- [ ] Tab order logical
- [ ] Can complete entire flow with keyboard
- [ ] Focus indicators visible

### Color Contrast
- [ ] Text meets WCAG AA (4.5:1)
- [ ] Large text meets WCAG AA (3:1)
- [ ] Interactive elements have sufficient contrast
- [ ] Error states visible

### Focus Indicators
- [ ] Focus visible on all interactive elements
- [ ] Focus style is clear
- [ ] Focus order logical

### Overall
- [ ] Status: ✅ Pass / ❌ Fail

---

## 🔍 Scenario 9: Edge Cases

### Long Names
- [ ] Very long first name handled
- [ ] Very long last name handled
- [ ] No layout breaking
- [ ] Validation works

### Special Characters
- [ ] Special characters accepted (if valid)
- [ ] No errors with special characters
- [ ] Data saved correctly

### Network Issues
- [ ] Slow network shows loading states
- [ ] Timeout handled gracefully
- [ ] Error messages clear

### Page Refresh
- [ ] Progress saved (if implemented)
- [ ] Can continue after refresh
- [ ] No data loss

### Overall
- [ ] Status: ✅ Pass / ❌ Fail

---

## 🌐 Scenario 10: Cross-Browser Testing

### Chrome
- [ ] Onboarding works
- [ ] Forms submit correctly
- [ ] No browser-specific errors
- [ ] Status: ✅ Pass / ❌ Fail

### Firefox
- [ ] Onboarding works
- [ ] Forms submit correctly
- [ ] No browser-specific errors
- [ ] Status: ✅ Pass / ❌ Fail

### Safari
- [ ] Onboarding works
- [ ] Forms submit correctly
- [ ] No browser-specific errors
- [ ] Status: ✅ Pass / ❌ Fail

### Edge
- [ ] Onboarding works
- [ ] Forms submit correctly
- [ ] No browser-specific errors
- [ ] Status: ✅ Pass / ❌ Fail

### Mobile Safari
- [ ] Onboarding works
- [ ] Forms submit correctly
- [ ] No browser-specific errors
- [ ] Status: ✅ Pass / ❌ Fail

### Chrome Mobile
- [ ] Onboarding works
- [ ] Forms submit correctly
- [ ] No browser-specific errors
- [ ] Status: ✅ Pass / ❌ Fail

---

## 📊 Critical Issues Checklist

### Must Fix (Critical)
- [ ] Step 2 shows removed fields
- [ ] Completion message missing features
- [ ] Hourly rate still displayed
- [ ] Cancellation policy has duplicates
- [ ] Onboarding broken on mobile
- [ ] Validation errors for removed fields

### Should Fix (High Priority)
- [ ] Mobile usability issues
- [ ] Accessibility problems
- [ ] Cross-browser issues
- [ ] Confusing error messages

### Nice to Fix (Medium Priority)
- [ ] Minor styling issues
- [ ] Performance optimizations
- [ ] Edge case handling

---

## 📝 Quick Notes Template

### Test Session
**Date**: _____  
**Tester**: _____  
**Scenario**: _____  
**Duration**: _____  

### Issues Found
1. [Issue] - Severity: Critical / High / Medium / Low
2. [Issue] - Severity: Critical / High / Medium / Low

### Positive Findings
- [Finding]
- [Finding]

### Recommendations
- [Recommendation]
- [Recommendation]

---

**Quick Reference**: Keep this checklist open during testing sessions for quick verification.



