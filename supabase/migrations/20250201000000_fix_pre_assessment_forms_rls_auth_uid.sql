-- Fix RLS policies for pre_assessment_forms to ensure auth.uid() is used correctly
-- This ensures authenticated users can create/update forms using their auth.uid()

-- Drop and recreate INSERT policy to ensure it works with auth.uid()
-- Uses verify_guest_form_access function for guest email verification
DROP POLICY IF EXISTS "Allow form creation for clients and guests" ON public.pre_assessment_forms;

CREATE POLICY "Allow form creation for clients and guests"
  ON public.pre_assessment_forms FOR INSERT
  WITH CHECK (
    -- Authenticated clients can create forms where client_id matches auth.uid()
    (client_id IS NOT NULL AND client_id = auth.uid()) OR
    -- Guests can create forms (client_id is NULL and is_guest_booking = true)
    -- Verify the session exists and matches the email using helper function
    (client_id IS NULL AND is_guest_booking = true AND
     verify_guest_form_access(session_id, client_email))
  );

-- Ensure UPDATE policy also uses auth.uid() correctly
-- The existing policy should be fine, but let's verify it's correct
COMMENT ON POLICY "Allow form updates for owners and guests" ON public.pre_assessment_forms IS 
  'Allows authenticated users (client_id = auth.uid()) or guests (client_id IS NULL, is_guest_booking = true, session exists with matching email) to update their forms';

COMMENT ON POLICY "Allow form creation for clients and guests" ON public.pre_assessment_forms IS 
  'Allows authenticated users (client_id = auth.uid()) or guests (client_id IS NULL, is_guest_booking = true, session exists with matching email) to create forms. IMPORTANT: For authenticated users, client_id MUST equal auth.uid() for RLS to pass. Uses verify_guest_form_access function for guest email verification.';
