-- Create comprehensive booking creation RPC function with validation
-- Prevents double bookings, validates blocked time, checks working hours
-- Uses transactions with row-level locking for race condition prevention

-- Create booking_attempts_log table first (if it doesn't exist)
CREATE TABLE IF NOT EXISTS booking_attempts_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  client_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_date DATE NOT NULL,
  start_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL,
  attempt_status TEXT NOT NULL CHECK (attempt_status IN (
    'success',
    'conflict_booking',
    'conflict_blocked',
    'invalid_time',
    'invalid_date',
    'insufficient_credits',
    'duplicate_request',
    'practitioner_unavailable',
    'database_error',
    'unknown_error'
  )),
  error_message TEXT,
  error_code TEXT,
  idempotency_key TEXT,
  session_id UUID REFERENCES client_sessions(id) ON DELETE SET NULL,
  is_peer_booking BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_booking_attempts_log_therapist ON booking_attempts_log(therapist_id);
CREATE INDEX IF NOT EXISTS idx_booking_attempts_log_client ON booking_attempts_log(client_id);
CREATE INDEX IF NOT EXISTS idx_booking_attempts_log_session_date ON booking_attempts_log(session_date);
CREATE INDEX IF NOT EXISTS idx_booking_attempts_log_status ON booking_attempts_log(attempt_status);
CREATE INDEX IF NOT EXISTS idx_booking_attempts_log_idempotency ON booking_attempts_log(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_booking_attempts_log_created_at ON booking_attempts_log(created_at);

-- Enable RLS (if not already enabled)
ALTER TABLE booking_attempts_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (if they don't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'booking_attempts_log' 
    AND policyname = 'Practitioners can view their booking attempts'
  ) THEN
    CREATE POLICY "Practitioners can view their booking attempts" ON booking_attempts_log
      FOR SELECT USING (auth.uid() = therapist_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'booking_attempts_log' 
    AND policyname = 'Clients can view their booking attempts'
  ) THEN
    CREATE POLICY "Clients can view their booking attempts" ON booking_attempts_log
      FOR SELECT USING (auth.uid() = client_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'booking_attempts_log' 
    AND policyname = 'Service role can insert booking attempts'
  ) THEN
    CREATE POLICY "Service role can insert booking attempts" ON booking_attempts_log
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;

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

-- Add idempotency_key column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'client_sessions' 
    AND column_name = 'idempotency_key'
  ) THEN
    ALTER TABLE client_sessions ADD COLUMN idempotency_key TEXT;
    CREATE INDEX IF NOT EXISTS idx_client_sessions_idempotency_key ON client_sessions(idempotency_key) WHERE idempotency_key IS NOT NULL;
  END IF;
END $$;

