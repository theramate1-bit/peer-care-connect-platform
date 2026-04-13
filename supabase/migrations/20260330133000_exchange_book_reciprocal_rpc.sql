-- Treatment exchange: book reciprocal session (recipient books return session)
-- Sets mutual_exchange_sessions.practitioner_b_booked = true and creates a peer client_session.
--
-- NOTE: This is a minimal MVP to match web behavior: exchange is "complete" only after reciprocal booking.

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
AS $$
DECLARE
  v_req record;
  v_mes record;
  v_deadline timestamptz;
  v_session_id uuid;
  v_now timestamptz := now();
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

  -- Create the reciprocal session: recipient receives treatment from requester.
  -- We store as a peer booking to keep it out of normal client pipelines.
  INSERT INTO public.client_sessions (
    therapist_id,
    client_id,
    session_date,
    start_time,
    duration_minutes,
    status,
    payment_status,
    is_peer_booking,
    created_at,
    updated_at
  ) VALUES (
    v_req.requester_id,
    v_req.recipient_id,
    p_session_date,
    p_start_time,
    COALESCE(p_duration_minutes, v_req.duration_minutes, 60),
    'scheduled',
    'paid',
    true,
    now(),
    now()
  )
  RETURNING id INTO v_session_id;

  UPDATE public.mutual_exchange_sessions
  SET
    practitioner_b_booked = true,
    updated_at = now()
  WHERE id = v_mes.id;

  RETURN v_session_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.book_exchange_reciprocal_session(uuid, uuid, date, time, integer) TO authenticated, service_role;

