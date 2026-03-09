# UX Testing Checklist: Onboarding Simplification

**Quick Reference Guide**  
**Version**: 1.0  
**Date**: January 2025

---

## ✅ Onboarding Flow Checklist

### Step 1: Basic Information
- [ ] First Name field present
- [ ] Last Name field present
- [ ] Phone field present
- [ ] Location field present
- [ ] **NO Professional Bio field** (removed)
- [ ] Validation works correctly
- [ ] Error messages are clear
- [ ] Can proceed to Step 2

### Step 2: Stripe Connect
- [ ] Stripe Connect setup accessible
- [ ] Setup process works
- [ ] Can complete Stripe setup
- [ ] Can proceed to Step 3

### Step 3: Subscription
- [ ] Subscription options displayed
- [ ] Can select subscription
- [ ] Payment flow works (if applicable)
- [ ] Onboarding completes
- [ ] Redirects to dashboard

### Overall Onboarding
- [ ] Total time < 5 minutes
- [ ] No professional details step
- [ ] No availability step
- [ ] Onboarding status = "completed"
- [ ] User can access dashboard

---

## ✅ Profile Completion Widget Checklist

### Widget Display
- [ ] Widget appears for incomplete profiles
- [ ] Widget does NOT appear for complete profiles (100%)
- [ ] Progress percentage displays (0-100%)
- [ ] Progress bar visible
- [ ] Checklist items listed

### Checklist Items
- [ ] Professional Bio (min 50 chars)
- [ ] Years of Experience
- [ ] Qualifications
- [ ] Service Location & Radius
- [ ] Availability Schedule
- [ ] Professional Body & Registration (optional)

### Widget Functionality
- [ ] "Fix" buttons visible (always on mobile, hover on desktop)
- [ ] "Fix" buttons navigate to correct sections
- [ ] Completed items show checkmark
- [ ] Incomplete items show circle
- [ ] Widget updates in real-time
- [ ] Progress percentage updates correctly

### Mobile Widget
- [ ] Widget displays correctly on mobile
- [ ] "Fix" buttons always visible (not hover-only)
- [ ] Touch targets are adequate (> 44x44px)
- [ ] Text is readable (> 16px)
- [ ] No layout issues

---

## ✅ Services Gating Checklist

### Lock State (Incomplete Profile)
- [ ] Services page shows lock message
- [ ] Profile Completion Widget displayed
- [ ] ProductManager NOT accessible
- [ ] "Go to Profile Settings" button present
- [ ] Button navigates to Profile → Professional

### Unlock State (Complete Profile)
- [ ] Services page shows ProductManager
- [ ] No lock message
- [ ] Widget shows 100% (or hidden)
- [ ] Can create services
- [ ] Services appear in marketplace

### Gating Logic
- [ ] Checks: Bio (min 50 chars)
- [ ] Checks: Experience Years
- [ ] Checks: Qualification Type (not 'none')
- [ ] Checks: Location
- [ ] Checks: Service Radius
- [ ] Checks: Availability (at least one day enabled)
- [ ] All checks must pass for unlock

---

## ✅ Profile Fields Checklist

### Professional Tab Fields
- [ ] Professional Bio (textarea, min 50 chars)
- [ ] Years of Experience (number input)
- [ ] Qualification Type (select)
- [ ] Qualification Expiry (date)
- [ ] Qualification File Upload
- [ ] Professional Body (select)
- [ ] Registration Number (text input)
- [ ] Service Location (text input)
- [ ] Service Radius (slider, 5-100 km)
- [ ] Clinic Address (text input)
- [ ] Professional Statement (textarea, therapist_profiles)
- [ ] Treatment Philosophy (textarea, therapist_profiles)
- [ ] Response Time (number input)

### Field Validation
- [ ] Bio: Min 50 characters
- [ ] Experience: Positive number
- [ ] Location: Required
- [ ] Service Radius: 5-100 km
- [ ] All fields save correctly
- [ ] Data persists to database

### Data Persistence
- [ ] Fields save to `users` table
- [ ] Professional Statement saves to `therapist_profiles`
- [ ] Treatment Philosophy saves to `therapist_profiles`
- [ ] Real-time updates work
- [ ] No data loss on refresh

---

## ✅ Availability Setup Checklist

### Access
- [ ] Accessible from Profile → Services tab
- [ ] OR accessible from /scheduler route
- [ ] Working hours form displays
- [ ] Can set hours for each day

### Functionality
- [ ] Can enable/disable days
- [ ] Can set start/end times
- [ ] Can save availability
- [ ] Saves to `practitioner_availability` table
- [ ] Widget updates when availability set
- [ ] At least one day must be enabled for completion

### Widget Integration
- [ ] "Availability Schedule" check updates
- [ ] Progress percentage increases
- [ ] Real-time update works

