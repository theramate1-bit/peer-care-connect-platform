# Test Data Setup: Onboarding Simplification

**Version**: 1.0  
**Date**: January 2025

---

## 📋 Overview

This document provides SQL scripts and instructions for setting up test data for UX testing of the onboarding simplification and profile completion gating features.

---

## 🧪 Test Accounts

### Test Account 1: Incomplete Profile (New Onboarding)
**Purpose**: Test onboarding flow and incomplete profile state

**Setup**:
```sql
-- Create test user (will be created through onboarding, but for testing):
-- Email: test.incomplete@example.com
-- Role: sports_therapist
-- Onboarding Status: completed
-- Profile Completed: false
-- Bio: NULL or < 50 chars
-- Experience: NULL
-- Qualification: NULL or 'none'
-- Location: NULL
-- Service Radius: NULL
-- Availability: Not set up
```

**Expected State**:
- ✅ Onboarding completed
- ❌ Profile incomplete
- ❌ Services locked
- ✅ Widget visible with low percentage

---

### Test Account 2: Partially Complete Profile
**Purpose**: Test widget updates and progressive completion

**Setup**:
```sql
-- Email: test.partial@example.com
-- Bio: "I am a sports therapist" (25 chars - incomplete)
-- Experience: 5
-- Qualification: 'itmmif'
-- Location: "London"
-- Service Radius: 25
-- Availability: Not set up
```

**Expected State**:
- ✅ Onboarding completed
- ⚠️ Profile partially complete (60-70%)
- ❌ Services locked
- ✅ Widget visible with progress

---

### Test Account 3: Complete Profile
**Purpose**: Test unlocked state and widget hiding

**Setup**:
```sql
-- Email: test.complete@example.com
-- Bio: "I am an experienced sports therapist with over 10 years of practice..." (50+ chars)
-- Experience: 10
-- Qualification: 'itmmif'
-- Location: "Manchester"
-- Service Radius: 50
-- Availability: Set up (at least one day enabled)
-- Professional Body: "SST"
-- Registration Number: "TEST123"
```

**Expected State**:
- ✅ Onboarding completed
- ✅ Profile complete (100%)
- ✅ Services unlocked
- ✅ Widget hidden or shows 100%

---

### Test Account 4: Availability Only Missing
**Purpose**: Test availability-specific gating

**Setup**:
```sql
-- Email: test.no.availability@example.com
-- Bio: "Experienced therapist..." (50+ chars)
-- Experience: 8
-- Qualification: 'atmmif'
-- Location: "Birmingham"
-- Service Radius: 30
-- Availability: NOT set up (no rows in practitioner_availability)
```

**Expected State**:
- ✅ All profile fields complete
- ❌ Availability not set
- ❌ Services locked
- ✅ Widget shows availability incomplete

---

## 🗄️ SQL Setup Scripts

### Script 1: Create Incomplete Profile User
```sql
-- Note: User should be created through normal signup flow
-- This is for reference only - actual users created via auth.signup()

-- After user creation, update to incomplete state:
UPDATE public.users
SET 
  onboarding_status = 'completed',
  profile_completed = false,
  bio = 'Short bio', -- < 50 chars
  experience_years = NULL,
  qualification_type = NULL,
  location = NULL,
  service_radius_km = NULL
WHERE email = 'test.incomplete@example.com';

-- Ensure no availability
DELETE FROM public.practitioner_availability
WHERE user_id = (SELECT id FROM public.users WHERE email = 'test.incomplete@example.com');
```

---

### Script 2: Create Partially Complete User
```sql
UPDATE public.users
SET 
  onboarding_status = 'completed',
  profile_completed = false,
  bio = 'I am a sports therapist', -- 25 chars (incomplete)
  experience_years = 5,
  qualification_type = 'itmmif',
  location = 'London',
  service_radius_km = 25
WHERE email = 'test.partial@example.com';

-- No availability
DELETE FROM public.practitioner_availability
WHERE user_id = (SELECT id FROM public.users WHERE email = 'test.partial@example.com');
```

---

