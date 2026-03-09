# Guest Flows UX Gap Analysis - BMAD-METHOD

**Date**: 2025-02-03  
**Method**: BMAD-METHOD Systematic Analysis  
**Scope**: All Guest/Public User Flows  
**Status**: 🔍 **ANALYSIS IN PROGRESS**

---

## Executive Summary

This analysis systematically reviews all guest flows using BMAD-METHOD principles to identify UX gaps that may prevent conversion, create confusion, or block user tasks. Guest flows are critical as they represent the first impression and conversion funnel.

### Guest Flows Identified

1. **Landing Page** (`/`) - Index.tsx
2. **Marketplace** (`/marketplace`) - Marketplace.tsx
3. **Public Therapist Profile** (`/therapist/:therapistId/public`) - PublicTherapistProfile.tsx
4. **Direct Booking** (`/book/:slug`) - DirectBooking.tsx
5. **Guest Booking Flow** - GuestBookingFlow.tsx
6. **Booking Success** (`/booking-success`) - BookingSuccess.tsx
7. **Help Centre** (`/help`) - HelpCentre.tsx
8. **Pricing** (`/pricing`) - Pricing.tsx
9. **Authentication** (`/login`, `/register`) - Login.tsx, Register.tsx

---

## 1. Landing Page Flow (`/`)

### Current Implementation
- Uses `HeaderClean` and `FooterClean`
- Shows hero, impact, services, how-it-works, testimonials, CTA sections
- Redirects authenticated users to dashboard
- Has `id="main-content"` for skip link

### 🔴 Critical Issues (P0)

#### LAND-001: No Clear Primary CTA Above Fold
**Location**: `Index.tsx` - HeroSectionClean  
**Issue**: Hero section may not have prominent "Book Now" or "Find Therapists" CTA  
**Impact**: Users may not know what action to take  
**Fix Priority**: P0  
**Estimated Effort**: 30 minutes

**Recommendation**: Ensure hero has prominent, above-fold CTA button linking to `/marketplace`

---

#### LAND-002: Loading State Uses Spinner Instead of Skeleton
**Location**: `Index.tsx` line 31-33  
**Issue**: Uses `LoadingSpinner` instead of skeleton loader  
**Impact**: Poor perceived performance  
**Fix Priority**: P0  
**Estimated Effort**: 15 minutes

**Current Code**:
```tsx
if (loading) {
  return <LoadingSpinner fullScreen text="Loading..." />;
}
```

**Fix**: Replace with skeleton loader matching landing page structure

---

### 🟡 High Priority Issues (P1)

#### LAND-003: No Error State for Failed Auth Check
**Location**: `Index.tsx`  
**Issue**: If auth check fails, user sees nothing or gets stuck  
**Impact**: Users cannot proceed if auth check fails  
**Fix Priority**: P1  
**Estimated Effort**: 30 minutes

**Recommendation**: Add error boundary or fallback to show landing page even if auth check fails

---

#### LAND-004: Missing Meta Tags Validation
**Location**: `Index.tsx`  
**Issue**: Meta tags exist but should be validated for SEO  
**Impact**: Poor SEO performance  
**Fix Priority**: P1  
**Estimated Effort**: 1 hour

---

## 2. Marketplace Flow (`/marketplace`)

### Current Implementation
- Uses `HeaderClean` and `FooterClean` for guests
- Has AI assistant (SmartSearch)
- Shows practitioner cards with ratings, images, locations
- Supports filtering and geo-search
- Uses skeleton loaders for loading states
- Uses `EmptyPractitioners` for empty states

### 🔴 Critical Issues (P0)

#### MKT-001: No Clear "Sign Up" CTA for Guests
**Location**: `Marketplace.tsx`  
**Issue**: Guest users can browse but may not see clear benefit of signing up  
**Impact**: Lower conversion rate  
**Fix Priority**: P0  
**Estimated Effort**: 1 hour

**Recommendation**: Add prominent "Sign Up for Free" banner or modal for guest users

---

#### MKT-002: Booking Flow May Not Handle Guest State Properly
**Location**: `Marketplace.tsx` - BookingFlow vs GuestBookingFlow  
**Issue**: Need to verify guest users are routed to `GuestBookingFlow`  
**Impact**: Guests may be blocked from booking  
**Fix Priority**: P0  
**Estimated Effort**: 2 hours

**Current Code Check Needed**:
```tsx
// Verify this logic exists:
{!user ? (
  <GuestBookingFlow ... />
) : (
  <BookingFlow ... />
)}
```

---

### 🟡 High Priority Issues (P1)

