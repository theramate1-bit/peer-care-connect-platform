# Onboarding Data Mapping

## Overview
This document tracks how practitioner onboarding data flows from collection → storage → profile display.

## Data Flow Architecture

```
User fills form → onboarding_progress table → completePractitionerOnboarding() → users table → Profile page
                   (step-by-step)              (on completion)                (permanent)      (display)
```

## Field Mapping Reference

### Step 1: Personal Information
| Field Name (Form) | `onboarding_progress.form_data` | `users` Table Column | Profile Display |
|------------------|--------------------------------|---------------------|-----------------|
| firstName | `firstName` | `first_name` | Personal Info tab |
| lastName | `lastName` | `last_name` | Personal Info tab |
| phone | `phone` | `phone` | Personal Info tab |
| bio | `bio` | `bio` | Professional tab |

### Step 2: Location
| Field Name (Form) | `onboarding_progress.form_data` | `users` Table Column | Profile Display |
|------------------|--------------------------------|---------------------|-----------------|
| location | `location` | `location` | Professional tab |
| latitude | `latitude` | `latitude` | (hidden - geocoding) |
| longitude | `longitude` | `longitude` | (hidden - geocoding) |
| timezone | `timezone` | N/A | Used for availability |
| service_radius_km | `service_radius_km` | `service_radius_km` | (marketplace filter) |

### Step 3: Professional Details
| Field Name (Form) | `onboarding_progress.form_data` | `users` Table Column | Profile Display |
|------------------|--------------------------------|---------------------|-----------------|
| user_role | `user_role` | `user_role` | (system - determines role) |
| experience_years | `experience_years` | `experience_years` | Professional tab |
| professional_body | `professional_body` | `professional_body` | Professional tab |
| professional_body_other | `professional_body_other` | `professional_body` | Professional tab (if "other") |
| registration_number | `registration_number` | `registration_number` | Professional tab |
| qualification_type | `qualification_type` | `qualification_type` | Professional tab |
| qualification_other | `qualification_other` | `qualification_type` | Professional tab (if "other") |
| qualification_expiry | `qualification_expiry` | `qualification_expiry` | Professional tab |
| qualification_file | `qualification_file` | `qualification_file_url` | Professional tab (file upload) |

### Step 4: Services & Pricing
| Field Name (Form) | `onboarding_progress.form_data` | Table | Profile Display |
|------------------|--------------------------------|-------|-----------------|
| specializations | `specializations[]` | `practitioner_specializations` (junction) | Professional tab (checkboxes) |
| qualifications | `qualifications[]` | `qualifications` (separate table) | Professional tab (add/remove) |
| hourly_rate | `hourly_rate` | `hourly_rate` | Professional tab |
| services_offered | `services_offered[]` | `services_offered` (jsonb) | Services tab |
| response_time_hours | `response_time_hours` | `response_time_hours` | Professional tab |

### Step 5: Availability
| Field Name (Form) | `onboarding_progress.form_data` | Table | Profile Display |
|------------------|--------------------------------|-------|-----------------|
| availability | `availability` (jsonb) | `practitioner_availability.working_hours` | Availability management |

### Step 6: Subscription
| Field Name (Form) | `onboarding_progress.form_data` | Table | Notes |
|------------------|--------------------------------|-------|-------|
| subscription_plan | N/A | `subscriptions` | Managed by Stripe |

## Critical Implementation Notes

### 1. Empty String Handling
```typescript
// Helper function to prevent saving empty strings as data
const getFieldValue = (value: any) => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  return value;
};
```

### 2. Specializations (Junction Table)
- **DO NOT** save as array in `users.specializations` column
- **MUST** save to `practitioner_specializations` junction table
- Format: `{ practitioner_id, specialization_id }`

### 3. Qualifications (Separate Table)
- **DO NOT** save as array in `users.qualifications` column
- **MUST** save to `qualifications` table
- Format: `{ practitioner_id, name, institution, year_obtained, certificate_url, verified }`