### Script 3: Create Complete Profile User
```sql
UPDATE public.users
SET 
  onboarding_status = 'completed',
  profile_completed = true,
  bio = 'I am an experienced sports therapist with over 10 years of practice in injury rehabilitation and sports performance. I specialize in working with athletes at all levels.',
  experience_years = 10,
  qualification_type = 'itmmif',
  location = 'Manchester',
  service_radius_km = 50,
  professional_body = 'SST',
  registration_number = 'TEST123'
WHERE email = 'test.complete@example.com';

-- Set up availability (at least one day enabled)
INSERT INTO public.practitioner_availability (user_id, working_hours, timezone)
VALUES (
  (SELECT id FROM public.users WHERE email = 'test.complete@example.com'),
  '{
    "monday": {"enabled": true, "start": "09:00", "end": "17:00"},
    "tuesday": {"enabled": true, "start": "09:00", "end": "17:00"},
    "wednesday": {"enabled": false, "start": "09:00", "end": "17:00"},
    "thursday": {"enabled": false, "start": "09:00", "end": "17:00"},
    "friday": {"enabled": false, "start": "09:00", "end": "17:00"},
    "saturday": {"enabled": false, "start": "09:00", "end": "17:00"},
    "sunday": {"enabled": false, "start": "09:00", "end": "17:00"}
  }'::jsonb,
  'Europe/London'
)
ON CONFLICT (user_id) DO UPDATE SET
  working_hours = EXCLUDED.working_hours;

-- Set up therapist_profiles for professional_statement and treatment_philosophy
INSERT INTO public.therapist_profiles (user_id, professional_statement, treatment_philosophy)
VALUES (
  (SELECT id FROM public.users WHERE email = 'test.complete@example.com'),
  'I believe in a holistic approach to sports therapy.',
  'My treatment philosophy focuses on evidence-based practice.'
)
ON CONFLICT (user_id) DO UPDATE SET
  professional_statement = EXCLUDED.professional_statement,
  treatment_philosophy = EXCLUDED.treatment_philosophy;
```

---

### Script 4: Create No Availability User
```sql
UPDATE public.users
SET 
  onboarding_status = 'completed',
  profile_completed = false, -- Still incomplete due to missing availability
  bio = 'Experienced therapist with extensive background in sports injury management and rehabilitation techniques.',
  experience_years = 8,
  qualification_type = 'atmmif',
  location = 'Birmingham',
  service_radius_km = 30
WHERE email = 'test.no.availability@example.com';

-- Explicitly remove availability
DELETE FROM public.practitioner_availability
WHERE user_id = (SELECT id FROM public.users WHERE email = 'test.no.availability@example.com');
```

---

## 🔄 Reset Scripts

### Reset User to Incomplete State
```sql
-- Reset a user to incomplete state for re-testing
UPDATE public.users
SET 
  profile_completed = false,
  bio = 'Short', -- < 50 chars
  experience_years = NULL,
  qualification_type = NULL,
  location = NULL,
  service_radius_km = NULL
WHERE email = 'test.user@example.com';

DELETE FROM public.practitioner_availability
WHERE user_id = (SELECT id FROM public.users WHERE email = 'test.user@example.com');
```

---

### Reset User to Complete State
```sql
-- Reset a user to complete state
UPDATE public.users
SET 
  profile_completed = true,
  bio = 'I am an experienced sports therapist with over 10 years of practice in injury rehabilitation and sports performance.',
  experience_years = 10,
  qualification_type = 'itmmif',
  location = 'London',
  service_radius_km = 50
WHERE email = 'test.user@example.com';

-- Set up availability
INSERT INTO public.practitioner_availability (user_id, working_hours, timezone)
VALUES (
  (SELECT id FROM public.users WHERE email = 'test.user@example.com'),
  '{"monday": {"enabled": true, "start": "09:00", "end": "17:00"}}'::jsonb,
  'Europe/London'
)
ON CONFLICT (user_id) DO UPDATE SET
  working_hours = EXCLUDED.working_hours;
```

---

## 🧹 Cleanup Scripts

### Clean Up Test Data
```sql
-- Remove test users (use with caution!)
DELETE FROM public.practitioner_availability
WHERE user_id IN (
  SELECT id FROM public.users 
  WHERE email LIKE 'test.%@example.com'
);

DELETE FROM public.therapist_profiles
WHERE user_id IN (
  SELECT id FROM public.users 
  WHERE email LIKE 'test.%@example.com'
);

-- Note: Users should be deleted through auth system, not directly
-- This is for cleaning up related data only
```

---

## 📊 Verification Queries

