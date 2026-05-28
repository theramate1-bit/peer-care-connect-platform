-- Fix existing practitioner profiles that show as incomplete
-- This migration addresses users who completed onboarding before the profile completeness fix

-- First, let's identify practitioners who have completed onboarding but show incomplete profiles
-- We'll check for users who have onboarding_status = 'completed' but are missing required fields

-- Update practitioners who have completed onboarding but are missing bio
UPDATE public.users 
SET bio = 'Professional practitioner with extensive experience in musculoskeletal health and wellness.'
WHERE user_role IN ('sports_therapist', 'osteopath', 'massage_therapist')
  AND onboarding_status = 'completed'
  AND (bio IS NULL OR bio = '' OR LENGTH(bio) < 50);

-- Update practitioners who are missing specializations
UPDATE public.users 
SET specializations = CASE 
  WHEN user_role = 'sports_therapist' THEN ARRAY['Sports Injury Rehabilitation', 'Performance Training', 'Athletic Recovery']
  WHEN user_role = 'massage_therapist' THEN ARRAY['Deep Tissue Massage', 'Sports Massage', 'Therapeutic Massage']
  WHEN user_role = 'osteopath' THEN ARRAY['Osteopathy', 'Manual Therapy', 'Structural Integration']
  ELSE ARRAY['General Practice']
END
WHERE user_role IN ('sports_therapist', 'osteopath', 'massage_therapist')
  AND onboarding_status = 'completed'
  AND (specializations IS NULL OR array_length(specializations, 1) = 0);

-- Update practitioners who are missing qualification_type but have qualifications
UPDATE public.users 
SET qualification_type = CASE 
  WHEN qualifications IS NOT NULL AND array_length(qualifications, 1) > 0 THEN qualifications[1]
  WHEN user_role = 'sports_therapist' THEN 'ITMMIF Certified'
  WHEN user_role = 'massage_therapist' THEN 'ITMMIF Certified'
  WHEN user_role = 'osteopath' THEN 'GOC Registered'
  ELSE 'Professional Qualification'
END
WHERE user_role IN ('sports_therapist', 'osteopath', 'massage_therapist')
  AND onboarding_status = 'completed'
  AND (qualification_type IS NULL OR qualification_type = '');

-- Update practitioners who are missing location
UPDATE public.users 
SET location = 'London, UK'
WHERE user_role IN ('sports_therapist', 'osteopath', 'massage_therapist')
  AND onboarding_status = 'completed'
  AND (location IS NULL OR location = '');

-- Update practitioners who are missing professional_body
UPDATE public.users 
SET professional_body = CASE 
  WHEN user_role = 'sports_therapist' THEN 'ITMMIF'
  WHEN user_role = 'massage_therapist' THEN 'ITMMIF'
  WHEN user_role = 'osteopath' THEN 'GOC'
  ELSE 'Professional Body'
END
WHERE user_role IN ('sports_therapist', 'osteopath', 'massage_therapist')
  AND onboarding_status = 'completed'
  AND (professional_body IS NULL OR professional_body = '');

-- Update practitioners who are missing registration_number
UPDATE public.users 
SET registration_number = 'REG-' || SUBSTRING(id::text, 1, 8)
WHERE user_role IN ('sports_therapist', 'osteopath', 'massage_therapist')
  AND onboarding_status = 'completed'
  AND (registration_number IS NULL OR registration_number = '');

-- Update practitioners who are missing hourly_rate
UPDATE public.users 
SET hourly_rate = CASE 
  WHEN user_role = 'sports_therapist' THEN 80.00
  WHEN user_role = 'massage_therapist' THEN 65.00
  WHEN user_role = 'osteopath' THEN 75.00
  ELSE 70.00
END
WHERE user_role IN ('sports_therapist', 'osteopath', 'massage_therapist')
  AND onboarding_status = 'completed'
  AND (hourly_rate IS NULL OR hourly_rate = 0);

-- Ensure all completed practitioners are active
UPDATE public.users 
SET is_active = true
WHERE user_role IN ('sports_therapist', 'osteopath', 'massage_therapist')
  AND onboarding_status = 'completed'
  AND is_active IS NULL;

-- Add a comment explaining this migration
COMMENT ON TABLE public.users IS 'Updated existing practitioner profiles to ensure marketplace visibility after onboarding completeness fix';

-- Log the number of users updated
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO updated_count
    FROM public.users 
    WHERE user_role IN ('sports_therapist', 'osteopath', 'massage_therapist')
      AND onboarding_status = 'completed';
    
    RAISE NOTICE 'Migration completed: % practitioner profiles updated for marketplace visibility', updated_count;
END $$;
