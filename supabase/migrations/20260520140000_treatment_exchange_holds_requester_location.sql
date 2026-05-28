-- Close logical gaps: requester diary at send, pending/hold overlap, peer session location fields.

DROP FUNCTION IF EXISTS public.assert_practitioner_slot_available(uuid, date, time without time zone, integer);

-- Delivery model for peer sessions (therapist delivering the treatment)
CREATE OR REPLACE FUNCTION public.peer_exchange_delivery_for_therapist(p_therapist_id uuid)
RETURNS TABLE(appointment_type text, visit_address text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tt text;
  v_clinic text;
  v_location text;
  v_base text;
  v_line1 text;
  v_city text;
  v_postcode text;
  v_mobile_addr text;
BEGIN
  SELECT
    COALESCE(u.therapist_type::text, 'clinic_based'),
    NULLIF(TRIM(u.clinic_address), ''),
    NULLIF(TRIM(u.location), ''),
    NULLIF(TRIM(u.base_address), ''),
    NULLIF(TRIM(u.address_line1), ''),
    NULLIF(TRIM(u.address_city), ''),
    NULLIF(TRIM(u.address_postcode), '')
  INTO v_tt, v_clinic, v_location, v_base, v_line1, v_city, v_postcode
  FROM public.users u
  WHERE u.id = p_therapist_id;

  appointment_type := CASE
    WHEN v_tt = 'mobile' THEN 'mobile'
    ELSE 'clinic'
  END;

  v_mobile_addr := COALESCE(
    v_base,
    NULLIF(TRIM(CONCAT_WS(', ', v_line1, v_city, v_postcode)), ''),
    v_location
  );

  visit_address := CASE
    WHEN appointment_type = 'mobile' THEN v_mobile_addr
    ELSE COALESCE(v_clinic, v_location, v_mobile_addr)
  END;

  RETURN NEXT;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.peer_exchange_delivery_for_therapist(uuid) TO authenticated, service_role;

-- Slot guard: sessions, blocks, active holds, pending exchange on same practitioner slot
CREATE OR REPLACE FUNCTION public.assert_practitioner_slot_available(
  p_practitioner_id uuid,
  p_session_date date,
  p_start_time time without time zone,
  p_duration_minutes integer,
  p_exclude_request_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_duration integer;
  v_end_time time without time zone;
  v_booking_start timestamptz;
  v_booking_end timestamptz;
  v_conflict_count integer;
  v_blocked_count integer;
  v_hold_count integer;
  v_pending_exchange_count integer;
BEGIN
  IF p_practitioner_id IS NULL OR p_session_date IS NULL OR p_start_time IS NULL THEN
    RAISE EXCEPTION 'Missing slot parameters';
  END IF;

  v_duration := GREATEST(1, COALESCE(p_duration_minutes, 60));
  v_end_time := (p_start_time + make_interval(mins => v_duration))::time without time zone;
  v_booking_start := (p_session_date::text || ' ' || p_start_time::text)::timestamptz;
  v_booking_end := v_booking_start + (v_duration || ' minutes')::interval;

  PERFORM pg_advisory_xact_lock(
    hashtext(p_practitioner_id::text || p_session_date::text || p_start_time::text)
  );

  SELECT COUNT(*)::integer INTO v_conflict_count
  FROM (
    SELECT cs.id
    FROM public.client_sessions cs
    WHERE cs.therapist_id = p_practitioner_id
      AND cs.session_date = p_session_date
      AND cs.status IN ('scheduled', 'confirmed', 'in_progress', 'pending_payment')
      AND (
        (cs.status = 'pending_payment' AND cs.expires_at IS NOT NULL AND cs.expires_at > NOW())
        OR cs.status <> 'pending_payment'
      )
      AND (
        (p_start_time::time < (cs.start_time::time + make_interval(mins => COALESCE(cs.duration_minutes, 60))))
        AND ((cs.start_time::time + make_interval(mins => COALESCE(cs.duration_minutes, 60))) > p_start_time::time)
      )
    FOR UPDATE
  ) locked_rows;

  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION 'CONFLICT_BOOKING: This time slot is already booked. Please select another time.';
  END IF;

  SELECT COUNT(*)::integer INTO v_blocked_count
  FROM public.calendar_events ce
  WHERE ce.user_id = p_practitioner_id
    AND ce.event_type IN ('block', 'unavailable')
    AND ce.status = 'confirmed'
    AND ce.start_time < v_booking_end
    AND ce.end_time > v_booking_start;

  IF v_blocked_count > 0 THEN
    RAISE EXCEPTION 'CONFLICT_BLOCKED: This time slot is blocked or unavailable. Please select another time.';
  END IF;

  SELECT COUNT(*)::integer INTO v_hold_count
  FROM public.slot_holds sh
  WHERE sh.practitioner_id = p_practitioner_id
    AND sh.session_date = p_session_date
    AND sh.status = 'active'
    AND sh.expires_at > NOW()
    AND (p_exclude_request_id IS NULL OR sh.request_id IS DISTINCT FROM p_exclude_request_id)
    AND (
      (p_start_time::time < sh.end_time)
      AND (sh.start_time < v_end_time)
    );

  IF v_hold_count > 0 THEN
    RAISE EXCEPTION 'CONFLICT_HOLD: This time is temporarily held by another booking request.';
  END IF;

  SELECT COUNT(*)::integer INTO v_pending_exchange_count
  FROM public.treatment_exchange_requests ter
  WHERE ter.status = 'pending'
    AND ter.recipient_id = p_practitioner_id
    AND ter.requested_session_date = p_session_date
    AND (p_exclude_request_id IS NULL OR ter.id IS DISTINCT FROM p_exclude_request_id)
    AND (
      (p_start_time::time < ter.requested_end_time)
      AND (ter.requested_start_time < v_end_time)
    );

  IF v_pending_exchange_count > 0 THEN
    RAISE EXCEPTION 'CONFLICT_EXCHANGE_PENDING: Another treatment exchange request is already pending for this slot.';
  END IF;
END;
$function$;

-- create: validate both practitioners' diaries at proposed time
CREATE OR REPLACE FUNCTION public.create_treatment_exchange_request(
  p_recipient_id uuid,
  p_session_date date,
  p_start_time time without time zone,
  p_duration_minutes integer,
  p_session_type text DEFAULT NULL,
  p_requester_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_requester uuid := auth.uid();
  v_duration integer;
  v_end_time time without time zone;
  v_req_id uuid;
  v_credits integer;
  v_req_tier smallint;
  v_rec_tier smallint;
  v_req_avg numeric;
  v_rec_avg numeric;
  v_role text;
  v_opt_in boolean;
  v_onboarding text;
  v_active boolean;
  v_requester_name text;
  v_pending_count integer;
BEGIN
  IF v_requester IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_recipient_id = v_requester THEN
    RAISE EXCEPTION 'Cannot request exchange with yourself';
  END IF;

  v_duration := GREATEST(1, LEAST(COALESCE(p_duration_minutes, 60), 480));

  SELECT COALESCE(c.current_balance, c.balance, 0)::integer
  INTO v_credits
  FROM public.credits c
  WHERE c.user_id = v_requester;

  IF NOT FOUND THEN
    v_credits := 0;
  END IF;

  IF v_credits < v_duration THEN
    RAISE EXCEPTION 'Insufficient credits: need %, have %', v_duration, v_credits;
  END IF;

  SELECT tp.average_rating INTO v_req_avg
  FROM public.therapist_profiles tp
  WHERE tp.user_id = v_requester;

  SELECT tp.average_rating INTO v_rec_avg
  FROM public.therapist_profiles tp
  WHERE tp.user_id = p_recipient_id;

  v_req_tier := CASE
    WHEN v_req_avg IS NULL OR v_req_avg < 2 THEN 0::smallint
    WHEN v_req_avg < 4 THEN 1::smallint
    ELSE 2::smallint
  END;

  v_rec_tier := CASE
    WHEN v_rec_avg IS NULL OR v_rec_avg < 2 THEN 0::smallint
    WHEN v_rec_avg < 4 THEN 1::smallint
    ELSE 2::smallint
  END;

  IF v_req_tier <> v_rec_tier THEN
    RAISE EXCEPTION 'Recipient is not in your rating tier for treatment exchange';
  END IF;

  SELECT u.user_role::text,
         u.treatment_exchange_opt_in,
         u.onboarding_status::text,
         u.is_active
  INTO v_role, v_opt_in, v_onboarding, v_active
  FROM public.users u
  WHERE u.id = p_recipient_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Recipient not found';
  END IF;

  IF v_role IS NULL OR v_role NOT IN ('sports_therapist', 'osteopath', 'massage_therapist') THEN
    RAISE EXCEPTION 'Recipient is not eligible for treatment exchange';
  END IF;

  IF COALESCE(v_opt_in, false) = false THEN
    RAISE EXCEPTION 'Recipient has not opted in to treatment exchange';
  END IF;

  IF v_onboarding IS DISTINCT FROM 'completed' THEN
    RAISE EXCEPTION 'Recipient onboarding is not complete';
  END IF;

  IF COALESCE(v_active, false) = false THEN
    RAISE EXCEPTION 'Recipient account is not active';
  END IF;

  SELECT COUNT(*)::integer INTO v_pending_count
  FROM public.treatment_exchange_requests
  WHERE status = 'pending'
    AND requester_id = v_requester
    AND recipient_id = p_recipient_id;

  IF v_pending_count > 0 THEN
    RAISE EXCEPTION 'You already have a pending request with this practitioner. Cancel it before sending another.';
  END IF;

  PERFORM public.assert_practitioner_slot_available(
    p_recipient_id, p_session_date, p_start_time, v_duration, NULL
  );

  PERFORM public.assert_practitioner_slot_available(
    v_requester, p_session_date, p_start_time, v_duration, NULL
  );

  v_end_time := (p_start_time + make_interval(mins => v_duration))::time without time zone;

  INSERT INTO public.treatment_exchange_requests (
    requester_id,
    recipient_id,
    requested_session_date,
    requested_start_time,
    requested_end_time,
    duration_minutes,
    session_type,
    requester_notes,
    status
  ) VALUES (
    v_requester,
    p_recipient_id,
    p_session_date,
    p_start_time,
    v_end_time,
    v_duration,
    NULLIF(TRIM(COALESCE(p_session_type, '')), ''),
    NULLIF(TRIM(COALESCE(p_requester_notes, '')), ''),
    'pending'
  )
  RETURNING id INTO v_req_id;

  INSERT INTO public.slot_holds (
    practitioner_id,
    request_id,
    mobile_request_id,
    session_date,
    start_time,
    end_time,
    duration_minutes,
    expires_at,
    status
  ) VALUES (
    p_recipient_id,
    v_req_id,
    NULL,
    p_session_date,
    p_start_time,
    v_end_time,
    v_duration,
    NOW() + interval '10 minutes',
    'active'
  );

  SELECT TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) INTO v_requester_name
  FROM public.users
  WHERE id = v_requester;

  PERFORM public.create_notification(
    p_recipient_id,
    'exchange_request_received',
    'New treatment exchange request',
    FORMAT(
      '%s requested a treatment exchange for %s at %s',
      COALESCE(NULLIF(TRIM(v_requester_name), ''), 'A practitioner'),
      p_session_date,
      p_start_time
    ),
    jsonb_build_object(
      'requestId', v_req_id,
      'requesterId', v_requester,
      'recipientId', p_recipient_id
    ),
    'treatment_exchange_request',
    v_req_id::text
  );

  PERFORM public.create_notification(
    p_recipient_id,
    'exchange_slot_held',
    'Slot reserved (tentative)',
    FORMAT(
      'Your slot on %s at %s is tentatively reserved (~10 min) while you decide. Accept or suggest another time.',
      p_session_date,
      p_start_time
    ),
    jsonb_build_object('requestId', v_req_id),
    'slot_hold',
    v_req_id::text
  );

  RETURN v_req_id;
END;
$function$;

-- accept: exclude own hold/request from conflict re-check; set leg-1 location from recipient
CREATE OR REPLACE FUNCTION public.accept_exchange_request(
  p_request_id uuid,
  p_recipient_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_req record;
  v_deadline_days integer;
  v_mes_id uuid;
  v_recipient_name text;
  v_requester_name text;
  v_requester_email text;
  v_session_a_id uuid;
  v_duration integer;
  v_appt_type text;
  v_visit_addr text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  IF p_recipient_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT *
  INTO v_req
  FROM public.treatment_exchange_requests
  WHERE id = p_request_id
    AND recipient_id = p_recipient_id
    AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or already processed';
  END IF;

  v_duration := GREATEST(1, COALESCE(v_req.duration_minutes, 60));

  PERFORM public.assert_practitioner_slot_available(
    p_recipient_id,
    v_req.requested_session_date,
    v_req.requested_start_time,
    v_duration,
    p_request_id
  );

  SELECT d.appointment_type, d.visit_address
  INTO v_appt_type, v_visit_addr
  FROM public.peer_exchange_delivery_for_therapist(v_req.recipient_id) d;

  INSERT INTO public.mutual_exchange_sessions (
    exchange_request_id,
    practitioner_a_id,
    practitioner_b_id,
    session_date,
    start_time,
    duration_minutes,
    practitioner_b_booked,
    practitioner_a_booked,
    credits_deducted,
    status,
    created_at,
    updated_at
  ) VALUES (
    v_req.id,
    v_req.requester_id,
    v_req.recipient_id,
    v_req.requested_session_date,
    v_req.requested_start_time,
    v_duration,
    false,
    false,
    false,
    'active',
    NOW(),
    NOW()
  )
  ON CONFLICT (exchange_request_id) DO UPDATE
    SET updated_at = NOW()
  RETURNING id INTO v_mes_id;

  SELECT id INTO v_session_a_id
  FROM public.client_sessions
  WHERE therapist_id = v_req.recipient_id
    AND client_id = v_req.requester_id
    AND session_date = v_req.requested_session_date
    AND start_time = v_req.requested_start_time
    AND COALESCE(is_peer_booking, false) = true
    AND status NOT IN ('cancelled', 'expired')
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_session_a_id IS NULL THEN
    SELECT
      TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')),
      COALESCE(NULLIF(TRIM(email), ''), 'no-email@placeholder.local')
    INTO v_requester_name, v_requester_email
    FROM public.users
    WHERE id = v_req.requester_id;

    INSERT INTO public.client_sessions (
      therapist_id,
      client_id,
      client_name,
      client_email,
      session_date,
      start_time,
      duration_minutes,
      session_type,
      appointment_type,
      visit_address,
      status,
      payment_status,
      is_peer_booking,
      credit_cost,
      created_at,
      updated_at
    ) VALUES (
      v_req.recipient_id,
      v_req.requester_id,
      COALESCE(NULLIF(TRIM(v_requester_name), ''), 'Practitioner'),
      v_requester_email,
      v_req.requested_session_date,
      v_req.requested_start_time,
      v_duration,
      NULLIF(TRIM(COALESCE(v_req.session_type, '')), ''),
      v_appt_type,
      v_visit_addr,
      'scheduled',
      'paid',
      true,
      v_duration,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_session_a_id;
  END IF;

  UPDATE public.mutual_exchange_sessions
  SET
    practitioner_a_session_id = v_session_a_id,
    practitioner_a_booked = true,
    updated_at = NOW()
  WHERE exchange_request_id = v_req.id;

  UPDATE public.slot_holds
  SET status = 'released', updated_at = NOW()
  WHERE request_id = p_request_id AND status = 'active';

  SELECT COALESCE(
    NULLIF(TRIM((SELECT value FROM app_config WHERE key = 'exchange_reciprocal_deadline_days' LIMIT 1)), '')::integer,
    7
  ) INTO v_deadline_days;

  UPDATE public.treatment_exchange_requests
  SET
    status = 'accepted',
    accepted_at = NOW(),
    reciprocal_booking_deadline = COALESCE(
      reciprocal_booking_deadline,
      NOW() + (v_deadline_days || ' days')::interval
    ),
    updated_at = NOW()
  WHERE id = v_req.id;

  UPDATE public.notifications
  SET dismissed_at = NOW(), read_at = NOW(), read = true
  WHERE recipient_id = p_recipient_id
    AND source_id::uuid = p_request_id
    AND source_type IN ('treatment_exchange_request', 'slot_hold')
    AND dismissed_at IS NULL;

  SELECT TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))
  INTO v_recipient_name
  FROM public.users
  WHERE id = p_recipient_id;

  PERFORM public.create_notification(
    v_req.requester_id,
    'exchange_request_accepted',
    'Treatment Exchange Accepted',
    FORMAT(
      '%s accepted your treatment exchange for %s at %s. It is on your diary. They still need to book their return session.',
      COALESCE(NULLIF(TRIM(v_recipient_name), ''), 'A practitioner'),
      v_req.requested_session_date,
      v_req.requested_start_time
    ),
    jsonb_build_object(
      'requestId', v_req.id,
      'recipientId', p_recipient_id,
      'mutualExchangeSessionId', v_mes_id,
      'sessionId', v_session_a_id
    ),
    'treatment_exchange_request',
    v_req.id::text
  );

  RETURN v_mes_id;
END;
$function$;

-- book reciprocal: leg-2 location from requester (therapist delivering return treatment)
CREATE OR REPLACE FUNCTION public.book_exchange_reciprocal_session(
  p_request_id uuid,
  p_recipient_id uuid,
  p_session_date date,
  p_start_time time,
  p_duration_minutes integer DEFAULT 60
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_req record;
  v_mes record;
  v_deadline timestamptz;
  v_session_id uuid;
  v_leg_a_id uuid;
  v_now timestamptz := NOW();
  v_duration integer;
  v_recipient_name text;
  v_recipient_email text;
  v_appt_type text;
  v_visit_addr text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  IF p_recipient_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO v_req
  FROM public.treatment_exchange_requests
  WHERE id = p_request_id
    AND recipient_id = p_recipient_id
    AND status = 'accepted'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or not accepted';
  END IF;

  SELECT * INTO v_mes
  FROM public.mutual_exchange_sessions
  WHERE exchange_request_id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mutual exchange session missing';
  END IF;

  IF v_mes.practitioner_b_booked = true THEN
    RAISE EXCEPTION 'Already booked';
  END IF;

  v_deadline := COALESCE(v_req.reciprocal_booking_deadline, v_req.accepted_at + interval '7 days');
  IF v_deadline IS NOT NULL AND v_deadline < v_now THEN
    RAISE EXCEPTION 'RECIPROCAL_DEADLINE_PASSED';
  END IF;

  v_duration := GREATEST(1, COALESCE(p_duration_minutes, v_req.duration_minutes, 60));

  PERFORM public.assert_practitioner_slot_available(
    v_req.requester_id,
    p_session_date,
    p_start_time,
    v_duration,
    NULL
  );

  SELECT d.appointment_type, d.visit_address
  INTO v_appt_type, v_visit_addr
  FROM public.peer_exchange_delivery_for_therapist(v_req.requester_id) d;

  SELECT
    TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')),
    COALESCE(NULLIF(TRIM(email), ''), 'no-email@placeholder.local')
  INTO v_recipient_name, v_recipient_email
  FROM public.users
  WHERE id = v_req.recipient_id;

  INSERT INTO public.client_sessions (
    therapist_id,
    client_id,
    client_name,
    client_email,
    session_date,
    start_time,
    duration_minutes,
    session_type,
    appointment_type,
    visit_address,
    status,
    payment_status,
    is_peer_booking,
    credit_cost,
    created_at,
    updated_at
  ) VALUES (
    v_req.requester_id,
    v_req.recipient_id,
    COALESCE(NULLIF(TRIM(v_recipient_name), ''), 'Practitioner'),
    v_recipient_email,
    p_session_date,
    p_start_time,
    v_duration,
    NULLIF(TRIM(COALESCE(v_req.session_type, '')), ''),
    v_appt_type,
    v_visit_addr,
    'scheduled',
    'paid',
    true,
    v_duration,
    v_now,
    v_now
  )
  RETURNING id INTO v_session_id;

  v_leg_a_id := v_mes.practitioner_a_session_id;

  IF v_leg_a_id IS NULL THEN
    SELECT id INTO v_leg_a_id
    FROM public.client_sessions
    WHERE therapist_id = v_req.recipient_id
      AND client_id = v_req.requester_id
      AND session_date = v_mes.session_date
      AND start_time = v_mes.start_time
      AND COALESCE(is_peer_booking, false) = true
      AND status NOT IN ('cancelled', 'expired')
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  UPDATE public.mutual_exchange_sessions
  SET
    practitioner_b_session_id = v_session_id,
    practitioner_b_booked = true,
    practitioner_a_session_id = COALESCE(practitioner_a_session_id, v_leg_a_id),
    practitioner_a_booked = COALESCE(practitioner_a_booked, v_leg_a_id IS NOT NULL),
    updated_at = v_now
  WHERE id = v_mes.id;

  IF COALESCE(v_mes.credits_deducted, false) = false AND v_leg_a_id IS NOT NULL THEN
    PERFORM public.process_peer_booking_credits(v_leg_a_id);
    PERFORM public.process_peer_booking_credits(v_session_id);

    UPDATE public.mutual_exchange_sessions
    SET credits_deducted = true, updated_at = v_now
    WHERE id = v_mes.id;
  ELSIF COALESCE(v_mes.credits_deducted, false) = false AND v_leg_a_id IS NULL THEN
    RAISE EXCEPTION 'LEG_A_SESSION_MISSING: Accept must create the requester session before reciprocal booking';
  END IF;

  RETURN v_session_id;
END;
$function$;
