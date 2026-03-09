# 🚀 Onboarding Simplification & Profile Setup Plan

## 🎯 Objective
Streamline the practitioner onboarding process by moving non-essential steps to a post-onboarding "Profile Setup" phase. Gate access to "Services & Pricing" (Marketplace) until the profile is complete.

## 🛠️ Implementation Steps

### 1. ⚡ Simplify Onboarding Flow
**File**: `peer-care-connect/src/pages/auth/Onboarding.tsx`
**File**: `peer-care-connect/src/lib/onboarding-validation.ts`

- **Step 1 (Basic Info)**: Remove `bio` field. Keep `firstName`, `lastName`, `phone`, `location`.
- **Remove Step 2 (Professional Details)**: Remove `experience_years`, `professional_body`, `registration_number`, `qualifications`, `professional_statement`.
- **Remove Step 3 (Availability)**: Remove entire availability setup step.
- **Remove Step 6 (Services)**: Remove service selection and hourly rate setup.
- **Remove Step 7 (Location Details)**: Remove detailed radius setup (keep basic location in Step 1).
- **Retain Steps**:
    - Step 1: Basic Info
    - Step 2: Stripe Connect (was Step 4)
    - Step 3: Subscription (was Step 5)
- **Update Validation**: Relax validation rules in `onboarding-validation.ts` to make removed fields optional for onboarding.

### 2. 👤 Enhance Profile Page & Setup Widget
**File**: `peer-care-connect/src/pages/Profile.tsx`
**New Component**: `peer-care-connect/src/components/profile/ProfileCompletionWidget.tsx`

- **Create `ProfileCompletionWidget`**:
    - Visual style: "Upwork-style" modal/card.
    - Progress bar showing completion %.
    - List of incomplete items (e.g., "Add Professional Bio", "Set Availability", "Upload Qualifications").
    - Action buttons to "Add" each item.
- **Update `Profile.tsx`**:
    - Ensure all removed onboarding fields are editable here:
        - Bio
        - Experience Years
        - Professional Body & Registration
        - Qualifications
        - Availability (embed `AvailabilityManager` or link to it)
        - Service Radius

### 3. 🔒 Gate Services & Pricing
**File**: `peer-care-connect/src/pages/practice/ServicesManagement.tsx`

- **Implement Gating Logic**:
    - Check if profile is complete (Bio, Experience, Qualifications, Availability, etc.).
    - If incomplete: Hide the services form/manager.
    - Show the `ProfileCompletionWidget` instead, with a message: "Complete your profile to start selling services."

### 4. 🧪 UX Verification
- **Test Onboarding**: Verify a new practitioner can sign up quickly (Basic Info -> Stripe -> Sub -> Done).
- **Test Profile Setup**: Verify the dashboard prompts for profile completion.
- **Test Gating**: Verify "Services" tab is locked until profile is 100% (or meets minimum requirements).

## 📋 Task List

- [ ] **Refactor Onboarding**: Remove Bio, Step 2, Step 3, Step 6, Step 7.
- [ ] **Update Validation**: Modify `onboarding-validation.ts`.
- [ ] **Create Profile Widget**: Implement `ProfileCompletionWidget.tsx`.
- [ ] **Update Profile Page**: Ensure all fields are editable.
- [ ] **Implement Gating**: Restrict `ServicesManagement.tsx`.
- [ ] **Manual UX Test**: Verify the entire flow.



