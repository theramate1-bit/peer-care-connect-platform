-- Fix onboarding status for admin@pinpointtherapyuk.com
-- This user completed onboarding but the status wasn't properly updated
-- Issue: The completion function didn't properly update the database

UPDATE public.users
SET 
  onboarding_status = 'completed',
  profile_completed = true,
  treatment_exchange_enabled = true,
  is_active = true,
  updated_at = NOW()
WHERE email = 'admin@pinpointtherapyuk.com';

-- Verify the fix
DO $$
DECLARE
  v_status TEXT;
  v_completed BOOLEAN;
BEGIN
  SELECT onboarding_status::text, profile_completed 
  INTO v_status, v_completed
  FROM public.users 
  WHERE email = 'admin@pinpointtherapyuk.com';
  
  IF v_status = 'completed' AND v_completed = true THEN
    RAISE NOTICE '✅ Successfully fixed onboarding status for admin@pinpointtherapyuk.com';
  ELSE
    RAISE WARNING '❌ Failed to fix status. Current: status=%, completed=%', v_status, v_completed;
  END IF;
END $$;
