-- P0: slot conflict checks on send/accept/reciprocal; fix stale 24h expiry copy.
-- P1: peer cancel refund only when credits were actually deducted.

-- Shared availability guard (recipient/requester diary at propose/accept/book time)
CREATE OR REPLACE FUNCTION public.assert_practitioner_slot_available(
  p_practitioner_id uuid,
  p_session_date date,
  p_start_time time without time zone,
  p_duration_minutes integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_duration integer;
  v_booking_start timestamptz;
  v_booking_end timestamptz;
  v_conflict_count integer;
  v_blocked_count integer;
BEGIN
  IF p_practitioner_id IS NULL OR p_session_date IS NULL OR p_start_time IS NULL THEN
    RAISE EXCEPTION 'Missing slot parameters';
  END IF;

  v_duration := GREATEST(1, COALESCE(p_duration_minutes, 60));
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
END;
$function$;

GRANT EXECUTE ON FUNCTION public.assert_practitioner_slot_available(uuid, date, time without time zone, integer)
  TO authenticated, service_role;

-- create_treatment_exchange_request: validate recipient slot + accurate hold copy
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
    p_recipient_id,
    p_session_date,
    p_start_time,
    v_duration
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

-- accept_exchange_request: conflict check before committing accept + leg-1
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
    v_duration
  );

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

-- book_exchange_reciprocal_session: conflict on requester's calendar before leg-2 insert
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
    v_duration
  );

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

