-- Add conflict checking to create_accepted_exchange_session RPC function
-- This ensures database-level validation prevents double bookings

CREATE OR REPLACE FUNCTION create_accepted_exchange_session(
  p_request_id UUID,
  p_requester_id UUID,
  p_recipient_id UUID,
  p_session_date DATE,
  p_start_time TIME WITHOUT TIME ZONE,
  p_end_time TIME WITHOUT TIME ZONE,
  p_duration_minutes INTEGER,
  p_session_type TEXT,
  p_requester_notes TEXT,
  p_recipient_notes TEXT,
  p_required_credits INTEGER,
  p_conversation_id UUID DEFAULT NULL
)
RETURNS TABLE(mutual_exchange_session_id UUID, client_session_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_mes_id UUID;
  v_cs_id UUID;
  v_client_name TEXT;
  v_client_email TEXT;
  v_requester_data RECORD;
  v_booking_start TIMESTAMPTZ;
  v_booking_end TIMESTAMPTZ;
  v_conflict_count INTEGER;
  v_blocked_count INTEGER;
BEGIN
  -- Validate basic parameters
  IF p_requester_id IS NULL OR p_recipient_id IS NULL OR p_session_date IS NULL OR p_start_time IS NULL THEN
    RAISE EXCEPTION 'Missing required parameters';
  END IF;

  IF p_duration_minutes IS NULL OR p_duration_minutes <= 0 THEN
    RAISE EXCEPTION 'Duration must be greater than 0';
  END IF;

  -- Calculate booking time range
  v_booking_start := (p_session_date::text || ' ' || p_start_time::text)::timestamptz;
  v_booking_end := v_booking_start + (p_duration_minutes || ' minutes')::interval;

  -- Use advisory lock to prevent concurrent bookings
  PERFORM pg_advisory_xact_lock(
    hashtext(p_recipient_id::text || p_session_date::text || p_start_time::text)
  );

  -- Check for existing bookings (prevents race conditions)
  -- The recipient is providing the service, so check their calendar
  SELECT COUNT(*) INTO v_conflict_count
  FROM (
    SELECT id
    FROM client_sessions
    WHERE therapist_id = p_recipient_id
      AND session_date = p_session_date
      AND status IN ('scheduled', 'confirmed', 'in_progress', 'pending_payment')
      AND (
        (status = 'pending_payment' AND expires_at IS NOT NULL AND expires_at > NOW())
        OR status != 'pending_payment'
      )
      AND (
        (p_start_time::time < (start_time::time + (COALESCE(duration_minutes, 60) || ' minutes')::interval))
        AND ((start_time::time + (COALESCE(duration_minutes, 60) || ' minutes')::interval) > p_start_time::time)
      )
    FOR UPDATE
  ) locked_rows;

  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION 'CONFLICT_BOOKING: This time slot is already booked. Please select another time.';
  END IF;

  -- Check for blocked/unavailable time
  SELECT COUNT(*) INTO v_blocked_count
  FROM calendar_events
  WHERE user_id = p_recipient_id
    AND event_type IN ('block', 'unavailable')
    AND status = 'confirmed'
    AND (
      start_time < v_booking_end
      AND end_time > v_booking_start
    );

  IF v_blocked_count > 0 THEN
    RAISE EXCEPTION 'CONFLICT_BLOCKED: This time slot is blocked or unavailable. Please select another time.';
  END IF;

  -- Get requester data for client_sessions
  SELECT first_name, last_name, email
  INTO v_requester_data
  FROM public.users
  WHERE id = p_requester_id;
  
  v_client_name := COALESCE(
    TRIM(v_requester_data.first_name || ' ' || v_requester_data.last_name),
    'Practitioner'
  );
  v_client_email := COALESCE(v_requester_data.email, '');
  
  -- Create mutual_exchange_sessions record
  INSERT INTO public.mutual_exchange_sessions (
    exchange_request_id,
    practitioner_a_id,
    practitioner_b_id,
    session_date,
    start_time,
    end_time,
    duration_minutes,
    session_type,
    status,
    credits_exchanged,
    practitioner_a_booked,
    practitioner_b_booked,
    credits_deducted,
    conversation_id
  ) VALUES (
    p_request_id,
    p_requester_id,
    p_recipient_id,
    p_session_date,
    p_start_time,
    p_end_time,
    p_duration_minutes,
    p_session_type,
    'scheduled',
    p_required_credits,
    true, -- Requester has already requested
    false, -- Recipient needs to book back
    false, -- Credits not deducted until both agree
    p_conversation_id
  )
  RETURNING id INTO v_mes_id;
  
  -- Create client_sessions record so it appears in peer sessions sidebar
  INSERT INTO public.client_sessions (
    therapist_id,
    client_id,
    client_name,
    client_email,
    session_date,
    start_time,
    duration_minutes,
    session_type,
    price,
    credit_cost,
    status,
    payment_status,
    is_peer_booking,
    notes
  ) VALUES (
    p_recipient_id,
    p_requester_id,
    v_client_name,
    v_client_email,
    p_session_date,
    p_start_time,
    p_duration_minutes,
    p_session_type,
    0,
    p_required_credits,
    'scheduled',
    'paid',
    true,
    COALESCE(p_requester_notes, p_recipient_notes, '')
  )
  RETURNING id INTO v_cs_id;
  
  -- Broadcast availability change via NOTIFY
  PERFORM pg_notify(
    'availability_changes',
    jsonb_build_object(
      'practitioner_id', p_recipient_id,
      'session_date', p_session_date,
      'change_type', 'treatment_exchange_booking_created',
      'session_id', v_cs_id
    )::text
  );
  
  -- Return both IDs
  RETURN QUERY SELECT v_mes_id, v_cs_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_accepted_exchange_session TO authenticated;