### Check Profile Completion Status
```sql
SELECT 
  u.email,
  u.onboarding_status,
  u.profile_completed,
  CASE 
    WHEN u.bio IS NULL OR LENGTH(u.bio) < 50 THEN 'Incomplete'
    WHEN u.experience_years IS NULL THEN 'Incomplete'
    WHEN u.qualification_type IS NULL OR u.qualification_type = 'none' THEN 'Incomplete'
    WHEN u.location IS NULL THEN 'Incomplete'
    WHEN u.service_radius_km IS NULL THEN 'Incomplete'
    WHEN NOT EXISTS (
      SELECT 1 FROM public.practitioner_availability pa
      WHERE pa.user_id = u.id
      AND EXISTS (
        SELECT 1 FROM jsonb_each(pa.working_hours) w
        WHERE (w.value->>'enabled')::boolean = true
      )
    ) THEN 'Incomplete'
    ELSE 'Complete'
  END as calculated_status,
  LENGTH(u.bio) as bio_length,
  u.experience_years,
  u.qualification_type,
  u.location,
  u.service_radius_km,
  EXISTS (
    SELECT 1 FROM public.practitioner_availability pa
    WHERE pa.user_id = u.id
    AND EXISTS (
      SELECT 1 FROM jsonb_each(pa.working_hours) w
      WHERE (w.value->>'enabled')::boolean = true
    )
  ) as has_availability
FROM public.users u
WHERE u.email LIKE 'test.%@example.com'
ORDER BY u.email;
```

---

### Check Widget Requirements
```sql
-- Verify what the widget should show for a user
SELECT 
  u.email,
  -- Bio check
  CASE WHEN u.bio IS NOT NULL AND LENGTH(u.bio) > 50 THEN true ELSE false END as bio_complete,
  -- Experience check
  CASE WHEN u.experience_years IS NOT NULL THEN true ELSE false END as experience_complete,
  -- Qualification check
  CASE WHEN u.qualification_type IS NOT NULL AND u.qualification_type != 'none' THEN true ELSE false END as qualification_complete,
  -- Location check
  CASE WHEN u.location IS NOT NULL AND u.service_radius_km IS NOT NULL THEN true ELSE false END as location_complete,
  -- Availability check
  EXISTS (
    SELECT 1 FROM public.practitioner_availability pa
    WHERE pa.user_id = u.id
    AND EXISTS (
      SELECT 1 FROM jsonb_each(pa.working_hours) w
      WHERE (w.value->>'enabled')::boolean = true
    )
  ) as availability_complete
FROM public.users u
WHERE u.email = 'test.user@example.com';
```

---

## 🎯 Test Scenarios Data

### Scenario: Onboarding Flow
**User**: New signup (no existing data)  
**Action**: Complete onboarding  
**Expected**: Onboarding completes, profile incomplete, widget visible

---

### Scenario: Widget Discovery
**User**: Incomplete profile user  
**Action**: View dashboard  
**Expected**: Widget visible, progress < 100%, checklist shown

---

### Scenario: Profile Completion
**User**: Incomplete profile user  
**Action**: Complete profile fields  
**Expected**: Widget updates, progress increases, eventually unlocks services

---

### Scenario: Services Gating
**User**: Incomplete profile user  
**Action**: Navigate to Services & Pricing  
**Expected**: Lock message, widget shown, ProductManager blocked

---

### Scenario: Services Unlock
**User**: Complete profile user  
**Action**: Navigate to Services & Pricing  
**Expected**: No lock, ProductManager accessible, can create services

---

## ✅ Data Setup Checklist

- [ ] Test accounts created
- [ ] Incomplete profile user set up
- [ ] Partially complete user set up
- [ ] Complete profile user set up
- [ ] No availability user set up
- [ ] Verification queries run
- [ ] Test data verified
- [ ] Cleanup scripts ready

---

## 🔐 Security Notes

- **Test Accounts**: Use `test.*@example.com` pattern
- **Production**: Never use test accounts in production
- **Cleanup**: Remove test data after testing
- **Passwords**: Use strong test passwords
- **Permissions**: Test accounts should have normal user permissions

---

## 📝 Notes

- Users should be created through normal signup flow when possible
- SQL scripts are for data manipulation only
- Always verify data after setup
- Use verification queries to check state
- Reset scripts allow re-testing same scenarios

---

**Data Setup Complete**: Test accounts are ready for UX testing!