#### MKT-003: No Loading State for Filter Changes
**Location**: `Marketplace.tsx`  
**Issue**: When filters change, no loading indicator shown  
**Impact**: Users may think nothing is happening  
**Fix Priority**: P1  
**Estimated Effort**: 1 hour

**Recommendation**: Add loading state when filters are applied

---

#### MKT-004: No Error State for Failed Practitioner Fetch
**Location**: `Marketplace.tsx`  
**Issue**: If practitioner fetch fails, user may see empty state without explanation  
**Impact**: Users don't know if it's an error or no results  
**Fix Priority**: P1  
**Estimated Effort**: 30 minutes

**Recommendation**: Add error display with retry button

---

#### MKT-005: Geo-Search May Not Work for Guests
**Location**: `Marketplace.tsx` - GeoSearchService  
**Issue**: Geo-search may require authentication  
**Impact**: Guests cannot use location-based search  
**Fix Priority**: P1  
**Estimated Effort**: 2 hours

**Recommendation**: Verify geo-search works for unauthenticated users

---

## 3. Public Therapist Profile Flow (`/therapist/:therapistId/public`)

### Current Implementation
- Uses `HeaderClean` and `FooterClean`
- Shows therapist details, services, reviews
- Has booking button
- Uses skeleton loaders
- Has error state for "Therapist Not Found"

### 🔴 Critical Issues (P0)

#### PROFILE-001: Booking Button May Not Work for Guests
**Location**: `PublicTherapistProfile.tsx`  
**Issue**: Need to verify booking button routes to `GuestBookingFlow` for guests  
**Impact**: Guests cannot book from profile page  
**Fix Priority**: P0  
**Estimated Effort**: 1 hour

**Current Code Check Needed**:
```tsx
// Verify booking button handles guest state:
<Button onClick={() => {
  if (!user) {
    // Open GuestBookingFlow
  } else {
    // Open BookingFlow
  }
}}>
```

---

#### PROFILE-002: No Error Handling for Failed Data Fetch
**Location**: `PublicTherapistProfile.tsx` line 86-101  
**Issue**: Error is caught but only logged, no user-facing error state  
**Impact**: Users see loading forever if fetch fails  
**Fix Priority**: P0  
**Estimated Effort**: 30 minutes

**Current Code**:
```tsx
} catch (error) {
  console.error('Error fetching therapist:', error);
} finally {
  setLoading(false);
}
```

**Fix**: Add error state and display error message to user

---

### 🟡 High Priority Issues (P1)

#### PROFILE-003: Missing Reviews Display
**Location**: `PublicTherapistProfile.tsx`  
**Issue**: Reviews may not be displayed on public profile  
**Impact**: Users cannot see social proof  
**Fix Priority**: P1  
**Estimated Effort**: 2 hours

**Recommendation**: Add reviews section to public profile

---

#### PROFILE-004: No Share Button
**Location**: `PublicTherapistProfile.tsx`  
**Issue**: Users cannot share therapist profile  
**Impact**: Lower viral growth  
**Fix Priority**: P1  
**Estimated Effort**: 1 hour

**Recommendation**: Add share button with social media options

---

## 4. Direct Booking Flow (`/book/:slug`)

### Current Implementation
- Fetches practitioner by booking_slug
- Shows error if practitioner not found
- Routes to `GuestBookingFlow` or `BookingFlow` based on auth state
- Has loading and error states

### 🔴 Critical Issues (P0)

#### DIRECT-001: Error Messages Not User-Friendly
**Location**: `DirectBooking.tsx` lines 78-98  
**Issue**: Error messages are technical ("Practitioner not found")  
**Impact**: Users don't understand what went wrong  
**Fix Priority**: P0  
**Estimated Effort**: 30 minutes

**Current Code**:
```tsx
setError('Practitioner not found. This booking link may be invalid.');
setError('This practitioner is not currently accepting bookings.');
setError('This practitioner profile is not yet complete.');
```

**Fix**: Make error messages more helpful with actionable guidance:
- "This booking link is no longer valid. [Link to marketplace]"
- "This practitioner is not currently accepting bookings. [Link to find others]"
- "This profile is being set up. [Link to marketplace]"

---

#### DIRECT-002: No Loading State During Practitioner Fetch
**Location**: `DirectBooking.tsx`  
**Issue**: Loading state exists but may not be visible  
**Impact**: Users may think page is broken  
**Fix Priority**: P0  
**Estimated Effort**: 15 minutes

**Recommendation**: Ensure loading state is prominent and informative

---

### 🟡 High Priority Issues (P1)

