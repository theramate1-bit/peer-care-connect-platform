-- Migration: Fix slot_holds RLS using proper SECURITY DEFINER function
-- Created: 2025-12-23
-- Description: Create a SECURITY DEFINER function that properly bypasses RLS for the policy check

-- The real issue: RLS policies in WITH CHECK clauses can't reliably use subqueries
-- that depend on other tables' RLS policies. We need a SECURITY DEFINER function
-- that can be called from the policy and actually bypasses RLS properly

CREATE OR REPLACE FUNCTION public.check_practitioner_valid_for_slot_hold(practitioner_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  -- This function runs with SECURITY DEFINER, so it bypasses RLS on users table
  -- It can check if the practitioner is valid without RLS restrictions
  RETURN EXISTS (
    SELECT 1 
    FROM public.users 
    WHERE id = practitioner_uuid
    AND user_role IN ('sports_therapist', 'massage_therapist', 'osteopath')
    AND is_active = true
    AND profile_completed = true
    AND onboarding_status = 'completed'
  );
END;
$$;

-- Grant execute to authenticated
GRANT EXECUTE ON FUNCTION public.check_practitioner_valid_for_slot_hold(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_practitioner_valid_for_slot_hold(UUID) TO anon;

-- Now update the policy to use this function
DROP POLICY IF EXISTS "Users can create slot holds for treatment exchange" ON slot_holds;

CREATE POLICY "Users can create slot holds for treatment exchange" ON slot_holds
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      auth.uid() = practitioner_id
      OR
      public.check_practitioner_valid_for_slot_hold(practitioner_id)
    )
  );