---

## ✅ Real-Time Updates Checklist

### Profile Updates
- [ ] Changes sync across browser tabs
- [ ] Widget updates without refresh
- [ ] Progress percentage updates
- [ ] Checklist items update
- [ ] Services gating updates

### Update Latency
- [ ] Updates appear < 1 second
- [ ] No stale data displayed
- [ ] No flickering or jumping
- [ ] Smooth transitions

---

## ✅ Mobile Experience Checklist

### Onboarding (Mobile)
- [ ] Forms work on small screens
- [ ] No horizontal scrolling
- [ ] Touch interactions work
- [ ] Navigation is clear
- [ ] Can complete all steps

### Widget (Mobile)
- [ ] Widget displays correctly
- [ ] "Fix" buttons always visible
- [ ] Touch targets adequate
- [ ] Text is readable
- [ ] No layout issues

### Profile (Mobile)
- [ ] Forms are mobile-friendly
- [ ] Sliders work on touch
- [ ] Textareas are usable
- [ ] Save button accessible
- [ ] Navigation works

---

## ✅ Accessibility Checklist

### Screen Reader
- [ ] Widget announced correctly
- [ ] Progress percentage announced
- [ ] Checklist items announced
- [ ] "Fix" buttons announced
- [ ] Navigation announced

### Keyboard Navigation
- [ ] Can tab through all elements
- [ ] Focus indicators visible
- [ ] Can activate buttons with Enter/Space
- [ ] Tab order is logical
- [ ] No keyboard traps

### Visual
- [ ] Color contrast meets WCAG AA
- [ ] Text is readable (> 16px)
- [ ] Icons have text labels
- [ ] Focus indicators visible
- [ ] No color-only information

### ARIA Labels
- [ ] Progress bar has aria-label
- [ ] Buttons have aria-labels
- [ ] Form fields have labels
- [ ] Status messages announced

---

## ✅ Error Handling Checklist

### Validation Errors
- [ ] Bio < 50 chars: Clear error message
- [ ] Missing required fields: Clear errors
- [ ] Invalid data: Helpful messages
- [ ] Errors appear near fields
- [ ] Errors clear when fixed

### Network Errors
- [ ] Save failures handled gracefully
- [ ] User sees helpful message
- [ ] Can retry save
- [ ] No data loss

### Edge Cases
- [ ] Null/empty data handled
- [ ] Missing availability handled
- [ ] Partial completion handled
- [ ] No crashes or broken states

---

## ✅ Performance Checklist

### Load Times
- [ ] Dashboard loads < 2 seconds
- [ ] Profile page loads < 2 seconds
- [ ] Services page loads < 2 seconds
- [ ] Widget renders < 500ms

### Interactions
- [ ] Button clicks respond < 100ms
- [ ] Form saves < 1 second
- [ ] Navigation < 200ms
- [ ] Real-time updates < 500ms

### Database
- [ ] Profile queries < 200ms
- [ ] Availability queries < 200ms
- [ ] Save operations < 500ms
- [ ] No N+1 queries

---

## ✅ Browser Compatibility Checklist

### Desktop Browsers
- [ ] Chrome (latest)
- [ ] Safari (latest)
- [ ] Firefox (latest)
- [ ] Edge (latest)

### Mobile Browsers
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)
- [ ] Samsung Internet

### Screen Sizes
- [ ] 320px (mobile)
- [ ] 768px (tablet)
- [ ] 1024px (desktop)
- [ ] 1920px (large desktop)

---

## 📊 Quick Test Results Template

### Test Session: [Date]
**Participant**: [Name/Role]  
**Duration**: [Time]

#### Onboarding
- Time: [ ] minutes
- Completed: [ ] Yes [ ] No
- Issues: [List]

#### Widget
- Discovered: [ ] < 10s [ ] 10-30s [ ] > 30s
- Understood: [ ] Yes [ ] No
- Issues: [List]

#### Services Gating
- Understood: [ ] Yes [ ] No
- Completed Profile: [ ] Yes [ ] No
- Issues: [List]

#### Overall
- Satisfaction: [ ] 1 [ ] 2 [ ] 3 [ ] 4 [ ] 5
- Would Recommend: [ ] Yes [ ] No
- Major Issues: [List]

---

## 🚨 Critical Issues to Watch For

1. **Widget not updating** - Real-time sync broken
2. **Services not unlocking** - Gating logic broken
3. **Fields not saving** - Database persistence issue
4. **Mobile buttons hidden** - Hover-only on mobile
5. **Navigation broken** - "Fix" buttons go to wrong place
6. **Availability not detected** - Widget check broken
7. **Profile data lost** - Save failures
8. **Performance issues** - Slow loads or updates

---

**Quick Reference**: Keep this checklist handy during testing sessions for rapid validation.



