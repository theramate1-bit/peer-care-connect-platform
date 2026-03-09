-- Migration: Fix slot_holds RLS with direct subquery
-- Created: 2025-12-23
-- Description: Alternative approach using direct subquery in policy

-- Alternative approach: Use direct subquery in policy instead of function
-- This should work better in RLS contexts

DROP POLICY IF EXISTS "Users can create slot holds for treatment exchange" ON slot_holds;

-- Create policy with direct subquery that references the NEW row's practitioner_id
-- In WITH CHECK clauses, columns refer to the NEW row being inserted
CREATE POLICY "Users can create slot holds for treatment exchange" ON slot_holds
  FOR INSERT 
  WITH CHECK (
    -- Practitioners can create holds for themselves
    auth.uid() = practitioner_id
    OR
    -- Any authenticated user can create holds for valid practitioners
    -- Direct subquery should work better than function in RLS context
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = practitioner_id
      AND user_role IN ('sports_therapist', 'massage_therapist', 'osteopath')
      AND is_active = true
    )
  );

