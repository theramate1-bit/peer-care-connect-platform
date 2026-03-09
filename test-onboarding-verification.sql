-- End-to-End Onboarding Data Verification Query
-- Run this query in Supabase SQL Editor after completing onboarding
-- Replace 'YOUR_USER_ID' with the actual user ID you want to test

-- ============================================================
-- COMPREHENSIVE ONBOARDING DATA VERIFICATION
-- ============================================================

WITH user_data AS (
  SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.phone,
    u.profile_photo_url,
    u.bio,
    u.location,
    u.experience_years,
    u.hourly_rate,
    u.registration_number,
    u.professional_body,
    u.qualification_type,
    u.services_offered,
    u.latitude,
    u.longitude,
    u.service_radius_km,
    u.onboarding_status,
    u.profile_completed,
    u.user_role
  FROM users u
  WHERE u.id = '2aa80f40-9e3d-46ce-b88d-d0f9b61d5069' -- Replace with your user ID
),
specialization_count AS (
  SELECT 
    practitioner_id,
    COUNT(*) as count,
    STRING_AGG(s.name, ', ') as names
  FROM practitioner_specializations ps
  JOIN specializations s ON ps.specialization_id = s.id
  WHERE ps.practitioner_id = (SELECT id FROM user_data)
  GROUP BY practitioner_id
),
qualification_count AS (
  SELECT 
    practitioner_id,
    COUNT(*) as count,
    STRING_AGG(name, ', ') as names
  FROM qualifications
  WHERE practitioner_id = (SELECT id FROM user_data)
  GROUP BY practitioner_id
),
therapist_profile_check AS (
  SELECT 
    user_id,
    professional_statement,
    treatment_philosophy
  FROM therapist_profiles
  WHERE user_id = (SELECT id FROM user_data)
)
SELECT 
  -- Basic Information
  ud.first_name,
  CASE WHEN ud.first_name IS NOT NULL AND ud.first_name != '' THEN '✅' ELSE '❌' END as first_name_status,
  ud.last_name,
  CASE WHEN ud.last_name IS NOT NULL AND ud.last_name != '' THEN '✅' ELSE '❌' END as last_name_status,
  ud.email,
  CASE WHEN ud.email IS NOT NULL AND ud.email != '' THEN '✅' ELSE '❌' END as email_status,
  ud.phone,
  CASE WHEN ud.phone IS NOT NULL AND ud.phone != '' THEN '✅' ELSE '❌' END as phone_status,
  CASE WHEN ud.profile_photo_url IS NOT NULL THEN '✅' ELSE '❌' END as photo_status,
  
  -- Professional Information
  CASE WHEN ud.bio IS NOT NULL AND ud.bio != '' THEN '✅' ELSE '❌' END as bio_status,
  CASE WHEN ud.location IS NOT NULL AND ud.location != '' THEN '✅' ELSE '❌' END as location_status,
  ud.experience_years,
  CASE WHEN ud.experience_years > 0 THEN '✅' ELSE '❌' END as experience_status,
  ud.hourly_rate,
  CASE WHEN ud.hourly_rate > 0 THEN '✅' ELSE '❌' END as hourly_rate_status,
  CASE WHEN ud.registration_number IS NOT NULL AND ud.registration_number != '' THEN '✅' ELSE '❌' END as registration_status,
  CASE WHEN ud.professional_body IS NOT NULL AND ud.professional_body != '' THEN '✅' ELSE '❌' END as professional_body_status,
  ud.qualification_type,
  CASE WHEN ud.qualification_type IS NOT NULL AND ud.qualification_type != 'none' THEN '✅' ELSE '❌' END as qualification_type_status,
  ud.services_offered,
  CASE WHEN ud.services_offered IS NOT NULL AND jsonb_array_length(ud.services_offered) > 0 THEN '✅' ELSE '❌' END as services_status,
  CASE WHEN ud.latitude IS NOT NULL AND ud.longitude IS NOT NULL THEN '✅' ELSE '❌' END as coordinates_status,
  ud.service_radius_km,
  CASE WHEN ud.service_radius_km IS NOT NULL AND ud.service_radius_km > 0 THEN '✅' ELSE '❌' END as radius_status,
  
  -- Junction Tables
  COALESCE(sc.count, 0) as specialization_count,
  CASE WHEN COALESCE(sc.count, 0) > 0 THEN '✅' ELSE '❌' END as specialization_status,
  sc.names as specialization_names,
  COALESCE(qc.count, 0) as qualification_count,
  CASE WHEN COALESCE(qc.count, 0) > 0 THEN '✅' ELSE '❌' END as qualification_status,
  qc.names as qualification_names,
  
  -- Therapist Profile
  CASE WHEN tpc.user_id IS NOT NULL THEN '✅' ELSE '⚠️' END as therapist_profile_status,
  
  -- Status
  ud.onboarding_status,
  ud.profile_completed,
  ud.user_role,
  
  -- Summary Counts
  (
    CASE WHEN ud.first_name IS NOT NULL AND ud.first_name != '' THEN 1 ELSE 0 END +
    CASE WHEN ud.last_name IS NOT NULL AND ud.last_name != '' THEN 1 ELSE 0 END +
    CASE WHEN ud.email IS NOT NULL AND ud.email != '' THEN 1 ELSE 0 END +
    CASE WHEN ud.phone IS NOT NULL AND ud.phone != '' THEN 1 ELSE 0 END +
    CASE WHEN ud.profile_photo_url IS NOT NULL THEN 1 ELSE 0 END
  ) as basic_fields_completed,
  5 as basic_fields_total,
  (
    CASE WHEN ud.bio IS NOT NULL AND ud.bio != '' THEN 1 ELSE 0 END +
    CASE WHEN ud.location IS NOT NULL AND ud.location != '' THEN 1 ELSE 0 END +
    CASE WHEN ud.experience_years > 0 THEN 1 ELSE 0 END +
    CASE WHEN COALESCE(sc.count, 0) > 0 THEN 1 ELSE 0 END +
    CASE WHEN ud.hourly_rate > 0 THEN 1 ELSE 0 END +
    CASE WHEN ud.registration_number IS NOT NULL AND ud.registration_number != '' THEN 1 ELSE 0 END +
    CASE WHEN COALESCE(qc.count, 0) > 0 THEN 1 ELSE 0 END
  ) as professional_fields_completed,
  7 as professional_fields_total,
  (
    CASE WHEN ud.first_name IS NOT NULL AND ud.first_name != '' THEN 1 ELSE 0 END +
    CASE WHEN ud.last_name IS NOT NULL AND ud.last_name != '' THEN 1 ELSE 0 END +
    CASE WHEN ud.email IS NOT NULL AND ud.email != '' THEN 1 ELSE 0 END +
    CASE WHEN ud.phone IS NOT NULL AND ud.phone != '' THEN 1 ELSE 0 END +
    CASE WHEN ud.profile_photo_url IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN ud.bio IS NOT NULL AND ud.bio != '' THEN 1 ELSE 0 END +
    CASE WHEN ud.location IS NOT NULL AND ud.location != '' THEN 1 ELSE 0 END +
    CASE WHEN ud.experience_years > 0 THEN 1 ELSE 0 END +
    CASE WHEN COALESCE(sc.count, 0) > 0 THEN 1 ELSE 0 END +
    CASE WHEN ud.hourly_rate > 0 THEN 1 ELSE 0 END +
    CASE WHEN ud.registration_number IS NOT NULL AND ud.registration_number != '' THEN 1 ELSE 0 END +
    CASE WHEN COALESCE(qc.count, 0) > 0 THEN 1 ELSE 0 END
  ) as total_fields_completed,
  12 as total_fields_total
FROM user_data ud
LEFT JOIN specialization_count sc ON sc.practitioner_id = ud.id
LEFT JOIN qualification_count qc ON qc.practitioner_id = ud.id
LEFT JOIN therapist_profile_check tpc ON tpc.user_id = ud.id;

-- ============================================================
-- EXPECTED RESULTS AFTER FIXES:
-- ============================================================
-- ✅ first_name_status: Should be ✅ (not empty)
-- ✅ last_name_status: Should be ✅ (not empty)
-- ✅ specialization_status: Should be ✅ (count > 0)
-- ✅ qualification_status: Should be ✅ (count > 0) if qualification_type is set
-- ✅ Profile completion should be higher than 42%