#### DIRECT-003: No Retry Mechanism for Failed Fetches
**Location**: `DirectBooking.tsx`  
**Issue**: If fetch fails, user must refresh page  
**Impact**: Poor user experience  
**Fix Priority**: P1  
**Estimated Effort**: 30 minutes

**Recommendation**: Add "Retry" button on error state

---

#### DIRECT-004: No Fallback to Marketplace
**Location**: `DirectBooking.tsx`  
**Issue**: If practitioner not found, only shows error, no CTA to marketplace  
**Impact**: Users may leave site  
**Fix Priority**: P1  
**Estimated Effort**: 15 minutes

**Recommendation**: Add "Browse All Therapists" button on error state

---

## 5. Guest Booking Flow (`GuestBookingFlow.tsx`)

### Current Implementation
- Multi-step booking process
- Collects guest information
- Handles payment
- Shows cancellation policy
- Has intake form

### 🔴 Critical Issues (P0)

#### GUEST-001: No Clear Progress Indicator
**Location**: `GuestBookingFlow.tsx`  
**Issue**: Multi-step flow may not show clear progress  
**Impact**: Users don't know how many steps remain  
**Fix Priority**: P0  
**Estimated Effort**: 1 hour

**Recommendation**: Add step indicator (e.g., "Step 1 of 4")

---

#### GUEST-002: Form Validation Errors May Not Be Clear
**Location**: `GuestBookingFlow.tsx`  
**Issue**: Guest form validation may not show field-specific errors  
**Impact**: Users don't know which fields to fix  
**Fix Priority**: P0  
**Estimated Effort**: 2 hours

**Recommendation**: Add field-level validation with clear error messages

---

#### GUEST-003: Payment Failure Handling May Not Be Clear
**Location**: `GuestBookingFlow.tsx`  
**Issue**: If payment fails, user may not know what to do  
**Impact**: Users may abandon booking  
**Fix Priority**: P0  
**Estimated Effort**: 1 hour

**Recommendation**: Add clear error messages and retry mechanism for payment failures

---

### 🟡 High Priority Issues (P1)

#### GUEST-004: No Guest Account Creation Prompt
**Location**: `GuestBookingFlow.tsx`  
**Issue**: After booking, guests may not be prompted to create account  
**Impact**: Lower user retention  
**Fix Priority**: P1  
**Estimated Effort**: 1 hour

**Recommendation**: Add "Create Account" prompt after successful booking

---

#### GUEST-005: No Save Progress for Multi-Step Form
**Location**: `GuestBookingFlow.tsx`  
**Issue**: If user closes browser, progress is lost  
**Impact**: Users must start over  
**Fix Priority**: P1  
**Estimated Effort**: 2 hours

**Recommendation**: Save form data to localStorage

---

## 6. Booking Success Flow (`/booking-success`)

### Current Implementation
- Verifies payment
- Shows session details
- Has "Create Account" prompt for guests
- Shows next steps

### 🔴 Critical Issues (P0)

#### SUCCESS-001: Payment Verification May Fail Silently
**Location**: `BookingSuccess.tsx` lines 89-94, 259-264  
**Issue**: If payment verification fails, shows generic error  
**Impact**: Users may think booking failed even if it succeeded  
**Fix Priority**: P0  
**Estimated Effort**: 1 hour

**Current Code**:
```tsx
toast.error('Unable to load session details. Please contact support...');
```

**Fix**: Show success message even if verification fails, with note that confirmation email will be sent

---

#### SUCCESS-002: Loading State Uses Spinner
**Location**: `BookingSuccess.tsx` line 404  
**Issue**: Uses spinner instead of skeleton loader  
**Impact**: Inconsistent with rest of platform  
**Fix Priority**: P0  
**Estimated Effort**: 15 minutes

---

### 🟡 High Priority Issues (P1)

#### SUCCESS-003: "Create Account" CTA May Not Be Prominent
**Location**: `BookingSuccess.tsx` lines 486-522  
**Issue**: Create account prompt is in a card but may not be eye-catching  
**Impact**: Lower conversion to registered users  
**Fix Priority**: P1  
**Estimated Effort**: 30 minutes

**Recommendation**: Make CTA more prominent with better visual hierarchy

---

#### SUCCESS-004: No Print/Download Confirmation Option
**Location**: `BookingSuccess.tsx`  
**Issue**: Users cannot save booking confirmation  
**Impact**: Users may lose booking details  
**Fix Priority**: P1  
**Estimated Effort**: 1 hour

**Recommendation**: Add "Print" or "Download PDF" button

---

## 7. Help Centre Flow (`/help`)

### Current Implementation
- Uses `HeaderClean` and `FooterClean`
- Shows help articles
- Has search functionality

### 🔴 Critical Issues (P0)

