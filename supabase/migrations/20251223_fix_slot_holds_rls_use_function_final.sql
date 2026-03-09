-- Migration: Fix slot_holds RLS to use function
-- Created: 2025-12-23
-- Description: Use SECURITY DEFINER function in policy after fixing function permissions

-- Use the SECURITY DEFINER function in the policy
-- The function has been updated with proper search_path and should work now

DROP POLICY IF EXISTS "Users can create slot holds for treatment exchange" ON slot_holds;

CREATE POLICY "Users can create slot holds for treatment exchange" ON slot_holds
  FOR INSERT 
  WITH CHECK (
    -- Practitioners can create holds for themselves
    auth.uid() = practitioner_id
    OR
    -- Any authenticated user can create holds for valid practitioners
    -- Use the SECURITY DEFINER function which bypasses RLS on users table
    can_create_slot_hold(practitioner_id)
  );

