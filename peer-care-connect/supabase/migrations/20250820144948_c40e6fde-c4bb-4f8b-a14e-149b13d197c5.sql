-- Add registration_number field to therapist_profiles table
ALTER TABLE public.therapist_profiles 
ADD COLUMN IF NOT EXISTS registration_number character varying;