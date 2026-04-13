-- Treatment exchange: accept RPC + mutual_exchange_sessions table (if missing)
-- Goal: allow native + web to accept an exchange request atomically.
-- Creates:
--  - public.mutual_exchange_sessions (minimal shape inferred from existing RPCs)
--  - public.accept_exchange_request(p_request_id, p_recipient_id)

-- 1) Table (idempotent)
CREATE TABLE IF NOT EXISTS public.mutual_exchange_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange_request_id uuid NOT NULL REFERENCES public.treatment_exchange_requests(id) ON DELETE CASCADE,
  practitioner_a_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  practitioner_b_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  session_date date NOT NULL,
  start_time time NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60,
  practitioner_b_booked boolean NOT NULL DEFAULT false,
  credits_deducted boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(exchange_request_id)
);

ALTER TABLE public.mutual_exchange_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mes_participants_select" ON public.mutual_exchange_sessions;
DROP POLICY IF EXISTS "mes_participants_update" ON public.mutual_exchange_sessions;
DROP POLICY IF EXISTS "mes_service_all" ON public.mutual_exchange_sessions;

CREATE POLICY "mes_participants_select"
ON public.mutual_exchange_sessions
FOR SELECT
TO authenticated
USING (auth.uid() IN (practitioner_a_id, practitioner_b_id));

CREATE POLICY "mes_participants_update"
ON public.mutual_exchange_sessions
FOR UPDATE
TO authenticated
USING (auth.uid() IN (practitioner_a_id, practitioner_b_id));

CREATE POLICY "mes_service_all"
ON public.mutual_exchange_sessions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mutual_exchange_sessions TO authenticated;

-- 2) Notification type
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'exchange_request_accepted';

-- 3) Accept RPC
CREATE OR REPLACE FUNCTION public.accept_exchange_request(
  p_request_id uuid,
  p_recipient_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_req record;
  v_deadline_days integer;
  v_mes_id uuid;
  v_recipient_name text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Require the recipient to be the authenticated user (prevents spoofing)
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

  -- Create mutual session row (idempotent by UNIQUE(exchange_request_id))
  INSERT INTO public.mutual_exchange_sessions (
    exchange_request_id,
    practitioner_a_id,
    practitioner_b_id,
    session_date,
    start_time,
    duration_minutes,
    practitioner_b_booked,
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
    COALESCE(v_req.duration_minutes, 60),
    false,
    false,
    'active',
    now(),
    now()
  )
  ON CONFLICT (exchange_request_id) DO UPDATE
    SET updated_at = now()
  RETURNING id INTO v_mes_id;

  -- Configurable reciprocal deadline (default 7)
  SELECT COALESCE(
    NULLIF(TRIM((SELECT value FROM app_config WHERE key = 'exchange_reciprocal_deadline_days' LIMIT 1)), '')::integer,
    7
  ) INTO v_deadline_days;

  UPDATE public.treatment_exchange_requests
  SET
    status = 'accepted',
    accepted_at = now(),
    reciprocal_booking_deadline = COALESCE(reciprocal_booking_deadline, now() + (v_deadline_days || ' days')::interval),
    updated_at = now()
  WHERE id = v_req.id;

  -- Dismiss recipient notifications (exchange_request_received, exchange_slot_held)
  UPDATE public.notifications
  SET dismissed_at = now(), read_at = now(), read = true
  WHERE recipient_id = p_recipient_id
    AND source_id::uuid = p_request_id
    AND source_type IN ('treatment_exchange_request', 'slot_hold')
    AND dismissed_at IS NULL;

  -- Notify requester
  SELECT trim(coalesce(first_name,'') || ' ' || coalesce(last_name,'')) INTO v_recipient_name
  FROM public.users WHERE id = p_recipient_id;

  PERFORM public.create_notification(
    v_req.requester_id,
    'exchange_request_accepted',
    'Treatment Exchange Accepted',
    format('%s has accepted your treatment exchange request for %s at %s',
      coalesce(nullif(trim(v_recipient_name),''), 'A practitioner'),
      v_req.requested_session_date,
      v_req.requested_start_time
    ),
    jsonb_build_object(
      'requestId', v_req.id,
      'recipientId', p_recipient_id,
      'mutualExchangeSessionId', v_mes_id
    ),
    'treatment_exchange_request',
    v_req.id::text
  );

  RETURN v_mes_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_exchange_request(uuid, uuid) TO authenticated, service_role;

