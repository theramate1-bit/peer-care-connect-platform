-- Native/web parity: create treatment exchange requests via SECURITY DEFINER RPC
-- (RLS-safe, credit + tier checks, recipient notification).

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
AS $$
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

  RETURN v_req_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_treatment_exchange_request(
  uuid, date, time without time zone, integer, text, text
) TO authenticated;

COMMENT ON FUNCTION public.create_treatment_exchange_request(
  uuid, date, time without time zone, integer, text, text
) IS 'Creates a pending treatment_exchange_requests row as auth.uid(); validates credits, tier, recipient opt-in.';
