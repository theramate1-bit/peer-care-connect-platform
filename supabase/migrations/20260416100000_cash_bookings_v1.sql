-- Cash / pay-at-clinic bookings v1
-- Adds practitioner preference, session payment_collection column,
-- extends create_booking_with_validation for in_person path,
-- and creates mark_session_paid_in_person RPC.

-- 1) Practitioner-level preference: accept in-person payments
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS accept_in_person_payment boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.users.accept_in_person_payment
  IS 'When true, clients/guests can book without online payment (pay cash/terminal at clinic).';

-- 2) Session-level payment collection mode
ALTER TABLE public.client_sessions
  ADD COLUMN IF NOT EXISTS payment_collection text NOT NULL DEFAULT 'online';

ALTER TABLE public.client_sessions
  ADD CONSTRAINT chk_payment_collection
  CHECK (payment_collection IN ('online', 'in_person'));

COMMENT ON COLUMN public.client_sessions.payment_collection
  IS 'How payment is collected: online (Stripe) or in_person (cash/terminal at clinic). Platform fee is 0 for in_person.';

-- 3) Extend create_booking_with_validation with p_payment_collection parameter.
--    Drop the existing overload with the most params (24 args) and recreate with 25.
--    The overload delegates to this one, so we replace the primary function.
CREATE OR REPLACE FUNCTION public.create_booking_with_validation(
  p_therapist_id uuid,
  p_client_id uuid,
  p_client_name text,
  p_client_email text,
  p_session_date date,
  p_start_time time without time zone,
  p_duration_minutes integer,
  p_session_type text,
  p_price numeric,
  p_client_phone text DEFAULT NULL::text,
  p_notes text DEFAULT NULL::text,
  p_payment_status text DEFAULT 'pending'::text,
  p_status text DEFAULT 'pending_payment'::text,
  p_is_peer_booking boolean DEFAULT false,
  p_credit_cost integer DEFAULT 0,
  p_stripe_session_id text DEFAULT NULL::text,
  p_stripe_payment_intent_id text DEFAULT NULL::text,
  p_platform_fee_amount numeric DEFAULT NULL::numeric,
  p_practitioner_amount numeric DEFAULT NULL::numeric,
  p_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_idempotency_key text DEFAULT NULL::text,
  p_is_guest_booking boolean DEFAULT false,
  p_appointment_type text DEFAULT 'clinic'::text,
  p_visit_address text DEFAULT NULL::text,
  p_payment_collection text DEFAULT 'online'::text
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  v_therapist_rating NUMERIC;
  v_client_rating NUMERIC;
  v_therapist_role TEXT;
  v_client_role TEXT;
  v_therapist_tier TEXT;
  v_client_tier TEXT;
  v_therapist_type TEXT;
  v_requested_appointment_type TEXT;
  v_eff_payment_collection TEXT;
  v_eff_status TEXT;
  v_eff_payment_status TEXT;
  v_eff_platform_fee numeric;
  v_eff_practitioner_amount numeric;
  v_eff_expires_at timestamptz;
BEGIN
  -- Resolve effective payment collection mode
  v_eff_payment_collection := COALESCE(NULLIF(TRIM(p_payment_collection), ''), 'online');
  IF v_eff_payment_collection NOT IN ('online', 'in_person') THEN
    v_eff_payment_collection := 'online';
  END IF;

  -- For in_person bookings: override status/payment defaults so the session
  -- is immediately scheduled (not pending_payment) and has no platform fee.
  IF v_eff_payment_collection = 'in_person' THEN
    v_eff_status := COALESCE(NULLIF(TRIM(p_status), ''), 'scheduled');
    IF v_eff_status = 'pending_payment' THEN
      v_eff_status := 'scheduled';
    END IF;
    v_eff_payment_status := 'awaiting_in_person';
    v_eff_platform_fee := 0;
    v_eff_practitioner_amount := COALESCE(p_price, 0);
    v_eff_expires_at := NULL;
  ELSE
    v_eff_status := COALESCE(NULLIF(TRIM(p_status), ''), 'pending_payment');
    v_eff_payment_status := COALESCE(NULLIF(TRIM(p_payment_status), ''), 'pending');
    v_eff_platform_fee := p_platform_fee_amount;
    v_eff_practitioner_amount := p_practitioner_amount;
    v_eff_expires_at := p_expires_at;
  END IF;

  -- Log booking attempt
  BEGIN
    INSERT INTO booking_attempts_log (
      therapist_id, client_id, session_date, start_time, duration_minutes,
      attempt_status, error_code, idempotency_key, is_peer_booking
    ) VALUES (
      p_therapist_id, p_client_id, p_session_date, p_start_time, p_duration_minutes,
      'unknown_error', 'INVALID_PARAMETERS', p_idempotency_key, p_is_peer_booking
    )
    RETURNING id INTO v_log_id;
  EXCEPTION WHEN OTHERS THEN
    v_log_id := NULL;
  END;

  -- Validate basic parameters
  IF p_therapist_id IS NULL OR p_client_id IS NULL OR p_session_date IS NULL OR p_start_time IS NULL THEN
    BEGIN
      UPDATE booking_attempts_log
      SET attempt_status = 'unknown_error', error_message = 'Missing required parameters'
      WHERE id = (SELECT id FROM booking_attempts_log WHERE idempotency_key = p_idempotency_key ORDER BY created_at DESC LIMIT 1);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    RETURN jsonb_build_object('success', false, 'error_code', 'INVALID_PARAMETERS', 'error_message', 'Missing required parameters');
  END IF;

  IF p_duration_minutes IS NULL OR p_duration_minutes <= 0 THEN
    BEGIN
      UPDATE booking_attempts_log
      SET attempt_status = 'unknown_error', error_code = 'INVALID_DURATION', error_message = 'Duration must be greater than 0'
      WHERE id = (SELECT id FROM booking_attempts_log WHERE idempotency_key = p_idempotency_key ORDER BY created_at DESC LIMIT 1);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    RETURN jsonb_build_object('success', false, 'error_code', 'INVALID_DURATION', 'error_message', 'Duration must be greater than 0');
  END IF;

  -- Idempotency check
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_existing_idempotency FROM client_sessions WHERE idempotency_key = p_idempotency_key LIMIT 1;
    IF v_existing_idempotency IS NOT NULL THEN
      BEGIN
        UPDATE booking_attempts_log
        SET attempt_status = 'duplicate_request', error_code = 'DUPLICATE_REQUEST',
            error_message = 'This booking request has already been processed', session_id = v_existing_idempotency
        WHERE id = (SELECT id FROM booking_attempts_log WHERE idempotency_key = p_idempotency_key ORDER BY created_at DESC LIMIT 1);
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
      RETURN jsonb_build_object('success', false, 'error_code', 'DUPLICATE_REQUEST',
        'error_message', 'This booking request has already been processed', 'session_id', v_existing_idempotency);
    END IF;
  END IF;

  -- Date validation
  IF p_session_date < CURRENT_DATE THEN
    BEGIN
      UPDATE booking_attempts_log
      SET attempt_status = 'invalid_date', error_code = 'INVALID_DATE', error_message = 'Cannot book sessions in the past'
      WHERE id = (SELECT id FROM booking_attempts_log WHERE idempotency_key = p_idempotency_key ORDER BY created_at DESC LIMIT 1);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    RETURN jsonb_build_object('success', false, 'error_code', 'INVALID_DATE', 'error_message', 'Cannot book sessions in the past');
  END IF;

  -- Rating-based booking restrictions (peer bookings)
  SELECT user_role, COALESCE(average_rating, 0) INTO v_therapist_role, v_therapist_rating FROM users WHERE id = p_therapist_id;
  SELECT user_role, COALESCE(average_rating, 0) INTO v_client_role, v_client_rating FROM users WHERE id = p_client_id;

  IF v_therapist_role IN ('sports_therapist', 'massage_therapist', 'osteopath')
     AND v_client_role IN ('sports_therapist', 'massage_therapist', 'osteopath') THEN
    v_therapist_tier := get_rating_tier(v_therapist_rating);
    v_client_tier := get_rating_tier(v_client_rating);
    IF v_therapist_tier != v_client_tier THEN
      BEGIN
        UPDATE booking_attempts_log
        SET attempt_status = 'unknown_error', error_code = 'RATING_TIER_MISMATCH',
            error_message = format('Booking restricted: rating tier mismatch (%s vs %s)', v_client_tier, v_therapist_tier)
        WHERE id = (SELECT id FROM booking_attempts_log WHERE idempotency_key = p_idempotency_key ORDER BY created_at DESC LIMIT 1);
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
      RETURN jsonb_build_object('success', false, 'error_code', 'RATING_TIER_MISMATCH',
        'error_message', format('Booking restricted: Practitioners can only book with others in the same rating tier. Your rating tier: %s, Practitioner rating tier: %s',
          CASE v_client_tier WHEN 'tier_4_5' THEN '4-5 stars' WHEN 'tier_2_3' THEN '2-3 stars' ELSE '0-1 stars' END,
          CASE v_therapist_tier WHEN 'tier_4_5' THEN '4-5 stars' WHEN 'tier_2_3' THEN '2-3 stars' ELSE '0-1 stars' END));
    END IF;
  END IF;

  -- Booking time range
  v_booking_start := (p_session_date::text || ' ' || p_start_time::text)::timestamptz;
  v_booking_end := v_booking_start + (p_duration_minutes || ' minutes')::interval;

  v_requested_appointment_type := COALESCE(NULLIF(TRIM(p_appointment_type), ''), 'clinic');

  IF v_requested_appointment_type = 'mobile' AND p_session_date = CURRENT_DATE THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'SAME_DAY_MOBILE_USE_REQUEST_FLOW', 'error_message', 'Mobile sessions for today must use Request Visit to My Location.');
  END IF;

  IF v_requested_appointment_type = 'mobile' AND (p_visit_address IS NULL OR NULLIF(TRIM(COALESCE(p_visit_address, '')), '') IS NULL) THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'MISSING_VISIT_ADDRESS', 'error_message', 'Visit address is required for mobile sessions.');
  END IF;

  SELECT therapist_type INTO v_therapist_type FROM users WHERE id = p_therapist_id LIMIT 1;

  -- Advisory lock to prevent concurrent bookings
  PERFORM pg_advisory_xact_lock(hashtext(p_therapist_id::text || p_session_date::text || p_start_time::text));

  -- Directional buffer conflict check
  SELECT COUNT(*) INTO v_conflict_count
  FROM (
    SELECT id FROM client_sessions
    WHERE therapist_id = p_therapist_id
      AND session_date = p_session_date
      AND status IN ('scheduled', 'confirmed', 'in_progress', 'pending_payment')
      AND (
        (status = 'pending_payment' AND expires_at IS NOT NULL AND expires_at > NOW())
        OR status != 'pending_payment'
      )
      AND (
        (p_start_time::time < (start_time::time + (COALESCE(duration_minutes, 60) || ' minutes')::interval)
         AND (p_start_time::time + (p_duration_minutes || ' minutes')::interval) > start_time::time)
        OR
        (p_start_time::time >= (start_time::time + (COALESCE(duration_minutes, 60) || ' minutes')::interval)
         AND p_start_time::time < (
           (start_time::time + (COALESCE(duration_minutes, 60) || ' minutes')::interval)
           + make_interval(mins => public.get_directional_booking_buffer_minutes(v_therapist_type, COALESCE(appointment_type, 'clinic'), v_requested_appointment_type))
         ))
        OR
        (start_time::time >= (p_start_time::time + (p_duration_minutes || ' minutes')::interval)
         AND start_time::time < (
           (p_start_time::time + (p_duration_minutes || ' minutes')::interval)
           + make_interval(mins => public.get_directional_booking_buffer_minutes(v_therapist_type, v_requested_appointment_type, COALESCE(appointment_type, 'clinic')))
         ))
      )
  ) directional_locked_rows;

  IF v_conflict_count > 0 THEN
    BEGIN
      UPDATE booking_attempts_log
      SET attempt_status = 'conflict_booking', error_code = 'CONFLICT_BOOKING_BUFFER',
          error_message = 'This time slot conflicts with an existing booking or required transition buffer.'
      WHERE id = (SELECT id FROM booking_attempts_log WHERE idempotency_key = p_idempotency_key ORDER BY created_at DESC LIMIT 1);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    RETURN jsonb_build_object('success', false, 'error_code', 'CONFLICT_BOOKING',
      'error_message', 'This time slot is already booked or requires more transition time. Please select another time.');
  END IF;

  -- Direct overlap check with row lock
  SELECT COUNT(*) INTO v_conflict_count
  FROM (
    SELECT id FROM client_sessions
    WHERE therapist_id = p_therapist_id
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
    BEGIN
      UPDATE booking_attempts_log
      SET attempt_status = 'conflict_booking', error_code = 'CONFLICT_BOOKING',
          error_message = 'This time slot is already booked.'
      WHERE id = (SELECT id FROM booking_attempts_log WHERE idempotency_key = p_idempotency_key ORDER BY created_at DESC LIMIT 1);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    RETURN jsonb_build_object('success', false, 'error_code', 'CONFLICT_BOOKING',
      'error_message', 'This time slot is already booked. Please select another time.');
  END IF;

  -- Blocked time check
  SELECT COUNT(*) INTO v_blocked_count
  FROM calendar_events
  WHERE user_id = p_therapist_id
    AND event_type IN ('block', 'unavailable')
    AND status = 'confirmed'
    AND start_time < v_booking_end
    AND end_time > v_booking_start;

  IF v_blocked_count > 0 THEN
    BEGIN
      UPDATE booking_attempts_log
      SET attempt_status = 'conflict_blocked', error_code = 'CONFLICT_BLOCKED',
          error_message = 'This time slot is blocked or unavailable.'
      WHERE id = (SELECT id FROM booking_attempts_log WHERE idempotency_key = p_idempotency_key ORDER BY created_at DESC LIMIT 1);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    RETURN jsonb_build_object('success', false, 'error_code', 'CONFLICT_BLOCKED',
      'error_message', 'This time slot is blocked or unavailable. Please select another time.');
  END IF;

  -- Working hours validation
  SELECT working_hours INTO v_working_hours FROM practitioner_availability WHERE user_id = p_therapist_id LIMIT 1;

  IF v_working_hours IS NOT NULL THEN
    v_day_of_week := TRIM(LOWER(TO_CHAR(p_session_date, 'Day')));
    v_day_schedule := v_working_hours->v_day_of_week;
    IF v_day_schedule IS NOT NULL AND (v_day_schedule->>'enabled')::boolean IS TRUE THEN
      IF v_day_schedule->'hours' IS NOT NULL THEN
        SELECT EXISTS(
          SELECT 1 FROM jsonb_array_elements(v_day_schedule->'hours') AS time_block
          WHERE (time_block->>'start')::time <= p_start_time::time
            AND (time_block->>'end')::time >= (p_start_time::time + (p_duration_minutes || ' minutes')::interval)
        ) INTO v_time_valid;
      ELSE
        v_time_valid := (
          (v_day_schedule->>'start')::time <= p_start_time::time
          AND (v_day_schedule->>'end')::time >= (p_start_time::time + (p_duration_minutes || ' minutes')::interval)
        );
      END IF;
      IF NOT v_time_valid THEN
        BEGIN
          UPDATE booking_attempts_log
          SET attempt_status = 'invalid_time', error_code = 'INVALID_TIME',
              error_message = 'Selected time is outside practitioner working hours'
          WHERE id = (SELECT id FROM booking_attempts_log WHERE idempotency_key = p_idempotency_key ORDER BY created_at DESC LIMIT 1);
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
        RETURN jsonb_build_object('success', false, 'error_code', 'INVALID_TIME',
          'error_message', 'Selected time is outside practitioner working hours');
      END IF;
    END IF;
  END IF;

  -- All validations passed — create the booking
  INSERT INTO client_sessions (
    therapist_id, client_id, client_name, client_email, client_phone,
    session_date, start_time, duration_minutes, session_type, price, notes,
    payment_status, status, is_peer_booking, credit_cost,
    stripe_payment_intent_id, platform_fee_amount, practitioner_amount,
    expires_at, idempotency_key, is_guest_booking,
    appointment_type, visit_address, payment_collection
  ) VALUES (
    p_therapist_id, p_client_id, p_client_name, p_client_email, p_client_phone,
    p_session_date, p_start_time, p_duration_minutes, p_session_type, p_price, p_notes,
    v_eff_payment_status, v_eff_status::session_status, p_is_peer_booking, p_credit_cost,
    p_stripe_payment_intent_id, v_eff_platform_fee, v_eff_practitioner_amount,
    COALESCE(v_eff_expires_at, CASE WHEN v_eff_status = 'pending_payment' THEN NOW() + INTERVAL '60 minutes' ELSE NULL END),
    p_idempotency_key, COALESCE(p_is_guest_booking, false),
    COALESCE(p_appointment_type, 'clinic'), p_visit_address, v_eff_payment_collection
  )
  RETURNING id INTO v_session_id;

  -- Broadcast availability change
  PERFORM pg_notify('availability_changes', jsonb_build_object(
    'practitioner_id', p_therapist_id, 'session_date', p_session_date,
    'change_type', 'booking_created', 'session_id', v_session_id
  )::text);

  -- Update audit log
  BEGIN
    UPDATE booking_attempts_log
    SET attempt_status = 'success', session_id = v_session_id, error_code = NULL, error_message = NULL
    WHERE id = (SELECT id FROM booking_attempts_log WHERE idempotency_key = p_idempotency_key ORDER BY created_at DESC LIMIT 1);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object('success', true, 'session_id', v_session_id);

EXCEPTION
  WHEN unique_violation THEN
    BEGIN
      UPDATE booking_attempts_log
      SET attempt_status = 'conflict_booking', error_code = 'CONFLICT_BOOKING',
          error_message = 'This time slot is already booked.'
      WHERE id = (SELECT id FROM booking_attempts_log WHERE idempotency_key = p_idempotency_key ORDER BY created_at DESC LIMIT 1);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    RETURN jsonb_build_object('success', false, 'error_code', 'CONFLICT_BOOKING',
      'error_message', 'This time slot is already booked. Please select another time.');
  WHEN OTHERS THEN
    BEGIN
      UPDATE booking_attempts_log
      SET attempt_status = 'database_error', error_code = 'DATABASE_ERROR', error_message = SQLERRM
      WHERE id = (SELECT id FROM booking_attempts_log WHERE idempotency_key = p_idempotency_key ORDER BY created_at DESC LIMIT 1);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    RETURN jsonb_build_object('success', false, 'error_code', 'DATABASE_ERROR', 'error_message', SQLERRM);
END;
$function$;


-- 4) Update the legacy overload (without p_appointment_type) to forward p_payment_collection too
CREATE OR REPLACE FUNCTION public.create_booking_with_validation(
  p_therapist_id uuid,
  p_client_id uuid,
  p_client_name text,
  p_client_email text,
  p_session_date date,
  p_start_time time without time zone,
  p_duration_minutes integer,
  p_session_type text,
  p_price numeric,
  p_client_phone text DEFAULT NULL::text,
  p_notes text DEFAULT NULL::text,
  p_payment_status text DEFAULT 'pending'::text,
  p_status text DEFAULT 'pending_payment'::text,
  p_is_peer_booking boolean DEFAULT false,
  p_credit_cost integer DEFAULT 0,
  p_stripe_session_id text DEFAULT NULL::text,
  p_stripe_payment_intent_id text DEFAULT NULL::text,
  p_platform_fee_amount numeric DEFAULT NULL::numeric,
  p_practitioner_amount numeric DEFAULT NULL::numeric,
  p_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_idempotency_key text DEFAULT NULL::text,
  p_is_guest_booking boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN public.create_booking_with_validation(
    p_therapist_id => p_therapist_id,
    p_client_id => p_client_id,
    p_client_name => p_client_name,
    p_client_email => p_client_email,
    p_session_date => p_session_date,
    p_start_time => p_start_time,
    p_duration_minutes => p_duration_minutes,
    p_session_type => p_session_type,
    p_price => p_price,
    p_client_phone => p_client_phone,
    p_notes => p_notes,
    p_payment_status => p_payment_status,
    p_status => p_status,
    p_is_peer_booking => p_is_peer_booking,
    p_credit_cost => p_credit_cost,
    p_stripe_session_id => p_stripe_session_id,
    p_stripe_payment_intent_id => p_stripe_payment_intent_id,
    p_platform_fee_amount => p_platform_fee_amount,
    p_practitioner_amount => p_practitioner_amount,
    p_expires_at => p_expires_at,
    p_idempotency_key => p_idempotency_key,
    p_is_guest_booking => p_is_guest_booking,
    p_appointment_type => 'clinic',
    p_visit_address => NULL,
    p_payment_collection => 'online'
  );
END;
$function$;


-- 5) mark_session_paid_in_person RPC
CREATE OR REPLACE FUNCTION public.mark_session_paid_in_person(
  p_session_id uuid,
  p_method text DEFAULT 'cash'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_session RECORD;
BEGIN
  IF p_method IS NULL OR TRIM(p_method) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment method is required (e.g. cash, external_terminal).');
  END IF;

  SELECT id, therapist_id, payment_collection, payment_status, status
  INTO v_session
  FROM client_sessions
  WHERE id = p_session_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session not found.');
  END IF;

  -- Only the practitioner who owns the session can mark it paid
  IF v_session.therapist_id != auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the session practitioner can mark payment.');
  END IF;

  IF v_session.payment_collection != 'in_person' THEN
    RETURN jsonb_build_object('success', false, 'error', 'This session uses online payment, not in-person.');
  END IF;

  IF v_session.payment_status = 'completed' THEN
    RETURN jsonb_build_object('success', true, 'message', 'Already marked as paid.');
  END IF;

  UPDATE client_sessions
  SET payment_method = TRIM(p_method),
      payment_date = NOW(),
      payment_status = 'completed',
      updated_at = NOW()
  WHERE id = p_session_id;

  RETURN jsonb_build_object('success', true, 'session_id', p_session_id);
END;
$function$;

COMMENT ON FUNCTION public.mark_session_paid_in_person(uuid, text)
  IS 'Practitioner marks an in_person session as paid (cash, external_terminal, etc). Sets payment_method, payment_date, payment_status=completed.';
