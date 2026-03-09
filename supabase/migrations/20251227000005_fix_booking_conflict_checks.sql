CREATE OR REPLACE FUNCTION create_booking_with_validation(
  p_therapist_id UUID,
  p_client_id UUID,
  p_client_name TEXT,
  p_client_email TEXT,
  p_session_date DATE,
  p_start_time TIME,
  p_duration_minutes INTEGER,
  p_session_type TEXT,
  p_price DECIMAL(10,2),
  p_client_phone TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_payment_status TEXT DEFAULT 'pending',
  p_status TEXT DEFAULT 'pending_payment',
  p_is_peer_booking BOOLEAN DEFAULT false,
  p_credit_cost INTEGER DEFAULT 0,
  p_stripe_payment_intent_id TEXT DEFAULT NULL,
  p_platform_fee_amount DECIMAL(10,2) DEFAULT NULL,
  p_practitioner_amount DECIMAL(10,2) DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_session_id UUID;
  v_booking_start TIMESTAMPTZ;
  v_booking_end TIMESTAMPTZ;
  v_conflict_exists BOOLEAN;
  v_blocked_exists BOOLEAN;
  v_working_hours JSONB;
  v_day_schedule JSONB;
  v_day_of_week TEXT;
  v_time_valid BOOLEAN := false;
  v_existing_idempotency UUID;
  v_log_id UUID;
BEGIN
  -- Log booking attempt
  BEGIN
    INSERT INTO booking_attempts_log (
      therapist_id,
      client_id,
      session_date,
      start_time,
      duration_minutes,
      attempt_status,
      error_code,
      idempotency_key,
      is_peer_booking
    ) VALUES (
      p_therapist_id,
      p_client_id,
      p_session_date,
      p_start_time,
      p_duration_minutes,
      'unknown_error',
      'INVALID_PARAMETERS',
      p_idempotency_key,
      p_is_peer_booking
    )
    RETURNING id INTO v_log_id;
  EXCEPTION WHEN OTHERS THEN
    v_log_id := NULL;
  END;

  -- Validate basic parameters
  IF p_therapist_id IS NULL OR p_client_id IS NULL OR p_session_date IS NULL OR p_start_time IS NULL THEN
    BEGIN
      UPDATE booking_attempts_log
      SET attempt_status = 'unknown_error',
          error_message = 'Missing required parameters'
      WHERE id = (
        SELECT id FROM booking_attempts_log
        WHERE idempotency_key = p_idempotency_key
        ORDER BY created_at DESC
        LIMIT 1
      );
    EXCEPTION WHEN OTHERS THEN
    END;
    
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_PARAMETERS',
      'error_message', 'Missing required parameters'
    );
  END IF;

  IF p_duration_minutes IS NULL OR p_duration_minutes <= 0 THEN
    BEGIN
      UPDATE booking_attempts_log
      SET attempt_status = 'unknown_error',
          error_code = 'INVALID_DURATION',
          error_message = 'Duration must be greater than 0'
      WHERE id = (
        SELECT id FROM booking_attempts_log
        WHERE idempotency_key = p_idempotency_key
        ORDER BY created_at DESC
        LIMIT 1
      );
    EXCEPTION WHEN OTHERS THEN
    END;
    
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
      BEGIN
        UPDATE booking_attempts_log
        SET attempt_status = 'duplicate_request',
            error_code = 'DUPLICATE_REQUEST',
            error_message = 'This booking request has already been processed'
        WHERE id = (
          SELECT id FROM booking_attempts_log
          WHERE idempotency_key = p_idempotency_key
          ORDER BY created_at DESC
          LIMIT 1
        );
      EXCEPTION WHEN OTHERS THEN
      END;
      
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
    BEGIN
      UPDATE booking_attempts_log
      SET attempt_status = 'invalid_date',
          error_code = 'INVALID_DATE',
          error_message = 'Cannot book sessions in the past'
      WHERE id = (
        SELECT id FROM booking_attempts_log
        WHERE idempotency_key = p_idempotency_key
        ORDER BY created_at DESC
        LIMIT 1
      );
    EXCEPTION WHEN OTHERS THEN
    END;
    
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_DATE',
      'error_message', 'Cannot book sessions in the past'
    );
  END IF;

  -- Calculate booking time range
  v_booking_start := (p_session_date::text || ' ' || p_start_time::text)::timestamptz;
  v_booking_end := v_booking_start + (p_duration_minutes || ' minutes')::interval;

  -- Use advisory lock
  PERFORM pg_advisory_xact_lock(hashtext(p_therapist_id::text || p_session_date::text || p_start_time::text));

  -- Check for existing bookings
  -- UPDATED: Checks both where user is therapist AND where user is client (receiving treatment)
  SELECT EXISTS (
    SELECT 1
    FROM client_sessions
    WHERE (therapist_id = p_therapist_id OR client_id = p_therapist_id)
      AND session_date = p_session_date
      AND status IN ('scheduled', 'confirmed', 'in_progress', 'pending_payment')
      AND ((status = 'pending_payment' AND expires_at IS NOT NULL AND expires_at > NOW()) OR status != 'pending_payment')
      AND ((p_start_time::time < (start_time::time + (COALESCE(duration_minutes, 60) || ' minutes')::interval))
           AND ((start_time::time + (COALESCE(duration_minutes, 60) || ' minutes')::interval) > p_start_time::time))
    FOR UPDATE
  ) INTO v_conflict_exists;

  IF v_conflict_exists THEN
    BEGIN
      UPDATE booking_attempts_log
      SET attempt_status = 'conflict_booking',
          error_code = 'CONFLICT_BOOKING',
          error_message = 'This time slot is already booked. Please select another time.'
      WHERE id = (
        SELECT id FROM booking_attempts_log
        WHERE idempotency_key = p_idempotency_key
        ORDER BY created_at DESC
        LIMIT 1
      );
    EXCEPTION WHEN OTHERS THEN
    END;
    
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'CONFLICT_BOOKING',
      'error_message', 'This time slot is already booked. Please select another time.'
    );
  END IF;

  -- Check for blocked/unavailable time
  SELECT EXISTS (
    SELECT 1
    FROM calendar_events
    WHERE user_id = p_therapist_id
      AND event_type IN ('block', 'unavailable')
      AND status = 'confirmed'
      AND (start_time < v_booking_end AND end_time > v_booking_start)
  ) INTO v_blocked_exists;

  IF v_blocked_exists THEN
    BEGIN
      UPDATE booking_attempts_log
      SET attempt_status = 'conflict_blocked',
          error_code = 'CONFLICT_BLOCKED',
          error_message = 'This time slot is blocked or unavailable. Please select another time.'
      WHERE id = (
        SELECT id FROM booking_attempts_log
        WHERE idempotency_key = p_idempotency_key
        ORDER BY created_at DESC
        LIMIT 1
      );
    EXCEPTION WHEN OTHERS THEN
    END;
    
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'CONFLICT_BLOCKED',
      'error_message', 'This time slot is blocked or unavailable. Please select another time.'
    );
  END IF;

  -- Check practitioner working hours
  SELECT working_hours INTO v_working_hours
  FROM practitioner_availability
  WHERE user_id = p_therapist_id
  LIMIT 1;

  IF v_working_hours IS NOT NULL THEN
    v_day_of_week := LOWER(TO_CHAR(p_session_date, 'Day'));
    v_day_of_week := TRIM(v_day_of_week);
    v_day_schedule := v_working_hours->v_day_of_week;

    -- Strict check: If day schedule exists, it MUST be enabled
    IF v_day_schedule IS NOT NULL THEN
      IF (v_day_schedule->>'enabled')::boolean IS NOT TRUE THEN
        BEGIN
          UPDATE booking_attempts_log
          SET attempt_status = 'invalid_time',
              error_code = 'INVALID_TIME',
              error_message = 'Practitioner is not working on this day'
          WHERE id = (
            SELECT id FROM booking_attempts_log
            WHERE idempotency_key = p_idempotency_key
            ORDER BY created_at DESC
            LIMIT 1
          );
        EXCEPTION WHEN OTHERS THEN
        END;
        
        RETURN jsonb_build_object(
          'success', false,
          'error_code', 'INVALID_TIME',
          'error_message', 'Practitioner is not working on this day'
        );
      END IF;

      -- If enabled, check hours
      IF v_day_schedule->'hours' IS NOT NULL THEN
        SELECT EXISTS(
          SELECT 1
          FROM jsonb_array_elements(v_day_schedule->'hours') AS time_block
          WHERE (time_block->>'start')::time <= p_start_time::time
            AND (time_block->>'end')::time >= (p_start_time::time + (p_duration_minutes || ' minutes')::interval)
        ) INTO v_time_valid;
      ELSE
        SELECT EXISTS(
          SELECT 1
          WHERE (v_day_schedule->>'start')::time <= p_start_time::time
            AND (v_day_schedule->>'end')::time >= (p_start_time::time + (p_duration_minutes || ' minutes')::interval)
        ) INTO v_time_valid;
      END IF;

      IF NOT v_time_valid THEN
        BEGIN
          UPDATE booking_attempts_log
          SET attempt_status = 'invalid_time',
              error_code = 'INVALID_TIME',
              error_message = 'Selected time is outside practitioner working hours'
          WHERE id = (
            SELECT id FROM booking_attempts_log
            WHERE idempotency_key = p_idempotency_key
            ORDER BY created_at DESC
            LIMIT 1
          );
        EXCEPTION WHEN OTHERS THEN
        END;
        
        RETURN jsonb_build_object(
          'success', false,
          'error_code', 'INVALID_TIME',
          'error_message', 'Selected time is outside practitioner working hours'
        );
      END IF;
    END IF;
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
    stripe_payment_intent_id,
    platform_fee_amount,
    practitioner_amount,
    expires_at,
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
    p_payment_status::payment_status,
    p_status::session_status,
    p_is_peer_booking,
    p_credit_cost,
    p_stripe_payment_intent_id,
    p_platform_fee_amount,
    p_practitioner_amount,
    COALESCE(p_expires_at, CASE WHEN p_status = 'pending_payment' THEN NOW() + INTERVAL '60 minutes' ELSE NULL END),
    p_idempotency_key
  )
  RETURNING id INTO v_session_id;

  -- Broadcast availability change via NOTIFY
  PERFORM pg_notify(
    'availability_changes',
    jsonb_build_object(
      'practitioner_id', p_therapist_id,
      'session_date', p_session_date,
      'change_type', 'booking_created',
      'session_id', v_session_id
    )::text
  );

  -- Update audit log with success
  BEGIN
    UPDATE booking_attempts_log
    SET attempt_status = 'success',
        session_id = v_session_id,
        error_code = NULL,
        error_message = NULL
    WHERE id = (
      SELECT id FROM booking_attempts_log
      WHERE idempotency_key = p_idempotency_key
      ORDER BY created_at DESC
      LIMIT 1
    );
  EXCEPTION WHEN OTHERS THEN
  END;

  RETURN jsonb_build_object(
    'success', true,
    'session_id', v_session_id
  );

