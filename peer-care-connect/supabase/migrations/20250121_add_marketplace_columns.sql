-- Add missing marketplace columns to users table
-- This migration adds the columns needed for the marketplace to work

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS hourly_rate INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS specializations TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS experience_years INTEGER DEFAULT 0;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_hourly_rate ON public.users(hourly_rate);
CREATE INDEX IF NOT EXISTS idx_users_experience_years ON public.users(experience_years);
CREATE INDEX IF NOT EXISTS idx_users_specializations ON public.users USING GIN(specializations);

-- Update existing practitioners with sample data
UPDATE public.users 
SET 
  hourly_rate = CASE 
    WHEN user_role = 'sports_therapist' THEN 80
    WHEN user_role = 'massage_therapist' THEN 65
    WHEN user_role = 'osteopath' THEN 75
    ELSE 70
  END,
  specializations = CASE 
    WHEN user_role = 'sports_therapist' THEN ARRAY['Sports Injury Rehabilitation', 'Performance Training']
    WHEN user_role = 'massage_therapist' THEN ARRAY['Deep Tissue Massage', 'Sports Massage']
    WHEN user_role = 'osteopath' THEN ARRAY['Osteopathy', 'Manual Therapy']
    ELSE ARRAY['General Practice']
  END,
  experience_years = CASE 
    WHEN user_role = 'sports_therapist' THEN 8
    WHEN user_role = 'massage_therapist' THEN 5
    WHEN user_role = 'osteopath' THEN 6
    ELSE 3
  END,
  is_active = true,
  bio = CASE 
    WHEN user_role = 'sports_therapist' THEN 'Experienced sports therapist specializing in injury rehabilitation and performance optimization.'
    WHEN user_role = 'massage_therapist' THEN 'Licensed massage therapist with expertise in deep tissue and sports massage.'
    WHEN user_role = 'osteopath' THEN 'Qualified osteopath focusing on holistic treatment of musculoskeletal conditions.'
    ELSE 'Professional healthcare practitioner.'
  END,
  location = COALESCE(location, 'London, UK')
WHERE user_role IN ('sports_therapist', 'massage_therapist', 'osteopath');
