# 📋 Practitioner Onboarding - Data Saved to Profile

## Overview
This document details **exactly what data gets saved** to practitioner profiles during the **simplified onboarding flow**, based on the code in `Onboarding.tsx` and `onboarding-utils.ts`.

---

## 🎯 **Simplified Onboarding Flow**

The practitioner onboarding has been **simplified to 3 steps**:

1. **Step 1: Basic Information** - Collects minimal required data
2. **Step 2: Stripe Connect** - Payment account setup
3. **Step 3: Subscription** - Plan selection

**All other profile details** (bio, experience, qualifications, availability, etc.) are collected **post-onboarding** via the Profile page.

---

## 📝 **Data Saved During Onboarding**

### **Table: `users`**

During onboarding, **only the following minimal fields** are saved:

| Field Name | Data Type | Required | Source | Notes |
|------------|-----------|----------|--------|-------|
| `first_name` | varchar | ✅ YES | Step 1 | NOT NULL in DB |
| `last_name` | varchar | ✅ YES | Step 1 | NOT NULL in DB |
| `phone` | varchar | ✅ YES | Step 1 | Phone number |
| `location` | text | ✅ YES | Step 1 | Location string |
| `latitude` | numeric | ❌ Optional | Step 1 | Geocoded coordinates (if provided) |
| `longitude` | numeric | ❌ Optional | Step 1 | Geocoded coordinates (if provided) |
| `onboarding_status` | enum | ✅ YES | System | Set to `'completed'` |
| `profile_completed` | boolean | ✅ YES | System | Set to `true` |
| `is_active` | boolean | ✅ YES | System | Set to `true` |
| `updated_at` | timestamptz | ✅ YES | System | Current timestamp |

### **Code Reference:**
```typescript
// From Onboarding.tsx lines 460-472
const practitionerData = {
  phone: formData.phone,
  location: formData.location,
  firstName: enriched.firstName,
  lastName: enriched.lastName
};

// From onboarding-utils.ts lines 136-153
const userUpdateData: any = {
  phone: getFieldValue(onboardingData.phone),
  location: getFieldValue(onboardingData.location),
  first_name: onboardingData.firstName,
  last_name: onboardingData.lastName,
  latitude: onboardingData.latitude || null,
  longitude: onboardingData.longitude || null,
  onboarding_status: 'completed',
  profile_completed: true,
  is_active: true,
  updated_at: new Date().toISOString(),
};
```

---

## ❌ **Fields NOT Saved During Onboarding**

The following fields are **NOT collected or saved** during the simplified onboarding flow. They must be added later via the Profile page:

- ❌ `bio` - Professional bio
- ❌ `experience_years` - Years of experience
- ❌ `professional_body` - Professional body membership
- ❌ `registration_number` - Registration number
- ❌ `qualification_type` - Qualification type
- ❌ `qualification_file_url` - Qualification certificate
- ❌ `qualification_expiry` - Qualification expiry date
- ❌ `hourly_rate` - Hourly rate (deprecated, not used)
- ❌ `services_offered` - Services offered (jsonb array)
- ❌ `response_time_hours` - Response time
- ❌ `specializations` - Specializations (saved to `practitioner_specializations` table)
- ❌ `qualifications` - Qualifications (saved to `qualifications` table)
- ❌ `professional_statement` - Professional statement (saved to `therapist_profiles` table)
- ❌ `treatment_philosophy` - Treatment philosophy (saved to `therapist_profiles` table)
- ❌ `availability` - Working hours (saved to `practitioner_availability` table)

---

## 🔄 **Post-Onboarding Profile Completion**

After completing onboarding, practitioners are redirected to the Dashboard. They can then:

1. **Complete their profile** via the Profile page (`/profile`)
2. **Add services** via the Services & Pricing page (`/offer-services`)
3. **Set availability** via the Profile page

### **Profile Completion Data Flow:**

```
Onboarding (3 steps)
    ↓
Minimal data saved to users table
    ↓
Dashboard redirect
    ↓
Profile page (optional)
    ↓
Additional data saved:
    ├─→ users table (bio, experience, etc.)
    ├─→ therapist_profiles table (professional_statement, treatment_philosophy)
    ├─→ practitioner_specializations table (specializations)
    ├─→ qualifications table (qualifications)
    └─→ practitioner_availability table (working hours)
```

---

## ⚠️ **Important Notes**

### **1. Validation Mismatch**
- The `completePractitionerOnboarding` function in `onboarding-utils.ts` (lines 71-79) still has validation that requires many fields (`bio`, `experience_years`, `qualification_type`, etc.)
- However, the simplified onboarding flow only collects `phone`, `location`, `firstName`, `lastName`
- **This validation should be updated** to match the simplified flow, or the validation should be bypassed for minimal onboarding data

### **2. Stripe Connect Account**
- During Step 2, a Stripe Connect account is created for the practitioner
- The `stripe_connect_account_id` is saved to the `users` table
- This is required before proceeding to Step 3 (Subscription)

### **3. Subscription**
- Step 3 requires an active subscription before onboarding can be completed
- The subscription is verified before allowing completion

### **4. Profile Completion Status**
- `profile_completed` is set to `true` after onboarding, even though minimal data is collected
- This allows practitioners to access the platform immediately
- Additional profile completion can be tracked separately if needed

---

## 📊 **Summary**

| Aspect | Details |
|--------|---------|
| **Onboarding Steps** | 3 steps (Basic Info → Stripe Connect → Subscription) |
| **Fields Saved** | 4-6 fields (first_name, last_name, phone, location, + optional lat/long) |
| **System Fields** | 3 fields (onboarding_status, profile_completed, is_active) |
| **Total Fields Saved** | ~7-9 fields in `users` table |
| **Other Tables** | None populated during onboarding |
| **Post-Onboarding** | All other profile data added via Profile page |

---

## ✅ **Verification**

To verify what data is actually saved during onboarding:

1. Check the `users` table for practitioners with `onboarding_status = 'completed'`
2. Verify only minimal fields are populated: `first_name`, `last_name`, `phone`, `location`
3. Confirm other fields (`bio`, `experience_years`, etc.) are `NULL` or empty
4. Check that no records exist in `practitioner_specializations`, `qualifications`, `therapist_profiles`, or `practitioner_availability` tables for newly onboarded practitioners

---

## 🔧 **Recommended Updates**

1. **Update `completePractitionerOnboarding` validation** (lines 71-79 in `onboarding-utils.ts`) to only require:
   - `phone`
   - `location`
   - `firstName`
   - `lastName`

2. **Remove validation for fields not collected**:
   - `bio`
   - `experience_years`
   - `qualification_type`
   - `hourly_rate`
   - `professional_body`
   - `registration_number`

3. **Update documentation** to reflect that profile completion happens post-onboarding
