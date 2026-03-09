-- Add rating-based booking restrictions to create_booking_with_validation
-- This enforces that practitioners can only book with others in the same rating tier:
-- - 4-5 stars can book with each other
-- - 2-3 stars can book with each other
-- - 0-1 stars can book with each other
-- Only applies when both client and practitioner are practitioners (peer bookings)

-- Enable pg_net extension if not already enabled (for HTTP calls to edge functions)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Helper function to determine rating tier
CREATE OR REPLACE FUNCTION public.get_rating_tier(p_rating NUMERIC)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_rating IS NULL OR p_rating = 0 THEN
    RETURN 'tier_0_1';  -- 0-1 stars
  ELSIF p_rating >= 4 THEN
    RETURN 'tier_4_5';  -- 4-5 stars
  ELSIF p_rating >= 2 THEN
    RETURN 'tier_2_3';   -- 2-3 stars
  ELSE
    RETURN 'tier_0_1';  -- 0-1 stars (default)
  END IF;
END;
$$;

COMMENT ON FUNCTION public.get_rating_tier IS 'Determines rating tier for booking restrictions: tier_0_1 (0-1 stars), tier_2_3 (2-3 stars), tier_4_5 (4-5 stars)';

-- Update create_booking_with_validation to include rating-based restrictions
-- Add rating validation after basic parameter validation and before conflict checks
-- This ensures rating restrictions are checked early in the validation process
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
  p_stripe_session_id TEXT DEFAULT NULL,
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
  v_conflict_count INTEGER;
  v_blocked_count INTEGER;
  v_working_hours JSONB;
  v_day_schedule JSONB;
  v_day_of_week TEXT;
  v_time_valid BOOLEAN := false;
  v_existing_idempotency UUID;
  v_error_code TEXT;
  v_error_message TEXT;
  v_log_id UUID;
  -- Rating tier variables
  v_therapist_rating NUMERIC;
  v_client_rating NUMERIC;
  v_therapist_role TEXT;
  v_client_role TEXT;
  v_therapist_tier TEXT;
  v_client_tier TEXT;
  -- Same-day booking variables
  v_is_same_day BOOLEAN;
  v_approval_deadline TIMESTAMPTZ;
