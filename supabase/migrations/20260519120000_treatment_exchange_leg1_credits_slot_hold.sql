-- Treatment exchange: leg-1 session on accept, slot holds on send, credits on both legs booked.
-- Closes gaps: missing requester diary session, no slot hold, no credit burn on native reciprocal book.

-- 1) Track peer session ids on mutual exchange
ALTER TABLE public.mutual_exchange_sessions
  ADD COLUMN IF NOT EXISTS practitioner_a_session_id uuid REFERENCES public.client_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS practitioner_b_session_id uuid REFERENCES public.client_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS practitioner_a_booked boolean NOT NULL DEFAULT false;

-- 2) Deduct credits for one peer client_session (client pays 1 credit / minute)
CREATE OR REPLACE FUNCTION public.process_peer_booking_credits(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_sess record;
  v_cost integer;
BEGIN
  IF p_session_id IS NULL THEN
    RAISE EXCEPTION 'Session id required';
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

GRANT EXECUTE ON FUNCTION public.process_peer_booking_credits(uuid) TO authenticated, service_role;

-- 3) Create request + 10-minute slot hold + notifications
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
      'Your slot on %s at %s is tentatively reserved (~10 min) while you decide. The request expires in 24 hours.',
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

-- 4) Accept: mutual row + leg-1 peer session in diary (requester receives from recipient)
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

-- 5) Reciprocal book: leg-2 session + deduct credits for both legs once
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

  INSERT INTO public.client_sessions (
    therapist_id,
    client_id,
    session_date,
    start_time,
    duration_minutes,
    status,
    payment_status,
    is_peer_booking,
    credit_cost,
    created_at,
    updated_at
  ) VALUES (
    v_req.requester_id,
    v_req.recipient_id,
    p_session_date,
    p_start_time,
    v_duration,
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
  END IF;

  RETURN v_session_id;
END;
$function$;

-- 6) Reschedule framing on decline notification (status stays declined)
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
