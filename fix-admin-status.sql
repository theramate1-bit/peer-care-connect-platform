-- Fix onboarding status for admin@pinpointtherapyuk.com
-- Run this in Supabase Dashboard > SQL Editor

UPDATE public.users
SET 
  onboarding_status = 'completed',
  profile_completed = true,
  treatment_exchange_enabled = true,
  is_active = true,
  updated_at = NOW()
WHERE email = 'admin@pinpointtherapyuk.com';

-- Verify the fix
SELECT 
  email,
  onboarding_status,
  profile_completed,
  treatment_exchange_enabled,
  is_active,
  user_role,
  updated_at
FROM public.users
WHERE email = 'admin@pinpointtherapyuk.com';