BEGIN
  -- Log booking attempt (with error handling in case table doesn't exist)
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
    -- Table might not exist yet, continue without logging
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
      -- Ignore if table doesn't exist
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
      -- Ignore if table doesn't exist
    END;
    
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_DURATION',
      'error_message', 'Duration must be greater than 0'
    );
  END IF;

  -- Check idempotency key (prevent duplicate submissions)
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
            error_message = 'This booking request has already been processed',
            session_id = v_existing_idempotency
        WHERE id = (
          SELECT id FROM booking_attempts_log
          WHERE idempotency_key = p_idempotency_key
          ORDER BY created_at DESC
          LIMIT 1
        );
      EXCEPTION WHEN OTHERS THEN
        -- Ignore if table doesn't exist
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
      -- Ignore if table doesn't exist
    END;
    
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_DATE',
      'error_message', 'Cannot book sessions in the past'
    );
  END IF;

  -- Check 2-hour minimum advance booking requirement
  v_booking_start := (p_session_date || ' ' || p_start_time)::TIMESTAMPTZ;
  IF v_booking_start <= (NOW() + INTERVAL '2 hours') THEN
    BEGIN
      UPDATE booking_attempts_log
      SET attempt_status = 'invalid_time',
          error_code = 'MINIMUM_ADVANCE_NOT_MET',
          error_message = 'Bookings must be made at least 2 hours in advance'
      WHERE id = (
        SELECT id FROM booking_attempts_log
        WHERE idempotency_key = p_idempotency_key
        ORDER BY created_at DESC
        LIMIT 1
      );
    EXCEPTION WHEN OTHERS THEN
      -- Ignore if table doesn't exist
    END;
    
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'MINIMUM_ADVANCE_NOT_MET',
      'error_message', 'Bookings must be made at least 2 hours in advance'
    );
  END IF;

  -- Check if this is a same-day booking (requires practitioner approval)
  -- Check if session is on the same calendar day
  v_is_same_day := (p_session_date = CURRENT_DATE);
  
  IF v_is_same_day THEN
    -- Calculate approval deadline: session time minus 2 hours
    v_approval_deadline := v_booking_start - INTERVAL '2 hours';
    
    -- If approval deadline is in the past, reject the booking
    IF v_approval_deadline < NOW() THEN
      BEGIN
        UPDATE booking_attempts_log
        SET attempt_status = 'invalid_time',
            error_code = 'APPROVAL_DEADLINE_PASSED',
            error_message = 'Booking time is too soon - requires approval at least 2 hours before session'
        WHERE id = (
          SELECT id FROM booking_attempts_log
          WHERE idempotency_key = p_idempotency_key
          ORDER BY created_at DESC
          LIMIT 1
        );
      EXCEPTION WHEN OTHERS THEN
        -- Ignore if table doesn't exist
      END;
      
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'APPROVAL_DEADLINE_PASSED',
        'error_message', 'Booking time is too soon - requires approval at least 2 hours before session'
      );
    END IF;
    
    -- For same-day bookings, override status to pending_approval
    -- Payment will be held until practitioner approves
    p_status := 'pending_approval';
  END IF;

  -- RATING-BASED BOOKING RESTRICTIONS
  -- Only applies when both client and practitioner are practitioners (peer bookings)
  -- Check if both are practitioners
  SELECT user_role, COALESCE(average_rating, 0) INTO v_therapist_role, v_therapist_rating
  FROM users
  WHERE id = p_therapist_id;

  SELECT user_role, COALESCE(average_rating, 0) INTO v_client_role, v_client_rating
  FROM users
  WHERE id = p_client_id;

  -- If both are practitioners, check rating tiers match
  IF v_therapist_role IN ('sports_therapist', 'massage_therapist', 'osteopath')
     AND v_client_role IN ('sports_therapist', 'massage_therapist', 'osteopath') THEN
    
    v_therapist_tier := get_rating_tier(v_therapist_rating);
    v_client_tier := get_rating_tier(v_client_rating);

    -- If tiers don't match, reject the booking
    IF v_therapist_tier != v_client_tier THEN
      BEGIN
        UPDATE booking_attempts_log
        SET attempt_status = 'unknown_error',
            error_code = 'RATING_TIER_MISMATCH',
            error_message = format('Booking restricted: Practitioners can only book with others in the same rating tier. Your rating tier: %s, Practitioner rating tier: %s', 
              CASE v_client_tier 
                WHEN 'tier_4_5' THEN '4-5 stars'
                WHEN 'tier_2_3' THEN '2-3 stars'
                ELSE '0-1 stars'
              END,
              CASE v_therapist_tier 
                WHEN 'tier_4_5' THEN '4-5 stars'
                WHEN 'tier_2_3' THEN '2-3 stars'
                ELSE '0-1 stars'
              END)
        WHERE id = (
          SELECT id FROM booking_attempts_log
          WHERE idempotency_key = p_idempotency_key
          ORDER BY created_at DESC
          LIMIT 1
        );
      EXCEPTION WHEN OTHERS THEN
        -- Ignore if table doesn't exist
      END;
      
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'RATING_TIER_MISMATCH',
        'error_message', format('Booking restricted: Practitioners can only book with others in the same rating tier. Your rating tier: %s, Practitioner rating tier: %s', 
          CASE v_client_tier 
            WHEN 'tier_4_5' THEN '4-5 stars'
            WHEN 'tier_2_3' THEN '2-3 stars'
            ELSE '0-1 stars'
          END,
          CASE v_therapist_tier 
            WHEN 'tier_4_5' THEN '4-5 stars'
            WHEN 'tier_2_3' THEN '2-3 stars'
            ELSE '0-1 stars'
          END)
      );
    END IF;
  END IF;

  -- Calculate booking time range
  v_booking_start := (p_session_date::text || ' ' || p_start_time::text)::timestamptz;
  v_booking_end := v_booking_start + (p_duration_minutes || ' minutes')::interval;

  -- Use advisory lock to prevent concurrent bookings for same therapist/time
  -- Lock ID is hash of therapist_id + session_date + start_time
  PERFORM pg_advisory_xact_lock(
    hashtext(p_therapist_id::text || p_session_date::text || p_start_time::text)
  );

  -- Check for existing bookings (prevents race conditions)
  -- Use a subquery to lock rows first, then count
  SELECT COUNT(*) INTO v_conflict_count
  FROM (
    SELECT id
    FROM client_sessions
    WHERE therapist_id = p_therapist_id
      AND session_date = p_session_date
      AND status IN ('scheduled', 'confirmed', 'in_progress', 'pending_payment')
      AND (
        -- Exclude expired pending_payment sessions
        (status = 'pending_payment' AND expires_at IS NOT NULL AND expires_at > NOW())
        OR status != 'pending_payment'
      )
      AND (
        -- Booking overlaps if: booking_start < existing_end AND booking_end > existing_start
        (p_start_time::time < (start_time::time + (COALESCE(duration_minutes, 60) || ' minutes')::interval))
        AND ((start_time::time + (COALESCE(duration_minutes, 60) || ' minutes')::interval) > p_start_time::time)
      )
    FOR UPDATE
  ) locked_rows;

  IF v_conflict_count > 0 THEN
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
      -- Ignore if table doesn't exist
    END;
    
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'CONFLICT_BOOKING',
      'error_message', 'This time slot is already booked. Please select another time.'
    );
  END IF;

  -- Check for blocked/unavailable time
  SELECT COUNT(*) INTO v_blocked_count
  FROM calendar_events
  WHERE user_id = p_therapist_id
    AND event_type IN ('block', 'unavailable')
    AND status = 'confirmed'
    AND (
      -- Block overlaps if: block_start < booking_end AND block_end > booking_start
      start_time < v_booking_end
      AND end_time > v_booking_start
    );

  IF v_blocked_count > 0 THEN
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
      -- Ignore if table doesn't exist
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

    IF v_day_schedule IS NOT NULL AND (v_day_schedule->>'enabled')::boolean IS TRUE THEN
      -- Check if time falls within working hours
      -- Handle both formats: direct start/end or hours array
      IF v_day_schedule->'hours' IS NOT NULL THEN
        -- Format with hours array: { "enabled": true, "hours": [{ "start": "09:00", "end": "17:00" }] }
        SELECT EXISTS(
          SELECT 1
          FROM jsonb_array_elements(v_day_schedule->'hours') AS time_block
          WHERE (time_block->>'start')::time <= p_start_time::time
            AND (time_block->>'end')::time >= (p_start_time::time + (p_duration_minutes || ' minutes')::interval)
        ) INTO v_time_valid;
      ELSE
        -- Format with direct start/end: { "enabled": true, "start": "09:00", "end": "17:00" }
        v_time_valid := (
          (v_day_schedule->>'start')::time <= p_start_time::time
          AND (v_day_schedule->>'end')::time >= (p_start_time::time + (p_duration_minutes || ' minutes')::interval)
        );
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
          -- Ignore if table doesn't exist
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
    idempotency_key,
    requires_approval,
    approval_expires_at
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
    CASE WHEN v_is_same_day THEN 'held' ELSE p_payment_status END, -- Set to 'held' for same-day bookings
    p_status::session_status,
    p_is_peer_booking,
    p_credit_cost,
    p_stripe_payment_intent_id,
    p_platform_fee_amount,
    p_practitioner_amount,
    COALESCE(p_expires_at, CASE WHEN p_status = 'pending_payment' THEN NOW() + INTERVAL '60 minutes' ELSE NULL END),
    p_idempotency_key,
    v_is_same_day, -- Set requires_approval flag
    CASE WHEN v_is_same_day THEN v_approval_deadline ELSE NULL END -- Set approval deadline
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
    -- Ignore if table doesn't exist
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
      -- Ignore if table doesn't exist
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
      -- Ignore if table doesn't exist
    END;
    
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'DATABASE_ERROR',
      'error_message', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_booking_with_validation TO authenticated;
