-- Migration: Fix ambiguous column reference in RPC function
-- Created: 2025-12-23
-- Description: Fully qualify all column references to avoid ambiguity

-- Fix ambiguous column reference "id" in the RPC function
-- The issue is in the RETURN QUERY - need to fully qualify all column references

DROP FUNCTION IF EXISTS public.create_slot_hold_for_treatment_exchange(
  UUID, UUID, DATE, TIME, TIME, INTEGER, TIMESTAMP
);

CREATE OR REPLACE FUNCTION public.create_slot_hold_for_treatment_exchange(
  p_practitioner_id UUID,
  p_request_id UUID,
  p_session_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_duration_minutes INTEGER,
  p_expires_at TIMESTAMP
)
RETURNS TABLE (
  id UUID,
  practitioner_id UUID,
  request_id UUID,
  session_date DATE,
  start_time TIME,
  end_time TIME,
  duration_minutes INTEGER,
  expires_at TIMESTAMP,
  status TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
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
    WHERE users.id = p_practitioner_id
    AND users.user_role IN ('sports_therapist', 'massage_therapist', 'osteopath')
    AND users.is_active = true
    AND users.profile_completed = true
    AND users.onboarding_status = 'completed'
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
  ) RETURNING slot_holds.id INTO v_slot_hold_id;
  
  -- Return the full slot hold record - fully qualify all column references
  RETURN QUERY
  SELECT 
    slot_holds.id,
    slot_holds.practitioner_id,
    slot_holds.request_id,
    slot_holds.session_date,
    slot_holds.start_time,
    slot_holds.end_time,
    slot_holds.duration_minutes,
    slot_holds.expires_at,
    slot_holds.status,
    slot_holds.created_at,
    slot_holds.updated_at
  FROM public.slot_holds
  WHERE slot_holds.id = v_slot_hold_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.create_slot_hold_for_treatment_exchange(
  UUID, UUID, DATE, TIME, TIME, INTEGER, TIMESTAMP
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_slot_hold_for_treatment_exchange(
  UUID, UUID, DATE, TIME, TIME, INTEGER, TIMESTAMP
) TO anon;

