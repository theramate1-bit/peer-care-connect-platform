-- Cash bookings v1 — P0 correctness fixes
-- 1) mark_session_paid_in_person: reject if session is cancelled or no_show
-- 2) create_booking_with_validation: reject in_person payment if practitioner has not opted in
--
-- Both changes are server-side guards. They complement (do not replace) the
-- UI-level checks already present in BookingFlow / UpcomingSessions.

-- ============================================================
-- 1) mark_session_paid_in_person: add status guard
-- ============================================================
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

  -- Cannot mark payment on a session that was cancelled or marked no-show
  IF v_session.status IN ('cancelled', 'no_show') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Cannot mark payment on a %s session.', v_session.status)
    );
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
  IS 'Practitioner marks an in_person session as paid (cash, external_terminal, etc). Blocks cancelled/no_show sessions. Sets payment_method, payment_date, payment_status=completed.';

-- ============================================================
-- 2) create_booking_with_validation (25-arg overload):
--    reject p_payment_collection='in_person' when the practitioner
--    has not opted in via users.accept_in_person_payment
-- ============================================================
-- NOTE: The full body of create_booking_with_validation (25-arg overload) is
-- re-declared here to inject the opt-in check right after payment_collection
-- normalization. The rest of the logic is preserved 1:1 with
-- 20260416100000_cash_bookings_v1.sql.
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
  v_session_id UUID; v_booking_start TIMESTAMPTZ; v_booking_end TIMESTAMPTZ;
  v_conflict_count INTEGER; v_blocked_count INTEGER; v_working_hours JSONB;
  v_day_schedule JSONB; v_day_of_week TEXT; v_time_valid BOOLEAN := false;
  v_existing_idempotency UUID; v_error_code TEXT; v_error_message TEXT; v_log_id UUID;
  v_therapist_rating NUMERIC; v_client_rating NUMERIC; v_therapist_role TEXT; v_client_role TEXT;
  v_therapist_tier TEXT; v_client_tier TEXT; v_therapist_type TEXT; v_requested_appointment_type TEXT;
  v_eff_payment_collection TEXT; v_eff_status TEXT; v_eff_payment_status TEXT;
  v_eff_platform_fee numeric; v_eff_practitioner_amount numeric; v_eff_expires_at timestamptz;
  v_accepts_in_person boolean;