EXCEPTION
  WHEN unique_violation THEN
    BEGIN
      UPDATE booking_attempts_log
      SET attempt_status = 'conflict_booking',
          error_code = 'CONFLICT_BOOKING',
          error_message = 'This time slot is already booked. Please select another time.'
      WHERE id = (
        SELECT id FROM booking_attempts_log
        WHERE idempotency_key = p_idempotency_key
        ORDER BY created_at DESC
        LIMIT 1
      );
    EXCEPTION WHEN OTHERS THEN
    END;
    
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'CONFLICT_BOOKING',
      'error_message', 'This time slot is already booked. Please select another time.'
    );
  WHEN OTHERS THEN
    BEGIN
      UPDATE booking_attempts_log
      SET attempt_status = 'database_error',
          error_code = 'DATABASE_ERROR',
          error_message = SQLERRM
      WHERE id = (
        SELECT id FROM booking_attempts_log
        WHERE idempotency_key = p_idempotency_key
        ORDER BY created_at DESC
        LIMIT 1
      );
    EXCEPTION WHEN OTHERS THEN
    END;
    
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'DATABASE_ERROR',
      'error_message', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update create_treatment_exchange_booking as well
CREATE OR REPLACE FUNCTION create_treatment_exchange_booking(
  p_therapist_id UUID,
  p_client_id UUID,
  p_client_name TEXT,
  p_client_email TEXT,
  p_session_date DATE,
  p_start_time TIME,
  p_duration_minutes INTEGER,
  p_session_type TEXT,
  p_client_phone TEXT DEFAULT NULL,
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
  v_conflict_exists BOOLEAN;
  v_blocked_exists BOOLEAN;
  v_existing_idempotency UUID;
BEGIN
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
  PERFORM pg_advisory_xact_lock(hashtext(p_therapist_id::text || p_session_date::text || p_start_time::text));

  -- Check for existing bookings
  -- UPDATED: Checks both where user is therapist AND where user is client (receiving treatment)
  SELECT EXISTS (
    SELECT 1
    FROM client_sessions
    WHERE (therapist_id = p_therapist_id OR client_id = p_therapist_id)
      AND session_date = p_session_date
      AND status IN ('scheduled', 'confirmed', 'in_progress', 'pending_payment')
      AND ((status = 'pending_payment' AND expires_at IS NOT NULL AND expires_at > NOW()) OR status != 'pending_payment')
      AND ((p_start_time::time < (start_time::time + (COALESCE(duration_minutes, 60) || ' minutes')::interval))
           AND ((start_time::time + (COALESCE(duration_minutes, 60) || ' minutes')::interval) > p_start_time::time))
    FOR UPDATE
  ) INTO v_conflict_exists;

  IF v_conflict_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'CONFLICT_BOOKING',
      'error_message', 'This time slot is already booked. Please select another time.'
    );
  END IF;

  -- Check for blocked/unavailable time
  SELECT EXISTS (
    SELECT 1
    FROM calendar_events
    WHERE user_id = p_therapist_id
      AND event_type IN ('block', 'unavailable')
      AND status = 'confirmed'
      AND (start_time < v_booking_end AND end_time > v_booking_start)
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
    'completed'::payment_status,
    'scheduled'::session_status,
    p_is_peer_booking,
    p_credit_cost,
    p_idempotency_key
  )
  RETURNING id INTO v_session_id;

  -- Broadcast availability change via NOTIFY
  PERFORM pg_notify(
    'availability_changes',
    jsonb_build_object(
      'practitioner_id', p_therapist_id,
      'session_date', p_session_date,
      'change_type', 'booking_created',
      'session_id', v_session_id
    )::text
  );

  -- If this is part of a mutual exchange, update the mutual exchange session record
  IF p_mutual_exchange_session_id IS NOT NULL THEN
    -- Check if requester or recipient booking and update accordingly
    -- This logic assumes we know who is booking based on therapist_id
    UPDATE mutual_exchange_sessions
    SET 
      practitioner_a_booked = CASE WHEN practitioner_a_id = p_therapist_id THEN true ELSE practitioner_a_booked END,
      practitioner_b_booked = CASE WHEN practitioner_b_id = p_therapist_id THEN true ELSE practitioner_b_booked END,
      updated_at = NOW()
    WHERE id = p_mutual_exchange_session_id;
  END IF;

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