### 4. Availability
- Saved to `practitioner_availability` table as JSONB
- Format:
```json
{
  "monday": { "enabled": true, "start": "09:00", "end": "17:00" },
  "tuesday": { "enabled": true, "start": "09:00", "end": "17:00" },
  ...
}
```

## Completion Checklist

When `completePractitionerOnboarding()` runs, it MUST:
- [x] Transfer all `onboarding_progress.form_data` to `users` table
- [x] Save specializations to `practitioner_specializations` junction table
- [x] Save qualifications to `qualifications` table
- [x] Save availability to `practitioner_availability` table
- [x] Create Stripe Connect account
- [x] Set `onboarding_status = 'completed'`
- [x] Set `profile_completed = true`
- [x] Set `is_active = true` (for marketplace visibility)
- [x] Log comprehensive summary of what was saved

## Verification Process

After completion, `verifyPractitionerOnboardingCompletion()` checks:
- User profile has required fields populated
- Specializations exist in junction table
- Qualifications exist in qualifications table
- Availability record exists
- All data matches what was in `onboarding_progress`

## Logging Standards

### During Onboarding
```typescript
console.log('📝 Saving practitioner onboarding data to users table:', {
  userId,
  fieldsToSave: Object.keys(userUpdateData),
  sampleData: { ... }
});
```

### After Completion
```typescript
console.log('✅ Practitioner profile saved successfully:', {
  userId,
  savedFields: Object.keys(userUpdateData),
  verification: { ... }
});
```

### Summary
```typescript
console.log('🎉 Practitioner onboarding completion summary:', {
  userId,
  timestamp,
  dataFlow: {
    onboardingProgressTable: 'Data collected and saved during steps',
    usersTable: 'Profile data transferred and saved',
    specializationsTable: '2 specializations saved',
    qualificationsTable: '3 qualifications saved',
    availabilityTable: 'Working hours saved'
  },
  verificationResult: 'PASSED',
  issues: []
});
```

## Troubleshooting

### Issue: Profile fields empty after onboarding
**Diagnosis**: `completePractitionerOnboarding()` not called or failed silently
**Check**: 
1. Console logs for "🎉 Practitioner onboarding completion summary"
2. `users.onboarding_status` should be 'completed'
3. `onboarding_progress.form_data` has the data but `users` table doesn't

**Fix**: Manually run SQL to transfer data from `onboarding_progress` → `users`

### Issue: Specializations/Qualifications missing
**Diagnosis**: Data saved to wrong table or not saved at all
**Check**:
1. Query `practitioner_specializations` for the user_id
2. Query `qualifications` for the practitioner_id
3. Check if arrays were incorrectly saved to `users.specializations`

**Fix**: Delete array data, re-save to junction tables

## Related Files
- `/src/lib/onboarding-utils.ts` - Completion logic
- `/src/pages/auth/Onboarding.tsx` - Form collection
- `/src/pages/Profile.tsx` - Profile display
- `/src/contexts/AuthContext.tsx` - Profile state management

## Database Schema Quick Reference
```sql
-- Users table (main profile data)
SELECT id, first_name, last_name, bio, location, experience_years, 
       hourly_rate, professional_body, registration_number, 
       qualification_type, qualification_expiry
FROM users WHERE id = 'user-id';

-- Specializations (junction table)
SELECT ps.*, s.name 
FROM practitioner_specializations ps
JOIN specializations s ON ps.specialization_id = s.id
WHERE ps.practitioner_id = 'user-id';

-- Qualifications (separate table)
SELECT * FROM qualifications 
WHERE practitioner_id = 'user-id';

-- Availability
SELECT * FROM practitioner_availability 
WHERE user_id = 'user-id';

-- Onboarding progress (temporary during onboarding)
SELECT form_data FROM onboarding_progress 
WHERE user_id = 'user-id';
```