BEGIN
  v_eff_payment_collection := COALESCE(NULLIF(TRIM(p_payment_collection), ''), 'online');
  IF v_eff_payment_collection NOT IN ('online', 'in_person') THEN v_eff_payment_collection := 'online'; END IF;

  -- Practitioner opt-in guard for in-person (pay-at-clinic) bookings
  IF v_eff_payment_collection = 'in_person' THEN
    SELECT COALESCE(accept_in_person_payment, false)
      INTO v_accepts_in_person
      FROM public.users
      WHERE id = p_therapist_id;
    IF NOT COALESCE(v_accepts_in_person, false) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'IN_PERSON_NOT_ACCEPTED',
        'error_message', 'This practitioner does not accept in-person (pay at clinic) payments.'
      );
    END IF;
  END IF;

  IF v_eff_payment_collection = 'in_person' THEN
    v_eff_status := COALESCE(NULLIF(TRIM(p_status), ''), 'scheduled');
    IF v_eff_status = 'pending_payment' THEN v_eff_status := 'scheduled'; END IF;
    v_eff_payment_status := 'awaiting_in_person';
    v_eff_platform_fee := 0; v_eff_practitioner_amount := COALESCE(p_price, 0); v_eff_expires_at := NULL;
  ELSE
    v_eff_status := COALESCE(NULLIF(TRIM(p_status), ''), 'pending_payment');
    v_eff_payment_status := COALESCE(NULLIF(TRIM(p_payment_status), ''), 'pending');
    v_eff_platform_fee := p_platform_fee_amount; v_eff_practitioner_amount := p_practitioner_amount;
    v_eff_expires_at := p_expires_at;
  END IF;
  BEGIN
    INSERT INTO booking_attempts_log (therapist_id, client_id, session_date, start_time, duration_minutes, attempt_status, error_code, idempotency_key, is_peer_booking)
    VALUES (p_therapist_id, p_client_id, p_session_date, p_start_time, p_duration_minutes, 'unknown_error', 'INVALID_PARAMETERS', p_idempotency_key, p_is_peer_booking)
    RETURNING id INTO v_log_id;
  EXCEPTION WHEN OTHERS THEN v_log_id := NULL;
  END;
  IF p_therapist_id IS NULL OR p_client_id IS NULL OR p_session_date IS NULL OR p_start_time IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'INVALID_PARAMETERS', 'error_message', 'Missing required parameters');
  END IF;
  IF p_duration_minutes IS NULL OR p_duration_minutes <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'INVALID_DURATION', 'error_message', 'Duration must be greater than 0');
  END IF;
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_existing_idempotency FROM client_sessions WHERE idempotency_key = p_idempotency_key LIMIT 1;
    IF v_existing_idempotency IS NOT NULL THEN
      RETURN jsonb_build_object('success', false, 'error_code', 'DUPLICATE_REQUEST', 'error_message', 'This booking request has already been processed', 'session_id', v_existing_idempotency);
    END IF;
  END IF;
  IF p_session_date < CURRENT_DATE THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'INVALID_DATE', 'error_message', 'Cannot book sessions in the past');
  END IF;
  SELECT user_role, COALESCE(average_rating, 0) INTO v_therapist_role, v_therapist_rating FROM users WHERE id = p_therapist_id;
  SELECT user_role, COALESCE(average_rating, 0) INTO v_client_role, v_client_rating FROM users WHERE id = p_client_id;
  IF v_therapist_role IN ('sports_therapist','massage_therapist','osteopath') AND v_client_role IN ('sports_therapist','massage_therapist','osteopath') THEN
    v_therapist_tier := get_rating_tier(v_therapist_rating); v_client_tier := get_rating_tier(v_client_rating);
    IF v_therapist_tier != v_client_tier THEN
      RETURN jsonb_build_object('success', false, 'error_code', 'RATING_TIER_MISMATCH', 'error_message', format('Rating tier mismatch: %s vs %s', v_client_tier, v_therapist_tier));
    END IF;
  END IF;
  v_booking_start := (p_session_date::text || ' ' || p_start_time::text)::timestamptz;
  v_booking_end := v_booking_start + (p_duration_minutes || ' minutes')::interval;
  v_requested_appointment_type := COALESCE(NULLIF(TRIM(p_appointment_type), ''), 'clinic');
  IF v_requested_appointment_type = 'mobile' AND p_session_date = CURRENT_DATE THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'SAME_DAY_MOBILE_USE_REQUEST_FLOW', 'error_message', 'Mobile sessions for today must use Request Visit.');
  END IF;
  IF v_requested_appointment_type = 'mobile' AND (p_visit_address IS NULL OR NULLIF(TRIM(COALESCE(p_visit_address,'')), '') IS NULL) THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'MISSING_VISIT_ADDRESS', 'error_message', 'Visit address is required for mobile sessions.');
  END IF;
  SELECT therapist_type INTO v_therapist_type FROM users WHERE id = p_therapist_id LIMIT 1;
  PERFORM pg_advisory_xact_lock(hashtext(p_therapist_id::text || p_session_date::text || p_start_time::text));
  SELECT COUNT(*) INTO v_conflict_count FROM (
    SELECT id FROM client_sessions WHERE therapist_id = p_therapist_id AND session_date = p_session_date
      AND status IN ('scheduled','confirmed','in_progress','pending_payment')
      AND ((status = 'pending_payment' AND expires_at IS NOT NULL AND expires_at > NOW()) OR status != 'pending_payment')
      AND (
        (p_start_time::time < (start_time::time + (COALESCE(duration_minutes,60)||' minutes')::interval) AND (p_start_time::time + (p_duration_minutes||' minutes')::interval) > start_time::time)
        OR (p_start_time::time >= (start_time::time + (COALESCE(duration_minutes,60)||' minutes')::interval) AND p_start_time::time < ((start_time::time + (COALESCE(duration_minutes,60)||' minutes')::interval) + make_interval(mins => public.get_directional_booking_buffer_minutes(v_therapist_type, COALESCE(appointment_type,'clinic'), v_requested_appointment_type))))
        OR (start_time::time >= (p_start_time::time + (p_duration_minutes||' minutes')::interval) AND start_time::time < ((p_start_time::time + (p_duration_minutes||' minutes')::interval) + make_interval(mins => public.get_directional_booking_buffer_minutes(v_therapist_type, v_requested_appointment_type, COALESCE(appointment_type,'clinic')))))
      )
  ) dr;
  IF v_conflict_count > 0 THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'CONFLICT_BOOKING', 'error_message', 'This time slot is already booked or requires more transition time.');
  END IF;
  SELECT COUNT(*) INTO v_conflict_count FROM (
    SELECT id FROM client_sessions WHERE therapist_id = p_therapist_id AND session_date = p_session_date
      AND status IN ('scheduled','confirmed','in_progress','pending_payment')
      AND ((status = 'pending_payment' AND expires_at IS NOT NULL AND expires_at > NOW()) OR status != 'pending_payment')
      AND (p_start_time::time < (start_time::time + (COALESCE(duration_minutes,60)||' minutes')::interval))
      AND ((start_time::time + (COALESCE(duration_minutes,60)||' minutes')::interval) > p_start_time::time)
    FOR UPDATE
  ) lr;
  IF v_conflict_count > 0 THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'CONFLICT_BOOKING', 'error_message', 'This time slot is already booked.');
  END IF;
  SELECT COUNT(*) INTO v_blocked_count FROM calendar_events WHERE user_id = p_therapist_id AND event_type IN ('block','unavailable') AND status = 'confirmed' AND start_time < v_booking_end AND end_time > v_booking_start;
  IF v_blocked_count > 0 THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'CONFLICT_BLOCKED', 'error_message', 'This time slot is blocked or unavailable.');
  END IF;
  SELECT working_hours INTO v_working_hours FROM practitioner_availability WHERE user_id = p_therapist_id LIMIT 1;
  IF v_working_hours IS NOT NULL THEN
    v_day_of_week := TRIM(LOWER(TO_CHAR(p_session_date, 'Day'))); v_day_schedule := v_working_hours->v_day_of_week;
    IF v_day_schedule IS NOT NULL AND (v_day_schedule->>'enabled')::boolean IS TRUE THEN
      IF v_day_schedule->'hours' IS NOT NULL THEN
        SELECT EXISTS(SELECT 1 FROM jsonb_array_elements(v_day_schedule->'hours') AS tb WHERE (tb->>'start')::time <= p_start_time::time AND (tb->>'end')::time >= (p_start_time::time + (p_duration_minutes||' minutes')::interval)) INTO v_time_valid;
      ELSE
        v_time_valid := ((v_day_schedule->>'start')::time <= p_start_time::time AND (v_day_schedule->>'end')::time >= (p_start_time::time + (p_duration_minutes||' minutes')::interval));
      END IF;
      IF NOT v_time_valid THEN
        RETURN jsonb_build_object('success', false, 'error_code', 'INVALID_TIME', 'error_message', 'Selected time is outside practitioner working hours');
      END IF;
    END IF;
  END IF;
  INSERT INTO client_sessions (
    therapist_id, client_id, client_name, client_email, client_phone, session_date, start_time, duration_minutes, session_type, price, notes,
    payment_status, status, is_peer_booking, credit_cost, stripe_payment_intent_id, platform_fee_amount, practitioner_amount,
    expires_at, idempotency_key, is_guest_booking, appointment_type, visit_address, payment_collection
  ) VALUES (
    p_therapist_id, p_client_id, p_client_name, p_client_email, p_client_phone, p_session_date, p_start_time, p_duration_minutes, p_session_type, p_price, p_notes,
    v_eff_payment_status, v_eff_status::session_status, p_is_peer_booking, p_credit_cost, p_stripe_payment_intent_id, v_eff_platform_fee, v_eff_practitioner_amount,
    COALESCE(v_eff_expires_at, CASE WHEN v_eff_status = 'pending_payment' THEN NOW() + INTERVAL '60 minutes' ELSE NULL END),
    p_idempotency_key, COALESCE(p_is_guest_booking, false), COALESCE(p_appointment_type, 'clinic'), p_visit_address, v_eff_payment_collection
  ) RETURNING id INTO v_session_id;
  PERFORM pg_notify('availability_changes', jsonb_build_object('practitioner_id', p_therapist_id, 'session_date', p_session_date, 'change_type', 'booking_created', 'session_id', v_session_id)::text);
  BEGIN
    UPDATE booking_attempts_log SET attempt_status = 'success', session_id = v_session_id, error_code = NULL, error_message = NULL
    WHERE id = (SELECT id FROM booking_attempts_log WHERE idempotency_key = p_idempotency_key ORDER BY created_at DESC LIMIT 1);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RETURN jsonb_build_object('success', true, 'session_id', v_session_id);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'CONFLICT_BOOKING', 'error_message', 'This time slot is already booked.');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'DATABASE_ERROR', 'error_message', SQLERRM);
END;
$function$;

COMMENT ON FUNCTION public.create_booking_with_validation(
  uuid, uuid, text, text, date, time without time zone, integer, text, numeric,
  text, text, text, text, boolean, integer, text, text, numeric, numeric,
  timestamp with time zone, text, boolean, text, text, text
) IS 'Creates a client_sessions row with validation. v1.1 adds practitioner opt-in guard: rejects p_payment_collection=in_person when users.accept_in_person_payment is false/null.';
