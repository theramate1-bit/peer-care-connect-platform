-- Update create_treatment_exchange_booking to include 15-minute buffer check
-- This ensures treatment exchange bookings respect the same buffer as regular bookings
-- Also ensures it respects 5-minute holds from regular bookings

CREATE OR REPLACE FUNCTION create_treatment_exchange_booking(
  p_therapist_id UUID,
  p_client_id UUID,
  p_client_name TEXT,
  p_client_email TEXT,
  p_client_phone TEXT DEFAULT NULL,
  p_session_date DATE,
  p_start_time TIME,
  p_duration_minutes INTEGER,
  p_session_type TEXT,
  p_price DECIMAL(10,2) DEFAULT 0,
  p_notes TEXT DEFAULT NULL,
  p_is_peer_booking BOOLEAN DEFAULT true,
  p_credit_cost INTEGER DEFAULT 0,
  p_exchange_request_id UUID DEFAULT NULL,
  p_mutual_exchange_session_id UUID DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_session_id UUID;
  v_booking_start TIMESTAMPTZ;
  v_booking_end TIMESTAMPTZ;
  v_conflict_count INTEGER;
  v_blocked_count INTEGER;
  v_existing_idempotency UUID;
  v_buffer_minutes INTEGER := 15;
BEGIN
  -- Validate basic parameters
  IF p_therapist_id IS NULL OR p_client_id IS NULL OR p_session_date IS NULL OR p_start_time IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_PARAMETERS',
      'error_message', 'Missing required parameters'
    );
  END IF;

  IF p_duration_minutes IS NULL OR p_duration_minutes <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_DURATION',
      'error_message', 'Duration must be greater than 0'
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

  -- Calculate booking time range
  v_booking_start := (p_session_date::text || ' ' || p_start_time::text)::timestamptz;
  v_booking_end := v_booking_start + (p_duration_minutes || ' minutes')::interval;

  -- Use advisory lock to prevent concurrent bookings
  PERFORM pg_advisory_xact_lock(
    hashtext(p_therapist_id::text || p_session_date::text || p_start_time::text)
  );

  -- Check for existing bookings (including 15-minute buffer)
  -- Respects 5-minute holds from regular bookings (pending_payment with expires_at > NOW())
  SELECT COUNT(*) INTO v_conflict_count
  FROM (
    SELECT id
    FROM client_sessions
    WHERE therapist_id = p_therapist_id
      AND session_date = p_session_date
      AND status IN ('scheduled', 'confirmed', 'in_progress', 'pending_payment')
      AND (
        -- Respect 5-minute holds from regular bookings
        (status = 'pending_payment' AND expires_at IS NOT NULL AND expires_at > NOW())
        OR status != 'pending_payment'
      )
      AND (
        -- Direct overlap
        (v_booking_start, v_booking_end) OVERLAPS 
        ((session_date || ' ' || start_time)::TIMESTAMP, 
         (session_date || ' ' || start_time)::TIMESTAMP + (COALESCE(duration_minutes, 60) || ' minutes')::INTERVAL)
        OR
        -- New booking starts within buffer after existing booking
        (v_booking_start >= (session_date || ' ' || start_time)::TIMESTAMP + (COALESCE(duration_minutes, 60) || ' minutes')::INTERVAL
         AND v_booking_start < (session_date || ' ' || start_time)::TIMESTAMP + (COALESCE(duration_minutes, 60) + v_buffer_minutes || ' minutes')::INTERVAL)
        OR
        -- Existing booking starts within buffer after new booking
        ((session_date || ' ' || start_time)::TIMESTAMP >= v_booking_end
         AND (session_date || ' ' || start_time)::TIMESTAMP < v_booking_end + (v_buffer_minutes || ' minutes')::INTERVAL)
      )
    FOR UPDATE
  ) locked_rows;

  IF v_conflict_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'CONFLICT_BOOKING',
      'error_message', 'This time slot conflicts with an existing booking (including 15-minute buffer). Please select another time.'
    );
  END IF;

  -- Check for blocked/unavailable time
  SELECT COUNT(*) INTO v_blocked_count
  FROM calendar_events
  WHERE user_id = p_therapist_id
    AND event_type IN ('block', 'unavailable')
    AND status = 'confirmed'
    AND (
      start_time < v_booking_end
      AND end_time > v_booking_start
    );

  IF v_blocked_count > 0 THEN
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
    is_peer_booking,
    credit_cost,
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
    'completed', -- Treatment exchange bookings are pre-paid with credits
    'scheduled',
    p_is_peer_booking,
    p_credit_cost,
    p_idempotency_key
  )
  RETURNING id INTO v_session_id;

  -- Link to mutual exchange session if provided
  IF p_mutual_exchange_session_id IS NOT NULL THEN
    UPDATE mutual_exchange_sessions
    SET updated_at = NOW()
    WHERE id = p_mutual_exchange_session_id;
  END IF;

  -- Broadcast availability change via NOTIFY
  PERFORM pg_notify(
    'availability_changes',
    jsonb_build_object(
      'practitioner_id', p_therapist_id,
      'session_date', p_session_date,
      'change_type', 'treatment_exchange_booking_created',
      'session_id', v_session_id
    )::text
  );

  RETURN jsonb_build_object(
    'success', true,
    'session_id', v_session_id
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_treatment_exchange_booking IS 'Creates a treatment exchange booking with validation. Respects 5-minute holds from regular bookings and enforces 15-minute buffer between appointments.';
