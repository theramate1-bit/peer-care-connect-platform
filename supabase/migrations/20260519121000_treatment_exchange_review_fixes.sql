-- Review fixes: leg-2 session required fields, decline auth, idempotent credit deduction.

-- 1) Idempotent credit burn (avoid double-deduct on retry)
CREATE OR REPLACE FUNCTION public.process_peer_booking_credits(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_sess record;
  v_cost integer;
  v_existing integer;
BEGIN
  IF p_session_id IS NULL THEN
    RAISE EXCEPTION 'Session id required';
  END IF;

  SELECT COUNT(*)::integer INTO v_existing
  FROM public.credit_transactions
  WHERE session_id = p_session_id
    AND transaction_type IN ('session_payment', 'spend');

  IF v_existing > 0 THEN
    RETURN;
  END IF;

  SELECT
    cs.client_id,
    cs.duration_minutes,
    cs.credit_cost,
    cs.is_peer_booking
  INTO v_sess
  FROM public.client_sessions cs
  WHERE cs.id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  IF COALESCE(v_sess.is_peer_booking, false) = false THEN
    RAISE EXCEPTION 'Not a peer booking session';
  END IF;

  v_cost := GREATEST(
    1,
    COALESCE(
      NULLIF(v_sess.credit_cost, 0),
      v_sess.duration_minutes,
      60
    )
  );

  PERFORM public.update_credit_balance(
    v_sess.client_id,
    v_cost,
    'session_payment',
    format('Treatment exchange (%s min)', v_cost),
    p_session_id,
    'client_session',
    p_session_id,
    NULL
  );

  UPDATE public.client_sessions
  SET credit_cost = v_cost, updated_at = NOW()
  WHERE id = p_session_id;
END;
$function$;

-- 2) Leg-2 session: populate client_name / client_email (parity with leg-1)
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

-- 3) Decline/reschedule: enforce caller is the recipient
CREATE OR REPLACE FUNCTION public.decline_exchange_request(
  p_request_id uuid,
  p_recipient_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_request record;
  v_recipient_name text;
  v_cap integer;
  v_window_days integer;
  v_count integer;
  v_user_a uuid;
  v_user_b uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  IF p_recipient_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO v_request
  FROM public.treatment_exchange_requests
  WHERE id = p_request_id
    AND recipient_id = p_recipient_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or already processed';
  END IF;

  v_user_a := v_request.requester_id;
  v_user_b := v_request.recipient_id;

  SELECT COALESCE(NULLIF(TRIM((SELECT value FROM app_config WHERE key = 'exchange_reschedule_cap' LIMIT 1)), '')::integer, 2)
  INTO v_cap;

  SELECT COALESCE(NULLIF(TRIM((SELECT value FROM app_config WHERE key = 'exchange_reschedule_window_days' LIMIT 1)), '')::integer, 30)
  INTO v_window_days;

  SELECT COUNT(*)::integer INTO v_count
  FROM public.treatment_exchange_requests
  WHERE status = 'declined'
    AND declined_at >= NOW() - (v_window_days || ' days')::interval
    AND (
      (requester_id = v_user_a AND recipient_id = v_user_b)
      OR (requester_id = v_user_b AND recipient_id = v_user_a)
    );

  IF v_count >= v_cap THEN
    RAISE EXCEPTION 'RESCHEDULE_CAP_EXCEEDED: You have reached the maximum of % reschedules per pair in % days. Please accept or let the request expire.', v_cap, v_window_days;
  END IF;

  UPDATE public.slot_holds
  SET status = 'released', updated_at = NOW()
  WHERE request_id = p_request_id AND status = 'active';

  UPDATE public.treatment_exchange_requests
  SET status = 'declined', declined_at = NOW(), recipient_notes = p_reason, updated_at = NOW()
  WHERE id = p_request_id;

  UPDATE public.notifications
  SET dismissed_at = NOW(), read_at = NOW(), read = true
  WHERE recipient_id = p_recipient_id
    AND source_id::uuid = p_request_id
    AND source_type IN ('treatment_exchange_request', 'slot_hold')
    AND dismissed_at IS NULL;

  SELECT TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) INTO v_recipient_name
  FROM public.users WHERE id = p_recipient_id;

  PERFORM public.create_notification(
    v_request.requester_id,
    'exchange_request_declined',
    'Different time requested',
    FORMAT(
      '%s cannot do %s at %s. They suggested looking for another time.%s',
      COALESCE(NULLIF(TRIM(v_recipient_name), ''), 'The practitioner'),
      v_request.requested_session_date,
      v_request.requested_start_time,
      CASE
        WHEN p_reason IS NOT NULL AND TRIM(p_reason) <> '' THEN ' Note: ' || TRIM(p_reason)
        ELSE ''
      END
    ),
    jsonb_build_object(
      'requestId', p_request_id,
      'recipientId', p_recipient_id,
      'sessionDate', v_request.requested_session_date,
      'startTime', v_request.requested_start_time,
      'duration', v_request.duration_minutes,
      'reason', p_reason
    ),
    'treatment_exchange_request',
    p_request_id::text
  );
END;
$function$;
