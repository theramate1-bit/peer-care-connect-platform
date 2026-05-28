-- Migration: Fix slot_holds RLS to match users table RLS requirements
-- Created: 2025-12-23
-- Description: Update function to check profile_completed and onboarding_status to match users table RLS

-- Fix: The users table RLS requires profile_completed and onboarding_status checks
-- Update function and policy to match the users table RLS requirements

CREATE OR REPLACE FUNCTION can_create_slot_hold(practitioner_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
DECLARE
  result BOOLEAN;
BEGIN
  -- Check if the practitioner exists and is valid
  -- Match the RLS policy requirements on users table:
  -- - user_role must be a practitioner type
  -- - is_active = true
  -- - profile_completed = true (required by users RLS)
  -- - onboarding_status = 'completed' (required by users RLS)
  SELECT EXISTS (
    SELECT 1 
    FROM public.users 
    WHERE id = practitioner_uuid
    AND user_role IN ('sports_therapist', 'massage_therapist', 'osteopath')
    AND is_active = true
    AND profile_completed = true
    AND onboarding_status = 'completed'
  ) INTO result;
  
  RETURN COALESCE(result, false);
END;
$$;

-- Update the policy to use the function
DROP POLICY IF EXISTS "Users can create slot holds for treatment exchange" ON slot_holds;

CREATE POLICY "Users can create slot holds for treatment exchange" ON slot_holds
  FOR INSERT 
  TO public
  WITH CHECK (
    -- Practitioners can create holds for themselves
    auth.uid() = practitioner_id
    OR
    -- Any authenticated user can create holds for valid practitioners
    -- Use function (SECURITY DEFINER bypasses RLS) which checks all required conditions
    can_create_slot_hold(practitioner_id)
  );

