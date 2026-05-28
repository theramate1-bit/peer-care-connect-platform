-- Fix inconsistent user role defaults
-- This migration ensures consistent default user roles across the application

-- Update the default user_role to 'client' for new users
ALTER TABLE public.users 
ALTER COLUMN user_role SET DEFAULT 'client';

-- Update any existing users with NULL user_role to 'client'
UPDATE public.users 
SET user_role = 'client' 
WHERE user_role IS NULL;

-- Ensure onboarding_status is properly set for all users
UPDATE public.users 
SET onboarding_status = 'pending' 
WHERE onboarding_status IS NULL;

-- Ensure profile_completed is properly set for all users
UPDATE public.users 
SET profile_completed = false 
WHERE profile_completed IS NULL;

-- Add a check constraint to ensure user_role is never NULL
ALTER TABLE public.users 
ALTER COLUMN user_role SET NOT NULL;

ALTER TABLE public.users 
ALTER COLUMN onboarding_status SET NOT NULL;

ALTER TABLE public.users 
ALTER COLUMN profile_completed SET NOT NULL;
