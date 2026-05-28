# UX Gaps Analysis: Mobile & Hybrid Therapist Booking Flow
## Wireframe vs Implementation Comparison

**Date:** February 2025  
**Status:** 🔍 **GAP ANALYSIS**

---

## 🎯 **EXECUTIVE SUMMARY**

This document identifies UX gaps between the intended wireframe/design (as documented in `marketplace-mobile-therapist-user-journey-bmad.md`) and the current implementation for mobile and hybrid therapist booking flows.

---

## ❌ **IDENTIFIED UX GAPS**

### **1. Button Labeling Clarity (HIGH PRIORITY)**

**Wireframe/Design Intent:**
- Hybrid therapists should show: **"Book at clinic"** and **"Request visit to my location"**
- Clear, descriptive labels that explain what each option does

**Current Implementation:**
- Primary button: **"Book Session"** (ambiguous - doesn't specify clinic)
- Secondary button: **"Request Mobile"** (clear but secondary)

**Location:** `src/pages/Marketplace.tsx` (lines 1439-1459)

**Issue:**
- "Book Session" is ambiguous for hybrid therapists
- Users might not realize it defaults to clinic booking
- Doesn't match wireframe specification

**Recommendation:**
```typescript
// Current
<Button>Book Session</Button>
<Button variant="outline">Request Mobile</Button>

// Should be (for hybrid therapists)
<Button>Book at Clinic</Button>
<Button variant="outline">Request Visit to My Location</Button>
```

---

### **2. Direct Booking Page Choice UI (MEDIUM PRIORITY)**

**Wireframe/Design Intent:**
- When practitioner is hybrid, show two clear options immediately
- "Book at clinic" and "Request visit to my location"

**Current Implementation:**
- Defaults to clinic flow
- Closes booking modal
- Shows choice UI separately (lines 248-249 in `DirectBooking.tsx`)

**Location:** `src/pages/public/DirectBooking.tsx` (lines 188-191, 248-249)

**Issue:**
- Two-step process (close modal, then show choice)
- Not immediately clear what options are available
- Could be confusing for users

**Recommendation:**
- Show choice UI immediately when both options are available
- Don't default to closing the modal
- Make both options equally prominent

---

### **3. Location Search Requirement Clarity (MEDIUM PRIORITY)**

**Wireframe/Design Intent:**
- Mobile booking should be available when location search is active
- Clear messaging about why location search is needed

**Current Implementation:**
- Mobile booking button only shows when `geoSearchActive === true`
- No clear explanation of why location search is required

**Location:** `src/pages/Marketplace.tsx` (line 1402)

**Issue:**
- Users might not understand why they need to search by location first
- No tooltip or help text explaining the requirement
- Mobile button might not appear if user hasn't searched by location

**Recommendation:**
- Add tooltip/help text: "Search by location to see mobile booking options"
- Show disabled button with explanation if location search not active
- Consider making location search more prominent for mobile therapists

---

### **4. Service Type Selection in Mobile Flow (LOW PRIORITY)**

**Wireframe/Design Intent:**
- Step 1: Choose mobile service (name, price, duration)
- Clear indication these are mobile services only

**Current Implementation:**
- Filters services to mobile/both types
- But doesn't explicitly label them as "mobile services"

**Location:** `src/components/marketplace/MobileBookingRequestFlow.tsx` (lines 323-344)

**Issue:**
- Service selection doesn't clearly indicate these are mobile services
- Could be confusing if practitioner also has clinic services

**Recommendation:**
- Add header: "Select Mobile Service"
- Add badge/indicator: "Mobile Service" on each service option
- Clarify that these services will be delivered at client's location

---

### **5. Visual Distinction Between Clinic and Mobile (MEDIUM PRIORITY)**

**Wireframe/Design Intent:**
- Mobile-only cards: Radius visual, "Travels to you", "Serves within X km"
- Hybrid cards: Clinic photo + "Also serves within X km"
- Clear visual distinction

**Current Implementation:**
- Uses `MobileServiceAreaBlock` for mobile-only
- But hybrid cards might not clearly show both options visually

**Location:** `src/pages/Marketplace.tsx` (location display logic)

**Issue:**
- Hybrid therapist cards might not clearly communicate both service types
- Location line might be ambiguous

**Recommendation:**
- Ensure hybrid cards show both clinic address AND service radius
- Add visual indicator (icon) for "Clinic + Mobile" option
- Make service radius more prominent on hybrid cards

---

### **6. Out of Radius Messaging (HIGH PRIORITY)**

**Wireframe/Design Intent:**
- "Clear message that the practitioner doesn't serve that area"
- "No misleading 'Book' that would fail later"

**Current Implementation:**
- Validation error shown in mobile booking flow
- But button might still appear on marketplace card

**Location:** `src/pages/Marketplace.tsx` (button logic), `MobileBookingRequestFlow.tsx` (validation)

**Issue:**
- Button might appear even if outside radius
- Error only shown after clicking and entering address
- Should prevent booking attempt earlier

**Recommendation:**
- Show disabled button with tooltip if outside radius
- Message: "Outside service area (X.X km away, serves within Y km)"
- Don't allow mobile booking flow to open if outside radius

---

### **7. Guest User Flow Clarity (LOW PRIORITY)**

**Wireframe/Design Intent:**
- Step 4: Guest users enter name, email, phone
- Clear indication this is for guest booking

**Current Implementation:**
- Guest data collection in mobile flow
- But might not be clear this is a guest booking vs account creation

**Location:** `src/components/marketplace/MobileBookingRequestFlow.tsx` (lines 75-80, 154-218)

**Issue:**
- Guest form might look like account creation
- Unclear that guest booking doesn't require account

**Recommendation:**
- Add header: "Booking as Guest" or "Continue without account"
- Clarify that account creation is optional
- Make guest flow more distinct from account creation

---

### **8. Booking Flow Step Indicators (LOW PRIORITY)**

**Wireframe/Design Intent:**
- 4-step mobile request flow clearly indicated
- Progress shown to user

**Current Implementation:**
- Multi-step flow exists
- But no visible step indicator/progress bar

**Location:** `src/components/marketplace/MobileBookingRequestFlow.tsx`

**Issue:**
- Users might not know how many steps remain
- No visual progress indicator

**Recommendation:**
- Add step indicator: "Step 1 of 4: Select Service"
- Add progress bar
- Show completion status

---

## 📊 **GAP PRIORITY MATRIX**

| Gap | Priority | Impact | Effort | Status |
|-----|----------|--------|--------|--------|
| Button Labeling | HIGH | High | Low | ❌ Not Fixed |
| Out of Radius Messaging | HIGH | High | Medium | ⚠️ Partial |
| Location Search Requirement | MEDIUM | Medium | Low | ❌ Not Fixed |
| Direct Booking Choice UI | MEDIUM | Medium | Medium | ⚠️ Partial |
| Visual Distinction | MEDIUM | Medium | Medium | ⚠️ Partial |
| Service Type Selection | LOW | Low | Low | ❌ Not Fixed |
| Guest User Flow | LOW | Low | Low | ❌ Not Fixed |
| Step Indicators | LOW | Low | Low | ❌ Not Fixed |

---

## ✅ **RECOMMENDATIONS**

### **Immediate Fixes (High Priority):**

1. **Update Button Labels for Hybrid Therapists:**
   ```typescript
   // Marketplace.tsx
   {hasClinicServices && hasMobileServices ? (
     <>
       <Button>Book at Clinic</Button>
       <Button variant="outline">Request Visit to My Location</Button>
     </>
   ) : (
     <Button>Book Session</Button>
   )}
   ```

2. **Improve Out of Radius Handling:**
   - Check radius before showing mobile button
   - Show disabled button with explanation if outside radius
   - Prevent mobile flow from opening if outside radius

3. **Add Location Search Explanation:**
   - Tooltip on mobile button: "Search by location to enable mobile booking"
   - Help text explaining why location search is needed

### **Short-term Improvements (Medium Priority):**

4. **Enhance Direct Booking Choice UI:**
   - Show choice immediately when both options available
   - Make both options equally prominent
   - Don't default to closing modal

5. **Improve Visual Distinction:**
   - Add "Clinic + Mobile" badge/indicator
   - Show both clinic address and service radius clearly
   - Use icons to distinguish service types

### **Long-term Enhancements (Low Priority):**

6. **Add Step Indicators:**
   - Progress bar in mobile booking flow
   - Step numbers and labels
   - Completion status

7. **Clarify Guest Booking:**
   - Distinct guest booking UI
   - Clear messaging about account creation being optional

---

## 📝 **WIREFRAME COMPLIANCE CHECKLIST**

Based on `marketplace-mobile-therapist-user-journey-bmad.md`:

- [ ] **AC-Card-Mobile:** Mobile-only practitioners never show clinic image ✅
- [ ] **AC-Card-Radius:** Radius visible on card with "Serves within X km" ✅
- [ ] **AC-Booking-Mobile:** Mobile/hybrid uses request flow ✅
- [ ] **AC-Radius-Check:** Blocks submission if outside radius ✅
- [ ] **AC-No-Clinic-Photo:** No clinic photo for mobile-only ✅
- [ ] **Button Labels:** Hybrid shows "Book at clinic" / "Request visit" ❌
- [ ] **Location Search:** Clear explanation of requirement ❌
- [ ] **Out of Radius:** Clear message before booking attempt ⚠️
- [ ] **Direct Booking:** Two clear options for hybrid ❌
- [ ] **Step Indicators:** Progress shown in mobile flow ❌

---

## 🔍 **CODE LOCATIONS**

### **Files to Update:**

1. **Marketplace Buttons:**
   - `src/pages/Marketplace.tsx` (lines 1436-1462)
   - Update button labels for hybrid therapists

2. **Direct Booking:**
   - `src/pages/public/DirectBooking.tsx` (lines 188-191, 248-260)
   - Improve choice UI for hybrid therapists

3. **Mobile Booking Flow:**
   - `src/components/marketplace/MobileBookingRequestFlow.tsx`
   - Add step indicators
   - Improve service selection clarity

4. **Location Search:**
   - `src/pages/Marketplace.tsx` (location search UI)
   - Add help text/tooltip about mobile booking requirement

5. **Radius Validation:**
   - `src/pages/Marketplace.tsx` (button logic)
   - `src/components/marketplace/MobileBookingRequestFlow.tsx` (validation)
   - Improve out-of-radius messaging

---

## 📋 **TESTING CHECKLIST**

After fixes, verify:

- [ ] Hybrid therapist shows "Book at Clinic" and "Request Visit to My Location"
- [ ] Mobile-only therapist shows "Request Mobile Session"
- [ ] Out of radius shows disabled button with explanation
- [ ] Location search requirement is clearly explained
- [ ] Direct booking shows choice immediately for hybrid
- [ ] Step indicators visible in mobile booking flow
- [ ] Guest booking flow is clearly distinct
- [ ] Service selection clearly labeled as "mobile services"

---

**Last Updated:** February 2025
