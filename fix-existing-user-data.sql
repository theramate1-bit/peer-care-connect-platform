-- Fix Existing User Data Script
-- This script fixes the missing data for the existing massage therapist user
-- Run this in Supabase SQL Editor to fix the current user's profile

-- ============================================================
-- STEP 1: Fix first_name and last_name
-- ============================================================
-- Extract name from email or set a default
UPDATE users
SET 
  first_name = COALESCE(
    NULLIF(first_name, ''),
    SPLIT_PART(email, '@', 1), -- Use email prefix as fallback
    'User' -- Final fallback
  ),
  last_name = COALESCE(
    NULLIF(last_name, ''),
    '' -- Set to empty if not available (user should update in profile)
  )
WHERE id = '2aa80f40-9e3d-46ce-b88d-d0f9b61d5069'
  AND (first_name IS NULL OR first_name = '' OR last_name IS NULL OR last_name = '');

-- ============================================================
-- STEP 2: Map services_offered to specializations
-- ============================================================
-- First, delete existing specializations for this user
DELETE FROM practitioner_specializations
WHERE practitioner_id = '2aa80f40-9e3d-46ce-b88d-d0f9b61d5069';

-- Then, map services_offered to specializations
-- For massage_therapist with services: ["sports_massage", "trigger_point"]
INSERT INTO practitioner_specializations (practitioner_id, specialization_id)
SELECT DISTINCT
  '2aa80f40-9e3d-46ce-b88d-d0f9b61d5069' as practitioner_id,
  s.id as specialization_id
FROM specializations s
WHERE s.category = 'massage_therapist'
  AND (
    -- Map "sports_massage" to "Sports Massage"
    (s.name ILIKE '%sports%massage%' OR s.name ILIKE '%sports massage%')
    OR
    -- Map "trigger_point" to "Massage Therapy" or "Deep Tissue Massage"
    (s.name ILIKE '%massage therapy%' OR s.name ILIKE '%deep tissue%')
  )
ON CONFLICT (practitioner_id, specialization_id) DO NOTHING;

-- ============================================================
-- STEP 3: Create qualification entry if qualification_type exists
-- ============================================================
-- Note: This user has qualification_type = null, so we'll skip this
-- But if qualification_type was set, we would create an entry here

-- Example for future reference:
/*
INSERT INTO qualifications (practitioner_id, name, institution, year_obtained, certificate_url, verified)
SELECT 
  '2aa80f40-9e3d-46ce-b88d-d0f9b61d5069',
  CASE 
    WHEN qualification_type = 'level_3_massage' THEN 'Level 3 Massage Therapy Diploma'
    WHEN qualification_type = 'level_4_massage' THEN 'Level 4 Massage Therapy Diploma'
    WHEN qualification_type = 'level_5_massage' THEN 'Level 5 Massage Therapy Diploma'
    WHEN qualification_type = 'itec_qualification' THEN 'ITEC Qualification'
    WHEN qualification_type = 'cnhc_registration' THEN 'CNHC Registration'
    ELSE qualification_type
  END,
  NULL,
  EXTRACT(YEAR FROM qualification_expiry)::INTEGER,
  qualification_file_url,
  false
FROM users
WHERE id = '2aa80f40-9e3d-46ce-b88d-d0f9b61d5069'
  AND qualification_type IS NOT NULL
  AND qualification_type != 'none'
  AND NOT EXISTS (
    SELECT 1 FROM qualifications q 
    WHERE q.practitioner_id = users.id
  );
*/

-- ============================================================
-- VERIFICATION: Check the results
-- ============================================================
SELECT 
  'Verification Results' as check_type,
  u.first_name,
  u.last_name,
  (SELECT COUNT(*) FROM practitioner_specializations ps WHERE ps.practitioner_id = u.id) as specialization_count,
  (SELECT COUNT(*) FROM qualifications q WHERE q.practitioner_id = u.id) as qualification_count
FROM users u
WHERE u.id = '2aa80f40-9e3d-46ce-b88d-d0f9b61d5069';

