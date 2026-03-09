-- Reduce pending_payment hold time from 15 minutes to 5 minutes
-- This prevents abandoned bookings from blocking slots for too long
-- Per requirements: "Selecting a slot places a temporary hold (e.g., 5 minutes)"

-- Update the trigger function to use 5 minutes instead of 15
CREATE OR REPLACE FUNCTION public.enforce_paid_before_schedule()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Auto-populate expires_at for pending_payment holds (reduced to 5 minutes)
  IF NEW.status = 'pending_payment' AND NEW.expires_at IS NULL THEN
    NEW.expires_at := NOW() + INTERVAL '5 minutes';
  END IF;

  -- Prevent moving to scheduled unless there is a succeeded/completed payment
  IF NEW.status = 'scheduled' THEN
    IF TG_OP = 'UPDATE' THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.payments p
        WHERE p.session_id = NEW.id
          AND p.payment_status IN ('succeeded','completed')
      ) THEN
        RAISE EXCEPTION 'Cannot set session to scheduled without a successful payment'
          USING ERRCODE = '23514';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update the create_booking_with_validation function to use 5 minutes
CREATE OR REPLACE FUNCTION public.create_booking_with_validation(
  p_therapist_id UUID,
  p_client_id UUID,
  p_session_date DATE,
  p_start_time TIME,
  p_duration_minutes INTEGER,
  p_location TEXT DEFAULT 'In-Person'::TEXT,
  p_session_type TEXT DEFAULT 'General Session'::TEXT,
  p_notes TEXT DEFAULT NULL,
  p_client_name TEXT DEFAULT NULL,
  p_client_email TEXT DEFAULT NULL,
  p_client_phone TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'pending_payment'::TEXT,
  p_stripe_payment_intent_id TEXT DEFAULT NULL,
  p_platform_fee_amount NUMERIC DEFAULT 0,
  p_practitioner_amount NUMERIC DEFAULT 0,
  p_expires_at TIMESTAMPTZ DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id UUID;
  v_day_of_week TEXT;
  v_working_hours JSONB;
  v_is_working_day BOOLEAN;
  v_start_hour INTEGER;
  v_end_hour INTEGER;
  v_booking_start TIMESTAMP;
  v_booking_end TIMESTAMP;
  v_buffer_minutes INTEGER := 15;
BEGIN
  -- Validation logic
  IF p_therapist_id IS NULL OR p_session_date IS NULL OR p_start_time IS NULL OR p_duration_minutes IS NULL THEN
    RAISE EXCEPTION 'Missing required parameters';
  END IF;

  IF p_session_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Cannot book sessions in the past';
  END IF;

  IF p_duration_minutes NOT IN (30, 45, 60, 75, 90) THEN
    RAISE EXCEPTION 'Invalid duration. Must be 30, 45, 60, 75, or 90 minutes';
  END IF;

  -- Check working hours
  v_day_of_week := LOWER(TO_CHAR(p_session_date, 'Day'));
  v_day_of_week := TRIM(v_day_of_week);

  SELECT working_hours INTO v_working_hours
  FROM practitioner_availability
  WHERE user_id = p_therapist_id;

  IF v_working_hours IS NULL THEN
    RAISE EXCEPTION 'Practitioner availability not configured';
  END IF;

  v_is_working_day := COALESCE((v_working_hours->v_day_of_week->>'enabled')::BOOLEAN, FALSE);
  
  IF NOT v_is_working_day THEN
    RAISE EXCEPTION 'Practitioner is not working on %', v_day_of_week;
  END IF;

  -- Check for booking conflicts with buffer
  v_booking_start := (p_session_date || ' ' || p_start_time)::TIMESTAMP;
  v_booking_end := v_booking_start + (p_duration_minutes || ' minutes')::INTERVAL;

  IF EXISTS (
    SELECT 1 FROM client_sessions cs
    WHERE cs.therapist_id = p_therapist_id
      AND cs.session_date = p_session_date
      AND cs.status IN ('scheduled', 'confirmed', 'in_progress')
      AND (
        -- Booking overlaps existing session
        (v_booking_start, v_booking_end) OVERLAPS 
        ((cs.session_date || ' ' || cs.start_time)::TIMESTAMP, 
         (cs.session_date || ' ' || cs.start_time)::TIMESTAMP + (cs.duration_minutes || ' minutes')::INTERVAL)
        OR
        -- Booking is within buffer after existing session
        (v_booking_start >= (cs.session_date || ' ' || cs.start_time)::TIMESTAMP + (cs.duration_minutes || ' minutes')::INTERVAL
         AND v_booking_start < (cs.session_date || ' ' || cs.start_time)::TIMESTAMP + (cs.duration_minutes + v_buffer_minutes || ' minutes')::INTERVAL)
      )
  ) THEN
    RAISE EXCEPTION 'This time slot conflicts with an existing booking (including 15-minute buffer)';
  END IF;

  -- Check for pending_payment holds that haven't expired
  IF EXISTS (
    SELECT 1 FROM client_sessions cs
    WHERE cs.therapist_id = p_therapist_id
      AND cs.session_date = p_session_date
      AND cs.status = 'pending_payment'
      AND cs.expires_at IS NOT NULL
      AND cs.expires_at > NOW()
      AND (v_booking_start, v_booking_end) OVERLAPS 
          ((cs.session_date || ' ' || cs.start_time)::TIMESTAMP, 
           (cs.session_date || ' ' || cs.start_time)::TIMESTAMP + (cs.duration_minutes || ' minutes')::INTERVAL)
  ) THEN
    RAISE EXCEPTION 'This time slot is temporarily held by another booking attempt';
  END IF;

  -- Check for blocked time
  IF EXISTS (
    SELECT 1 FROM blocked_time bt
    WHERE bt.practitioner_id = p_therapist_id
      AND bt.blocked_date = p_session_date
      AND (v_booking_start, v_booking_end) OVERLAPS 
          ((bt.blocked_date || ' ' || bt.start_time)::TIMESTAMP,
           (bt.blocked_date || ' ' || bt.end_time)::TIMESTAMP)
  ) THEN
    RAISE EXCEPTION 'This time slot is blocked by the practitioner';
  END IF;

  -- Create the booking (using 5 minutes hold time)
  INSERT INTO client_sessions (
    therapist_id,
    client_id,
    session_date,
    start_time,
    duration_minutes,
    location,
    session_type,
    notes,
    client_name,
    client_email,
    client_phone,
    status,
    stripe_payment_intent_id,
    platform_fee_amount,
    practitioner_amount,
    expires_at,
    idempotency_key
  )
  VALUES (
    p_therapist_id,
    p_client_id,
    p_session_date,
    p_start_time,
    p_duration_minutes,
    p_location,
    p_session_type,
    p_notes,
    p_client_name,
    p_client_email,
    p_client_phone,
    p_status,
    p_stripe_payment_intent_id,
    p_platform_fee_amount,
    p_practitioner_amount,
    -- Changed to 5 minutes
    COALESCE(p_expires_at, CASE WHEN p_status = 'pending_payment' THEN NOW() + INTERVAL '5 minutes' ELSE NULL END),
    p_idempotency_key
  )
  RETURNING id INTO v_session_id;

  RETURN v_session_id;
END;
$$;

COMMENT ON FUNCTION public.create_booking_with_validation IS 'Creates a booking with comprehensive validation and 5-minute hold time for pending payments';
