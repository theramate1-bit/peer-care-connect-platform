# Client Onboarding Database & Frontend Alignment Report

**Date**: January 2025  
**Status**: ✅ **READY FOR IMPLEMENTATION**

---

## 🔍 Database Schema Analysis

### Current State

#### `users` Table
- ✅ **Has**: `first_name`, `last_name`, `phone`, `location`, `onboarding_status`, `profile_completed`
- ❌ **Does NOT have**: `primary_goal`, `preferred_therapy_types` columns
- ✅ **Has**: `preferences` (JSONB) - but NOT used for onboarding data

#### Key Finding
**`primaryGoal` and `preferredTherapyTypes` are collected during onboarding but NOT saved to the database.**

The `completeClientOnboarding` function:
- Validates `primaryGoal` as required (line 660)
- But only saves: `first_name`, `last_name`, `phone`, `location`, `onboarding_status`, `profile_completed`
- **Does NOT save** `primaryGoal` or `preferredTherapyTypes` to database

---

## 📋 Action Points from Transcript

### 1. Remove from Client Onboarding Step 2
- ❌ **Remove**: "What's your primary health goal?" field
- ❌ **Remove**: "Preferred therapy types" section
- ✅ **Keep**: First Name, Last Name fields
- ✅ **Keep**: Completion message (but update it)

### 2. Update Completion Message
**Current**: "As a client you can now start finding a booking session full of our therapist in the area"

**New**: Should include:
- "As a client you can now start finding a booking session full of our therapist in the area"
- "Track your progress"
- "Ask the search for therapists" (Smart Search)
- "Browse on the marketplace"

### 3. Remove Hourly Rate Display
- Remove hourly rate from booking UI
- Only show packages

### 4. Remove "Immune System" Service Option
- Find and remove from service types/packages

### 5. Fix Cancellation Policy Display
- Fix duplicate "2 plus day in advance" text

---

## 🔧 Required Code Changes

### Files to Modify

#### 1. `peer-care-connect/src/pages/auth/Onboarding.tsx`
**Changes:**
- Remove `primaryGoal` field (line 638-648)
- Remove `preferredTherapyTypes` section (line 652-676)
- Remove from `formData` state (lines 56-57)
- Remove validation (lines 192-196, 256-258)
- Remove from `clientData` object (lines 465-466)
- Update completion message

#### 2. `peer-care-connect/src/lib/onboarding-utils.ts`
**Changes:**
- Remove `primaryGoal` from `requiredFields` (line 660)
- Remove validation check (line 854)
- Remove from `ClientOnboardingData` interface (line 55) - or make optional
- Remove from `preferredTherapyTypes` (line 50) - or make optional

#### 3. `peer-care-connect/src/lib/onboarding-validation.ts`
**Changes:**
- Remove `primary_goal` from `requiredFields` (line 67)
- Remove `preferredTherapyTypes` from validation (line 68)
- Remove validation rules (lines 70-74, 80-84)
- Remove from interface (lines 20-21) - or make optional

#### 4. `peer-care-connect/src/components/marketplace/BookingFlow.tsx`
**Changes:**
- Remove hourly rate display
- Fix cancellation policy duplicate text

#### 5. `peer-care-connect/src/components/marketplace/GuestBookingFlow.tsx`
**Changes:**
- Remove hourly rate display
- Fix cancellation policy duplicate text

---

## ✅ Database Impact

### No Database Changes Required
- ✅ `primaryGoal` and `preferredTherapyTypes` are NOT stored in database during onboarding
- ✅ Removing them from the UI will not affect existing data
- ✅ No migrations needed

### Note
- These fields ARE used in `ClientProfile.tsx` where they're stored in `users.preferences` JSONB
- But they're NOT required during onboarding
- They can be added later in the profile page if needed

---

## 🎯 Implementation Plan

### Phase 1: Remove Fields from Onboarding
1. Remove `primaryGoal` field from Step 2
2. Remove `preferredTherapyTypes` section from Step 2
3. Update validation to remove these requirements
4. Update completion message

### Phase 2: Update Booking Flow
1. Remove hourly rate displays
2. Fix cancellation policy text

### Phase 3: Clean Up
1. Remove "immune system" service option
2. Test all flows

---

## 📊 Current vs. Proposed Flow

### Current Client Onboarding Step 2:
```
- First Name *
- Last Name *
- Primary Health Goal * ← REMOVE
- Preferred Therapy Types ← REMOVE
```

### Proposed Client Onboarding Step 2:
```
- First Name *
- Last Name *
```

### Completion Message:
```
As a client you can now:
- Start finding a booking session full of our therapist in the area
- Track your progress
- Ask the search for therapists
- Browse on the marketplace
```

---

## ✅ Verification Checklist

- [ ] Removed `primaryGoal` from onboarding UI
- [ ] Removed `preferredTherapyTypes` from onboarding UI
- [ ] Removed validation for these fields
- [ ] Updated completion message
- [ ] Removed hourly rate from booking flows
- [ ] Fixed cancellation policy display
- [ ] Removed "immune system" service option
- [ ] Tested onboarding flow
- [ ] Tested booking flow
- [ ] No database errors

---

## 🚨 Important Notes

1. **No Data Loss**: These fields aren't saved during onboarding, so removing them is safe
2. **Profile Page**: Users can still add goals/preferences later in their profile if needed
3. **Backward Compatibility**: Existing users won't be affected
4. **Validation**: Make sure to remove ALL validation checks for these fields

---

**Status**: ✅ **READY TO PROCEED**  
**Database**: ✅ **NO CHANGES NEEDED**  
**Risk Level**: 🟢 **LOW** (Fields not saved to DB anyway)



