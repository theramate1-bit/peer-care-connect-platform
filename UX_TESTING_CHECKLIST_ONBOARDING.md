# ✅ UX Testing Checklist - Onboarding Simplification & Profile Completion

**Quick Reference Guide**  
**Use during testing sessions for rapid validation**

---

## 🚀 Quick Start Checklist

### Pre-Test Setup
- [ ] Test data created (see `UX_TEST_DATA_SETUP.md`)
- [ ] Test accounts ready
- [ ] Screen recording enabled
- [ ] Note-taking template ready
- [ ] Browser/devices prepared

---

## 📱 Scenario 1: New Practitioner Onboarding

### Step 1: Basic Information
- [ ] Name field present (first/last)
- [ ] Phone field present
- [ ] Location picker works
- [ ] **Bio field NOT present** ✅
- [ ] No professional details step ✅
- [ ] Validation works
- [ ] Can proceed to next step

### Step 2: Stripe Connect
- [ ] Stripe Connect step appears
- [ ] Setup flow works
- [ ] Can complete setup
- [ ] Returns to onboarding
- [ ] Can proceed to subscription

### Step 3: Subscription
- [ ] Subscription options visible
- [ ] Can select plan
- [ ] Payment flow works
- [ ] Returns after payment
- [ ] Can complete onboarding

### Overall
- [ ] Total time < 2 minutes
- [ ] No confusion about missing steps
- [ ] Dashboard loads after completion
- [ ] Profile widget appears

---

## 👤 Scenario 2: Profile Completion Widget

### Visibility
- [ ] Widget visible on dashboard
- [ ] Widget visible on profile page
- [ ] Widget visible on services page (if incomplete)
- [ ] Progress bar visible
- [ ] Percentage displayed

### Content
- [ ] Progress percentage accurate
- [ ] Checklist items listed
- [ ] Completed items checked ✅
- [ ] Incomplete items unchecked ⭕
- [ ] "Fix" buttons present for incomplete items

### Functionality
- [ ] "Fix" buttons navigate correctly
- [ ] Widget updates after completing fields
- [ ] Progress increases correctly
- [ ] Widget hides at 100% (or shows success)

### Understanding
- [ ] Purpose is clear
- [ ] Next steps are clear
- [ ] Motivates user to complete

---

## 📝 Scenario 3: Profile Settings

### Navigation
- [ ] Can access profile page
- [ ] Professional tab exists
- [ ] All fields accessible

### Fields Present
- [ ] **Bio field** (Professional tab)
- [ ] **Experience Years** (Professional tab)
- [ ] **Professional Body** dropdown
- [ ] **Registration Number** field
- [ ] **Qualification Type** dropdown
- [ ] **Qualification Upload** (if applicable)
- [ ] **Service Location** field
- [ ] **Service Radius Slider** ✅ (NEW)

### Functionality
- [ ] All fields editable
- [ ] Bio accepts 50+ characters
- [ ] Service radius slider works
- [ ] Changes save successfully
- [ ] Save feedback clear
- [ ] Widget updates after save

---

## 🔒 Scenario 4: Services Gating

### Incomplete Profile
- [ ] Services page shows lock message
- [ ] Lock icon/visual present
- [ ] Explanation message clear
- [ ] Profile widget displayed
- [ ] "Go to Profile Settings" button works
- [ ] Product manager NOT visible ✅

### Complete Profile
- [ ] No lock message
- [ ] Product manager visible
- [ ] Can create packages
- [ ] Widget not shown (or 100%)

### Unlocking Process
- [ ] User can complete missing fields
- [ ] Widget updates as fields completed
- [ ] Services page unlocks automatically
- [ ] No page refresh needed (or clear refresh needed)

---

## 📱 Scenario 5: Mobile Experience

### Onboarding
- [ ] All fields accessible on mobile
- [ ] Text readable (no zoom needed)
- [ ] No horizontal scrolling
- [ ] Buttons tappable (44x44px minimum)
- [ ] Forms work on mobile

### Stripe Connect
- [ ] Stripe modal works on mobile
- [ ] Can complete setup
- [ ] No display issues

### Profile Widget
- [ ] Widget visible on mobile
- [ ] Progress bar readable
- [ ] Checklist items readable
- [ ] "Fix" buttons tappable
- [ ] Layout doesn't break

### Profile Settings
- [ ] All fields accessible
- [ ] Service radius slider works on touch
- [ ] Forms usable on mobile
- [ ] Save button accessible

---

## ♿ Scenario 6: Accessibility

### Screen Reader (NVDA/JAWS/VoiceOver)
- [ ] Widget announced properly
- [ ] Progress percentage read
- [ ] Checklist items announced
- [ ] Button labels clear
- [ ] Navigation logical

### Keyboard Navigation
- [ ] Can tab to widget
- [ ] Can tab through checklist
- [ ] Can activate "Fix" buttons with Enter
- [ ] Focus indicators visible
- [ ] No keyboard traps

### Color Contrast
- [ ] Text readable (WCAG AA)
- [ ] Progress bar visible
- [ ] Buttons have sufficient contrast
- [ ] Error messages readable

### ARIA Labels
- [ ] Widget has proper role
- [ ] Progress bar has aria-valuenow
- [ ] Checklist items have labels
- [ ] Buttons have accessible names

---

## 🐛 Error Handling

### Onboarding Errors
- [ ] Validation errors clear
- [ ] Error messages helpful
- [ ] Can fix errors easily
- [ ] No dead ends

### Stripe Connect Errors
- [ ] Error if incomplete
- [ ] Clear message
- [ ] Can retry
- [ ] No confusion

### Profile Save Errors
- [ ] Save errors clear
- [ ] Field-specific errors
- [ ] Can fix and retry
- [ ] No data loss

---

## ⚡ Performance

### Loading Times
- [ ] Dashboard loads < 2 seconds
- [ ] Profile page loads < 2 seconds
- [ ] Widget renders quickly
- [ ] No lag when updating

### Updates
- [ ] Widget updates after save
- [ ] Progress updates in real-time
- [ ] No flickering
- [ ] Smooth transitions

---

## 🎨 Visual Design

### Widget Design
- [ ] Matches "Upwork-style" design
- [ ] Progress bar visually clear
- [ ] Checklist easy to scan
- [ ] Colors appropriate
- [ ] Icons clear

### Consistency
- [ ] Matches overall design system
- [ ] Consistent spacing
- [ ] Consistent typography
- [ ] Consistent colors

---

## 📊 Completion Checklist

### After Each Test Session
- [ ] All scenarios tested
- [ ] Issues documented
- [ ] Screenshots captured
- [ ] Severity assigned
- [ ] Debrief completed

### After All Testing
- [ ] All critical issues fixed
- [ ] High priority issues addressed
- [ ] Test report created
- [ ] Recommendations documented
- [ ] Follow-up testing scheduled (if needed)

---

## 🚨 Critical Issues to Watch

1. **Widget Not Visible**: Users miss the widget entirely
2. **Unclear Gating**: Users don't understand why services are locked
3. **Field Discovery**: Users can't find profile fields
4. **Mobile Issues**: Onboarding broken on mobile
5. **Accessibility Blockers**: Screen reader users can't complete tasks

---

## 📝 Quick Notes Template

**Tester**: ___________  
**Date**: ___________  
**Scenario**: ___________

**Issues Found**:
1. [ ] Critical: 
2. [ ] High: 
3. [ ] Medium: 
4. [ ] Low: 

**Positive Feedback**:
- 

**Recommendations**:
- 

---

**Print this checklist** and use during testing sessions for quick validation!



