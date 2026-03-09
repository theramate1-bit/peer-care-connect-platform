-- Fix RLS policies for pre_assessment_forms to allow guest (unauthenticated) access
-- Guests need to access forms via session_id and client_email matching

-- Drop existing policies that don't support guest access
DROP POLICY IF EXISTS "Clients can view their own forms" ON public.pre_assessment_forms;
DROP POLICY IF EXISTS "Allow form updates" ON public.pre_assessment_forms;

-- New SELECT policy: Allow authenticated clients, practitioners, and guests
CREATE POLICY "Allow form access for clients, practitioners, and guests"
  ON public.pre_assessment_forms FOR SELECT
  USING (
    -- Authenticated clients can view their own forms
    (client_id IS NOT NULL AND client_id = auth.uid()) OR
    -- Practitioners can view forms for their sessions
    EXISTS (
      SELECT 1 FROM public.client_sessions
      WHERE client_sessions.id = pre_assessment_forms.session_id
      AND client_sessions.therapist_id = auth.uid()
    ) OR
    -- Guests can view forms for their sessions (via session_id and client_email)
    (client_id IS NULL AND is_guest_booking = true AND
     EXISTS (
       SELECT 1 FROM public.client_sessions
       WHERE client_sessions.id = pre_assessment_forms.session_id
       AND client_sessions.client_email = pre_assessment_forms.client_email
     ))
  );

-- New UPDATE policy: Allow authenticated clients and guests to update their forms
CREATE POLICY "Allow form updates for owners and guests"
  ON public.pre_assessment_forms FOR UPDATE
  USING (
    -- Authenticated clients can update their own forms
    (client_id IS NOT NULL AND client_id = auth.uid()) OR
    -- Guests can update forms for their sessions (via session_id and client_email)
    (client_id IS NULL AND is_guest_booking = true AND
     EXISTS (
       SELECT 1 FROM public.client_sessions
       WHERE client_sessions.id = pre_assessment_forms.session_id
       AND client_sessions.client_email = pre_assessment_forms.client_email
     ))
  )
  WITH CHECK (
    -- Same conditions for WITH CHECK
    (client_id IS NOT NULL AND client_id = auth.uid()) OR
    (client_id IS NULL AND is_guest_booking = true AND
     EXISTS (
       SELECT 1 FROM public.client_sessions
       WHERE client_sessions.id = pre_assessment_forms.session_id
       AND client_sessions.client_email = pre_assessment_forms.client_email
     ))
  );

-- The INSERT policy already allows guests, but let's verify it's correct
-- If it needs updating, we'll do it here
DROP POLICY IF EXISTS "Allow form creation" ON public.pre_assessment_forms;

CREATE POLICY "Allow form creation for clients and guests"
  ON public.pre_assessment_forms FOR INSERT
  WITH CHECK (
    -- Authenticated clients can create their own forms
    (client_id IS NOT NULL AND client_id = auth.uid()) OR
    -- Guests can create forms (client_id is NULL and is_guest_booking = true)
    -- We verify the session exists and matches the email
    (client_id IS NULL AND is_guest_booking = true AND
     EXISTS (
       SELECT 1 FROM public.client_sessions
       WHERE client_sessions.id = session_id
       AND client_sessions.client_email = client_email
     ))
  );
