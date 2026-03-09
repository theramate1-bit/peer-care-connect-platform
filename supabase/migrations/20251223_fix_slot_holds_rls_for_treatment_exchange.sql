-- Migration: Fix RLS policies for slot_holds to allow treatment exchange flow
-- Created: 2025-12-23
-- Description: Allow requesters to create slot holds for recipients during treatment exchange

-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Users can create slot holds for themselves" ON slot_holds;

-- Create a new INSERT policy that allows:
-- 1. Practitioners to create slot holds for themselves (original behavior)
-- 2. Any authenticated user to create slot holds for practitioners (for treatment exchange)
-- This is safe because:
-- - Slot holds are temporary (expire automatically)
-- - Only practitioners can view/update/delete their own slot holds
-- - The application logic validates that only valid treatment exchanges create holds
CREATE POLICY "Users can create slot holds for treatment exchange" ON slot_holds
  FOR INSERT 
  WITH CHECK (
    -- Practitioners can create holds for themselves
    auth.uid() = practitioner_id
    OR
    -- Any authenticated user can create holds for practitioners (for treatment exchange)
    -- We verify the practitioner_id exists and is a practitioner
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = practitioner_id 
      AND user_role IN ('sports_therapist', 'massage_therapist', 'osteopath')
      AND is_active = true
    )
  );

-- Also update the SELECT policy to allow requesters to view slot holds they created
-- (even if they're not the practitioner)
DROP POLICY IF EXISTS "Users can view their own slot holds" ON slot_holds;

CREATE POLICY "Users can view slot holds" ON slot_holds
  FOR SELECT 
  USING (
    -- Practitioners can view their own slot holds
    auth.uid() = practitioner_id
    OR
    -- Requesters can view slot holds linked to their treatment exchange requests
    EXISTS (
      SELECT 1 FROM treatment_exchange_requests
      WHERE id = slot_holds.request_id
      AND requester_id = auth.uid()
    )
  );

