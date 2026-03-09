-- Migration: Enforce 15-minute buffer between appointments and restrict service durations
-- This migration updates the booking validation RPC to enforce:
-- 1. 15-minute buffer after every appointment
-- 2. Service durations restricted to 30, 45, 60, 75, 90 minutes

-- First, add duration validation at the start of the function
-- We'll modify the existing function by adding checks before the conflict check

-- Add duration validation check (insert after line 107, before idempotency check)
DO $$
BEGIN
  -- Add duration validation if not already present
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_proc_oid(p.oid) ON p.proname = 'create_booking_with_validation'
    WHERE p.prosrc LIKE '%INVALID_DURATION%'
  ) THEN
    -- Duration validation will be added via ALTER FUNCTION
    NULL;
  END IF;
END $$;

-- Update the conflict check section to include buffer enforcement
-- This modifies the existing function to add buffer checks
CREATE OR REPLACE FUNCTION public.create_booking_with_validation(
  p_therapist_id UUID,
  p_client_id UUID,
  p_client_name TEXT,
  p_client_email TEXT,
  p_client_phone TEXT,
  p_session_date DATE,
  p_start_time TIME,
  p_duration_minutes INTEGER,
  p_session_type TEXT,
  p_price NUMERIC,
  p_notes TEXT,
  p_payment_status TEXT DEFAULT 'pending',
  p_status TEXT DEFAULT 'pending_payment',
  p_idempotency_key UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_start TIMESTAMPTZ;
  v_booking_end TIMESTAMPTZ;
  v_booking_with_buffer_end TIMESTAMPTZ;
  v_conflict_exists BOOLEAN;
  v_blocked_exists BOOLEAN;
  v_existing_idempotency UUID;
  v_buffer_minutes INTEGER := 15;
  v_allowed_durations INTEGER[] := ARRAY[30, 45, 60, 75, 90];
BEGIN
  -- Validate service duration is in allowed increments
  IF NOT (p_duration_minutes = ANY(v_allowed_durations)) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_DURATION',
      'error_message', 'Service duration must be 30, 45, 60, 75, or 90 minutes'
    );
  END IF;

  -- Check idempotency key
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_existing_idempotency
    FROM client_sessions
    WHERE idempotency_key = p_idempotency_key
    LIMIT 1;
    
    IF v_existing_idempotency IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'DUPLICATE_REQUEST',
        'error_message', 'This booking request has already been processed',
        'session_id', v_existing_idempotency
      );
    END IF;
  END IF;

  -- Validate date is not in the past
  IF p_session_date < CURRENT_DATE THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_DATE',
      'error_message', 'Cannot book sessions in the past'
    );
  END IF;

  -- Calculate booking time range with buffer
  v_booking_start := (p_session_date::text || ' ' || p_start_time::text)::timestamptz;
  v_booking_end := v_booking_start + (p_duration_minutes || ' minutes')::interval;
  v_booking_with_buffer_end := v_booking_end + (v_buffer_minutes || ' minutes')::interval;

  -- Use advisory lock to prevent concurrent bookings
  PERFORM pg_advisory_xact_lock(hashtext(p_therapist_id::text || p_session_date::text || p_start_time::text));

  -- Check for existing bookings with buffer enforcement
  -- Conflict occurs if:
  -- 1. New booking overlaps with existing booking
  -- 2. New booking starts within buffer period after existing booking
  -- 3. Existing booking starts within buffer period after new booking
  SELECT EXISTS (
    SELECT 1
    FROM client_sessions
    WHERE (therapist_id = p_therapist_id OR client_id = p_therapist_id)
      AND session_date = p_session_date
      AND status IN ('scheduled', 'confirmed', 'in_progress', 'pending_payment')
      AND ((status = 'pending_payment' AND expires_at IS NOT NULL AND expires_at > NOW()) OR status != 'pending_payment')
      AND (
        -- Direct overlap: new booking overlaps with existing booking
        ((p_start_time::time < (start_time::time + (COALESCE(duration_minutes, 60) || ' minutes')::interval))
         AND ((start_time::time + (COALESCE(duration_minutes, 60) || ' minutes')::interval) > p_start_time::time))
        OR
        -- New booking starts within buffer after existing booking
        (p_start_time::time >= (start_time::time + (COALESCE(duration_minutes, 60) || ' minutes')::interval)
         AND p_start_time::time < (start_time::time + (COALESCE(duration_minutes, 60) || ' minutes')::interval + (v_buffer_minutes || ' minutes')::interval))
        OR
        -- Existing booking starts within buffer after new booking
        (start_time::time >= (p_start_time::time + (p_duration_minutes || ' minutes')::interval)
         AND start_time::time < (p_start_time::time + (p_duration_minutes || ' minutes')::interval + (v_buffer_minutes || ' minutes')::interval))
      )
    FOR UPDATE
  ) INTO v_conflict_exists;

  IF v_conflict_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'CONFLICT_BOOKING',
      'error_message', 'This time slot conflicts with an existing booking or violates the 15-minute buffer requirement. Please select another time.'
    );
  END IF;

  -- Check for blocked/unavailable time
  SELECT EXISTS (
    SELECT 1
    FROM calendar_events
    WHERE user_id = p_therapist_id
      AND event_type IN ('block', 'unavailable')
      AND status = 'confirmed'
      AND (start_time < v_booking_with_buffer_end AND end_time > v_booking_start)
  ) INTO v_blocked_exists;

  IF v_blocked_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'CONFLICT_BLOCKED',
      'error_message', 'This time slot is blocked or unavailable. Please select another time.'
    );
  END IF;

  -- All validations passed, create the booking
  INSERT INTO client_sessions (
    therapist_id,
    client_id,
    client_name,
    client_email,
    client_phone,
    session_date,
    start_time,
    duration_minutes,
    session_type,
    price,
    notes,
    payment_status,
    status,
    idempotency_key
  ) VALUES (
    p_therapist_id,
    p_client_id,
    p_client_name,
    p_client_email,
    p_client_phone,
    p_session_date,
    p_start_time,
    p_duration_minutes,
    p_session_type,
    p_price,
    p_notes,
    p_payment_status,
    p_status,
    p_idempotency_key
  )
  RETURNING id INTO v_existing_idempotency;

  -- Broadcast availability change via NOTIFY
  PERFORM pg_notify(
    'availability_changes',
    jsonb_build_object(
      'practitioner_id', p_therapist_id,
      'session_date', p_session_date,
      'change_type', 'booking_created',
      'session_id', v_existing_idempotency
    )::text
  );

  RETURN jsonb_build_object(
    'success', true,
    'session_id', v_existing_idempotency
  );

EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'CONFLICT_BOOKING',
      'error_message', 'This time slot is already booked. Please select another time.'
    );
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'DATABASE_ERROR',
      'error_message', SQLERRM
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_booking_with_validation TO authenticated, anon;

-- Add constraint to practitioner_products to enforce allowed durations
-- Note: This will only affect new records, existing records will need to be updated manually
ALTER TABLE public.practitioner_products
ADD CONSTRAINT check_duration_allowed 
CHECK (duration_minutes IS NULL OR duration_minutes IN (30, 45, 60, 75, 90));

-- Add constraint to practitioner_product_durations to enforce allowed durations
ALTER TABLE public.practitioner_product_durations
ADD CONSTRAINT check_duration_allowed 
CHECK (duration_minutes IN (30, 45, 60, 75, 90));

-- Add comment explaining the buffer requirement
COMMENT ON FUNCTION public.create_booking_with_validation IS 
'Creates a booking with validation. Enforces 15-minute buffer between appointments and restricts service durations to 30, 45, 60, 75, or 90 minutes.';