#### HELP-001: No Loading State for Article Fetch
**Location**: `HelpCentre.tsx`  
**Issue**: If articles are loading, no indicator shown  
**Impact**: Users may think page is broken  
**Fix Priority**: P0  
**Estimated Effort**: 30 minutes

**Recommendation**: Add skeleton loaders for article list

---

#### HELP-002: No Empty State for Search Results
**Location**: `HelpCentre.tsx`  
**Issue**: If search returns no results, may show nothing  
**Impact**: Users don't know if search worked  
**Fix Priority**: P0  
**Estimated Effort**: 30 minutes

**Recommendation**: Add empty state component for "No results found"

---

### 🟡 High Priority Issues (P1)

#### HELP-003: No Contact Form Integration
**Location**: `HelpCentre.tsx`  
**Issue**: Users cannot contact support from help centre  
**Impact**: Users may leave if they can't find answer  
**Fix Priority**: P1  
**Estimated Effort**: 2 hours

**Recommendation**: Add "Still need help? Contact us" section

---

## 8. Pricing Flow (`/pricing`)

### Current Implementation
- Practitioner-focused pricing
- Uses `HeaderClean` and `FooterClean`
- Shows subscription plans

### 🔴 Critical Issues (P0)

#### PRICE-001: No Clear CTA for Guests to Sign Up
**Location**: `Pricing.tsx`  
**Issue**: Pricing page may not have clear "Get Started" CTA  
**Impact**: Lower conversion  
**Fix Priority**: P0  
**Estimated Effort**: 30 minutes

**Recommendation**: Add prominent "Start Free Trial" or "Get Started" button

---

### 🟡 High Priority Issues (P1)

#### PRICE-002: No Comparison Table
**Location**: `Pricing.tsx`  
**Issue**: Users may not easily compare plans  
**Impact**: Decision paralysis  
**Fix Priority**: P1  
**Estimated Effort**: 2 hours

**Recommendation**: Add feature comparison table

---

## Summary of Issues

### Priority Breakdown
- **🔴 Critical (P0)**: 15 issues - Block user tasks, prevent conversion
- **🟡 High (P1)**: 12 issues - Significant UX friction, missing features

### Impact Areas
1. **Conversion Friction**: 8 issues - Missing CTAs, unclear flows
2. **Error Handling**: 5 issues - Unclear errors, no recovery
3. **Loading States**: 4 issues - Missing or inconsistent indicators
4. **Guest Experience**: 6 issues - Guest-specific problems
5. **Form Validation**: 2 issues - Unclear validation
6. **Empty States**: 2 issues - Missing empty states

---

## Recommended Fix Priority

### Phase 1: Critical Fixes (Week 1)
1. LAND-002: Replace spinner with skeleton on landing page
2. MKT-002: Verify guest booking flow routing
3. PROFILE-001: Verify booking button works for guests
4. PROFILE-002: Add error handling for failed fetch
5. DIRECT-001: Improve error messages
6. GUEST-001: Add progress indicator
7. GUEST-002: Improve form validation
8. SUCCESS-001: Fix payment verification error handling
9. SUCCESS-002: Replace spinner with skeleton
10. HELP-001: Add loading state
11. HELP-002: Add empty state for search
12. PRICE-001: Add clear CTA

### Phase 2: High Priority (Week 2)
1. LAND-001: Add clear primary CTA
2. LAND-003: Add error state for auth check
3. MKT-001: Add sign-up CTA for guests
4. MKT-003: Add loading state for filters
5. MKT-004: Add error state for failed fetch
6. PROFILE-003: Add reviews display
7. DIRECT-003: Add retry mechanism
8. GUEST-004: Add account creation prompt
9. SUCCESS-003: Make CTA more prominent
10. HELP-003: Add contact form
11. PRICE-002: Add comparison table

---

## Testing Checklist

### Guest Flow Testing
- [ ] Landing page loads correctly for guests
- [ ] Marketplace is accessible without login
- [ ] Guest can view therapist profiles
- [ ] Guest can start booking flow
- [ ] Guest booking flow completes successfully
- [ ] Booking success page shows correctly
- [ ] Error states are clear and actionable
- [ ] Loading states are consistent
- [ ] Empty states are helpful
- [ ] All CTAs work correctly

---

## Next Steps

1. **Review and Prioritize**: Review this analysis with stakeholders
2. **Create Tickets**: Create tickets for each issue in project management tool
3. **Implement Fixes**: Start with Phase 1 critical fixes
4. **Test Thoroughly**: Test all guest flows after fixes
5. **Monitor Metrics**: Track conversion rates and user behavior

---

**Status**: Ready for implementation planning