-- Peer cancel: do not mint credits if session_payment never ran (pre-reciprocal accept)
CREATE OR REPLACE FUNCTION public.process_peer_booking_refund(
  p_session_id uuid,
  p_cancellation_reason text DEFAULT 'Session cancelled'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_session record;
  v_client_balance integer;
  v_practitioner_balance integer;
  v_client_new_balance integer;
  v_practitioner_new_balance integer;
  v_client_payment_exists boolean;
  v_practitioner_earning_exists boolean;
  v_mutual_session_id uuid;
  v_reciprocal_session_id uuid;
  v_cancelled_by_user_id uuid;
  v_exchange_request_id uuid;
  v_reciprocal_request_id uuid;
  v_first_session_status text;
  v_first_session_date date;
  v_reciprocal_session_date date;
  v_reciprocal_start_time time;
BEGIN
  SELECT
    id,
    client_id,
    therapist_id,
    credit_cost,
    payment_status,
    status,
    is_peer_booking,
    session_date,
    start_time
  INTO v_session
  FROM public.client_sessions
  WHERE id = p_session_id
  FOR UPDATE;

  IF v_session.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Session not found', 'refunded_credits', 0);
  END IF;

  IF v_session.payment_status NOT IN ('paid', 'completed') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Session payment status is not eligible for refund: ' || COALESCE(v_session.payment_status, 'null'),
      'refunded_credits', 0
    );
  END IF;

  IF v_session.status = 'cancelled' THEN
    RETURN json_build_object('success', false, 'error', 'Session is already cancelled', 'refunded_credits', 0);
  END IF;

  IF COALESCE(v_session.is_peer_booking, false) THEN
    SELECT mes.id, mes.exchange_request_id, mes.session_date, mes.start_time
    INTO v_mutual_session_id, v_exchange_request_id, v_reciprocal_session_date, v_reciprocal_start_time
    FROM public.mutual_exchange_sessions mes
    WHERE mes.exchange_request_id IN (
      SELECT ter.id
      FROM public.treatment_exchange_requests ter
      WHERE ter.requester_id IN (v_session.therapist_id, v_session.client_id)
        AND ter.recipient_id IN (v_session.therapist_id, v_session.client_id)
    )
    AND mes.session_date = v_session.session_date
    AND mes.start_time = v_session.start_time
    AND (
      (mes.practitioner_a_id = v_session.therapist_id AND mes.practitioner_b_id = v_session.client_id)
      OR (mes.practitioner_a_id = v_session.client_id AND mes.practitioner_b_id = v_session.therapist_id)
    )
    ORDER BY mes.created_at DESC
    LIMIT 1;

    IF v_mutual_session_id IS NULL THEN
      SELECT mes.id, mes.exchange_request_id, mes.session_date, mes.start_time
      INTO v_mutual_session_id, v_exchange_request_id, v_reciprocal_session_date, v_reciprocal_start_time
      FROM public.mutual_exchange_sessions mes
      WHERE mes.session_date = v_session.session_date
        AND mes.start_time = v_session.start_time
        AND (
          (mes.practitioner_a_id = v_session.therapist_id AND mes.practitioner_b_id = v_session.client_id)
          OR (mes.practitioner_a_id = v_session.client_id AND mes.practitioner_b_id = v_session.therapist_id)
        )
      ORDER BY mes.created_at DESC
      LIMIT 1;
    END IF;

    IF v_mutual_session_id IS NOT NULL AND v_exchange_request_id IS NOT NULL THEN
      SELECT ter.recipient_booking_request_id
      INTO v_reciprocal_request_id
      FROM public.treatment_exchange_requests ter
      WHERE ter.id = v_exchange_request_id;

      IF v_reciprocal_request_id IS NOT NULL THEN
        SELECT mes.status, mes.session_date
        INTO v_first_session_status, v_first_session_date
        FROM public.mutual_exchange_sessions mes
        WHERE mes.exchange_request_id = v_reciprocal_request_id
        LIMIT 1;

        IF v_first_session_status = 'completed' THEN
          IF v_reciprocal_session_date > CURRENT_DATE
             OR (v_reciprocal_session_date = CURRENT_DATE AND v_reciprocal_start_time > CURRENT_TIME) THEN
            RETURN json_build_object(
              'success', false,
              'error', 'Cannot cancel reciprocal booking: The first peer treatment has been completed and the reciprocal booking is in the future.',
              'refunded_credits', 0
            );
          END IF;
        END IF;
      END IF;
    END IF;

    SELECT cs.id INTO v_reciprocal_session_id
    FROM public.client_sessions cs
    WHERE cs.is_peer_booking = true
      AND cs.session_date = v_session.session_date
      AND cs.start_time = v_session.start_time
      AND (
        (cs.therapist_id = v_session.client_id AND cs.client_id = v_session.therapist_id)
        OR (cs.therapist_id = v_session.therapist_id AND cs.client_id = v_session.client_id)
      )
      AND cs.id <> p_session_id
      AND cs.status <> 'cancelled'
    LIMIT 1;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.credit_transactions ct
    WHERE ct.user_id = v_session.client_id
      AND ct.session_id = p_session_id
      AND ct.transaction_type IN ('session_payment', 'spend')
  ) INTO v_client_payment_exists;

  SELECT EXISTS (
    SELECT 1
    FROM public.credit_transactions ct
    WHERE ct.user_id = v_session.therapist_id
      AND ct.session_id = p_session_id
      AND ct.transaction_type = 'session_earning'
  ) INTO v_practitioner_earning_exists;

  IF NOT v_client_payment_exists AND COALESCE(v_session.credit_cost, 0) > 0 THEN
    UPDATE public.client_sessions
    SET
      status = 'cancelled',
      payment_status = 'cancelled',
      cancellation_reason = p_cancellation_reason,
      cancelled_at = NOW(),
      updated_at = NOW()
    WHERE id = p_session_id;

    IF v_reciprocal_session_id IS NOT NULL THEN
      UPDATE public.client_sessions
      SET
        status = 'cancelled',
        payment_status = 'cancelled',
        cancellation_reason = 'Cancelled: Related booking was cancelled',
        cancelled_at = NOW(),
        updated_at = NOW()
      WHERE id = v_reciprocal_session_id;
    END IF;

    IF v_mutual_session_id IS NOT NULL THEN
      SELECT CASE
        WHEN v_session.client_id IN (mes.practitioner_a_id, mes.practitioner_b_id) THEN v_session.client_id
        ELSE v_session.therapist_id
      END
      INTO v_cancelled_by_user_id
      FROM public.mutual_exchange_sessions mes
      WHERE mes.id = v_mutual_session_id;

      UPDATE public.mutual_exchange_sessions
      SET
        status = 'cancelled',
        cancelled_at = NOW(),
        cancelled_by = v_cancelled_by_user_id,
        cancellation_reason = p_cancellation_reason,
        updated_at = NOW()
      WHERE id = v_mutual_session_id;
    END IF;

    RETURN json_build_object(
      'success', true,
      'refunded_credits', 0,
      'credits_were_deducted', false,
      'mutual_session_cancelled', v_mutual_session_id IS NOT NULL,
      'reciprocal_session_cancelled', v_reciprocal_session_id IS NOT NULL
    );
  END IF;

  IF v_session.credit_cost IS NULL OR v_session.credit_cost = 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'No credits to refund - session has no credit cost',
      'refunded_credits', 0
    );
  END IF;

  SELECT balance INTO v_client_balance
  FROM public.credits
  WHERE user_id = v_session.client_id
  FOR UPDATE;

  SELECT balance INTO v_practitioner_balance
  FROM public.credits
  WHERE user_id = v_session.therapist_id
  FOR UPDATE;

  v_client_new_balance := COALESCE(v_client_balance, 0) + v_session.credit_cost;

  IF v_practitioner_earning_exists THEN
    v_practitioner_new_balance := GREATEST(COALESCE(v_practitioner_balance, 0) - v_session.credit_cost, 0);
  ELSE
    v_practitioner_new_balance := COALESCE(v_practitioner_balance, 0);
  END IF;

  UPDATE public.credits
  SET
    balance = v_client_new_balance,
    current_balance = v_client_new_balance,
    total_spent = GREATEST(COALESCE(total_spent, 0) - v_session.credit_cost, 0),
    updated_at = NOW()
  WHERE user_id = v_session.client_id;

  IF v_practitioner_earning_exists THEN
    UPDATE public.credits
    SET
      balance = v_practitioner_new_balance,
      current_balance = v_practitioner_new_balance,
      total_earned = GREATEST(COALESCE(total_earned, 0) - v_session.credit_cost, 0),
      updated_at = NOW()
    WHERE user_id = v_session.therapist_id;
  END IF;

  INSERT INTO public.credit_transactions (
    user_id, transaction_type, amount, balance_before, balance_after,
    description, session_id, created_at
  ) VALUES (
    v_session.client_id, 'refund', v_session.credit_cost,
    v_client_balance, v_client_new_balance,
    'Refund: ' || p_cancellation_reason, p_session_id, NOW()
  );

  IF v_practitioner_earning_exists THEN
    INSERT INTO public.credit_transactions (
      user_id, transaction_type, amount, balance_before, balance_after,
      description, session_id, created_at
    ) VALUES (
      v_session.therapist_id, 'refund', -v_session.credit_cost,
      v_practitioner_balance, v_practitioner_new_balance,
      'Refund deduction: ' || p_cancellation_reason, p_session_id, NOW()
    );
  END IF;

  UPDATE public.client_sessions
  SET
    status = 'cancelled',
    payment_status = 'refunded',
    cancellation_reason = p_cancellation_reason,
    cancelled_at = NOW(),
    updated_at = NOW()
  WHERE id = p_session_id;

  IF v_reciprocal_session_id IS NOT NULL THEN
    UPDATE public.client_sessions
    SET
      status = 'cancelled',
      cancellation_reason = 'Cancelled: Related booking was cancelled',
      cancelled_at = NOW(),
      updated_at = NOW()
    WHERE id = v_reciprocal_session_id;
  END IF;

  IF v_mutual_session_id IS NOT NULL THEN
    SELECT CASE
      WHEN v_session.client_id IN (mes.practitioner_a_id, mes.practitioner_b_id) THEN v_session.client_id
      ELSE v_session.therapist_id
    END
    INTO v_cancelled_by_user_id
    FROM public.mutual_exchange_sessions mes
    WHERE mes.id = v_mutual_session_id;

    UPDATE public.mutual_exchange_sessions
    SET
      status = 'cancelled',
      cancelled_at = NOW(),
      cancelled_by = v_cancelled_by_user_id,
      cancellation_reason = p_cancellation_reason,
      updated_at = NOW()
    WHERE id = v_mutual_session_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'refunded_credits', v_session.credit_cost,
    'credits_were_deducted', true,
    'client_new_balance', v_client_new_balance,
    'practitioner_new_balance', v_practitioner_new_balance,
    'practitioner_credits_deducted', v_practitioner_earning_exists,
    'mutual_session_cancelled', v_mutual_session_id IS NOT NULL,
    'reciprocal_session_cancelled', v_reciprocal_session_id IS NOT NULL
  );

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in process_peer_booking_refund: %', SQLERRM;
  RETURN json_build_object('success', false, 'error', SQLERRM, 'refunded_credits', 0);
END;
$function$;
