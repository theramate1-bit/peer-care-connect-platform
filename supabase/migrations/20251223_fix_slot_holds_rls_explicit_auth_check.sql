-- Migration: Fix slot_holds RLS with explicit authentication check
-- Created: 2025-12-23
-- Description: Ensure policy explicitly checks for authenticated users and uses correct column references

-- Ensure the policy explicitly checks for authenticated users
-- and uses the correct column reference in WITH CHECK

DROP POLICY IF EXISTS "Users can create slot holds for treatment exchange" ON slot_holds;

-- Create policy with explicit authentication check
-- In WITH CHECK clauses, columns refer to the NEW row being inserted
CREATE POLICY "Users can create slot holds for treatment exchange" ON slot_holds
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    -- Ensure user is authenticated
    auth.uid() IS NOT NULL
    AND (
      -- Practitioners can create holds for themselves
      auth.uid() = practitioner_id
      OR
      -- Any authenticated user can create holds for valid practitioners
      -- The subquery will work because authenticated users can read practitioner profiles
      EXISTS (
        SELECT 1 
        FROM public.users 
        WHERE users.id = practitioner_id
        AND users.user_role IN ('sports_therapist', 'massage_therapist', 'osteopath')
        AND users.is_active = true
        AND users.profile_completed = true
        AND users.onboarding_status = 'completed'
      )
    )
  );

