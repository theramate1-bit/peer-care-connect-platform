-- Migration: Create slot holds via database function to bypass RLS
-- Created: 2025-12-23
-- Description: Alternative approach using SECURITY DEFINER function to create slot holds

-- Alternative approach: Create a database function that creates slot holds
-- This bypasses RLS entirely and validates the practitioner in the function

CREATE OR REPLACE FUNCTION public.create_slot_hold_for_treatment_exchange(
  p_practitioner_id UUID,
  p_request_id UUID,
  p_session_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_duration_minutes INTEGER,
  p_expires_at TIMESTAMP
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slot_hold_id UUID;
  v_requester_id UUID;
BEGIN
  -- Get the current authenticated user
  v_requester_id := auth.uid();
  
  IF v_requester_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  -- Validate that the practitioner is valid (bypasses RLS due to SECURITY DEFINER)
  IF NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = p_practitioner_id
    AND user_role IN ('sports_therapist', 'massage_therapist', 'osteopath')
    AND is_active = true
    AND profile_completed = true
    AND onboarding_status = 'completed'
  ) THEN
    RAISE EXCEPTION 'Invalid practitioner for slot hold';
  END IF;
  
  -- Create the slot hold (bypasses RLS due to SECURITY DEFINER)
  INSERT INTO public.slot_holds (
    practitioner_id,
    request_id,
    session_date,
    start_time,
    end_time,
    duration_minutes,
    expires_at,
    status
  ) VALUES (
    p_practitioner_id,
    p_request_id,
    p_session_date,
    p_start_time,
    p_end_time,
    p_duration_minutes,
    p_expires_at,
    'active'
  ) RETURNING id INTO v_slot_hold_id;
  
  RETURN v_slot_hold_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.create_slot_hold_for_treatment_exchange(
  UUID, UUID, DATE, TIME, TIME, INTEGER, TIMESTAMP
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_slot_hold_for_treatment_exchange(
  UUID, UUID, DATE, TIME, TIME, INTEGER, TIMESTAMP
) TO anon;

