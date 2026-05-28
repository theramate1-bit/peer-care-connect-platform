-- Fix RLS policies for payments table to allow users to read payment records
-- This allows authenticated users (including guest users after they're created) to check payment status

-- Drop existing restrictive SELECT policy if it exists
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;

-- Create more permissive SELECT policy for payments
-- Allow users to read payments where they are the user_id or therapist_id
-- Also allow reading payments for sessions where they are the client
CREATE POLICY "Users can view payments related to them"
  ON public.payments FOR SELECT
  USING (
    -- Authenticated users can see their own payments
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR (auth.uid() IS NOT NULL AND auth.uid() = therapist_id)
    -- OR payment is for a session where they are the client
    OR EXISTS (
      SELECT 1 FROM public.client_sessions cs
      WHERE cs.id = payments.session_id
      AND auth.uid() IS NOT NULL
      AND cs.client_id = auth.uid()
    )
  );

-- Keep existing INSERT policy for authenticated users
-- Note: Guest users don't INSERT payments directly - payments are created via Edge Functions

COMMENT ON POLICY "Users can view payments related to them" ON public.payments IS 
  'Allows authenticated users to view payments related to their sessions';

