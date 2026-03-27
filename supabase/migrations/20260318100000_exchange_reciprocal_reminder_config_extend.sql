-- Treatment Exchange: Day 5 reminder, configurable deadline, extend-deadline flow
-- Future enhancements from TREATMENT_EXCHANGE_RECIPROCAL_DEADLINE_SPEC.md

-- 1. App config for configurable deadline (5, 7, or 14 days)
INSERT INTO public.app_config (key, value, description, updated_at)
VALUES (
  'exchange_reciprocal_deadline_days',
  '7',
  'Days recipient has to book return session after accepting exchange (5, 7, or 14)',
  NOW()
)
ON CONFLICT (key) DO NOTHING;

-- 2. Columns for reminder tracking and extension flow
ALTER TABLE public.treatment_exchange_requests
  ADD COLUMN IF NOT EXISTS reciprocal_reminder_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS extension_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS extension_approved_by uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS extension_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS extension_days integer;

-- 3. Notification type for reminder
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'exchange_reciprocal_reminder';

-- 4. Notification types for extension flow
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'exchange_extension_requested';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'exchange_extension_approved';

-- 5. RPC: Send day-5 reminder (2 days left) to recipient
CREATE OR REPLACE FUNCTION public.send_exchange_reciprocal_reminders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer := 0;
  v_req record;
  v_requester_name text;
  v_deadline_days integer;
BEGIN
  -- Get configured deadline (default 7)
  SELECT COALESCE(
    NULLIF(TRIM((SELECT value FROM app_config WHERE key = 'exchange_reciprocal_deadline_days' LIMIT 1)), '')::integer,
    7
  ) INTO v_deadline_days;

  -- Find accepted requests where: has mutual session, practitioner_b not booked,
  -- deadline in 1.5-2.5 days, reminder not yet sent
  FOR v_req IN
    SELECT ter.id, ter.requester_id, ter.recipient_id, ter.requested_session_date, ter.requested_start_time, ter.duration_minutes,
           ter.reciprocal_booking_deadline
    FROM public.treatment_exchange_requests ter
    JOIN public.mutual_exchange_sessions mes ON mes.exchange_request_id = ter.id
    WHERE ter.status = 'accepted'
      AND mes.practitioner_b_booked = false
      AND COALESCE(mes.credits_deducted, false) = false
      AND ter.reciprocal_booking_deadline IS NOT NULL
      AND ter.reciprocal_booking_deadline > NOW()
      AND ter.reciprocal_booking_deadline - NOW() < interval '2.5 days'
      AND ter.reciprocal_booking_deadline - NOW() >= interval '1.5 days'
      AND ter.reciprocal_reminder_sent_at IS NULL
  LOOP
    SELECT trim(coalesce(first_name,'') || ' ' || coalesce(last_name,''))
    INTO v_requester_name
    FROM users WHERE id = v_req.requester_id;

    PERFORM public.create_notification(
      v_req.recipient_id,
      'exchange_reciprocal_reminder',
      'Book Your Return Session Soon',
      format('You have 2 days left to book your return session for the exchange with %s. Book now to complete the exchange.',
        coalesce(nullif(trim(v_requester_name),''), 'a practitioner')
      ),
      jsonb_build_object(
        'requestId', v_req.id,
        'reciprocal_booking_deadline', v_req.reciprocal_booking_deadline
      ),
      'treatment_exchange_request',
      v_req.id::text
    );

    UPDATE public.treatment_exchange_requests
    SET reciprocal_reminder_sent_at = NOW(), updated_at = NOW()
    WHERE id = v_req.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.send_exchange_reciprocal_reminders() TO authenticated, service_role;

-- 6. RPC: Recipient requests deadline extension (+3 days)
CREATE OR REPLACE FUNCTION public.request_exchange_extension(
  p_request_id uuid,
  p_recipient_id uuid,
  p_extension_days integer DEFAULT 3
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_req record;
  v_requester_name text;
BEGIN
  IF p_extension_days IS NULL OR p_extension_days < 1 OR p_extension_days > 7 THEN
    RAISE EXCEPTION 'Extension must be 1-7 days';
  END IF;

  SELECT * INTO v_req
  FROM treatment_exchange_requests ter
  JOIN mutual_exchange_sessions mes ON mes.exchange_request_id = ter.id
  WHERE ter.id = p_request_id
    AND ter.recipient_id = p_recipient_id
    AND ter.status = 'accepted'
    AND mes.practitioner_b_booked = false
    AND ter.extension_requested_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or extension already requested';
  END IF;

  UPDATE treatment_exchange_requests
  SET
    extension_requested_at = NOW(),
    extension_days = p_extension_days,
    updated_at = NOW()
  WHERE id = p_request_id;

  SELECT trim(coalesce(first_name,'') || ' ' || coalesce(last_name,''))
  INTO v_requester_name
  FROM users WHERE id = v_req.requester_id;

  PERFORM public.create_notification(
    v_req.requester_id,
    'exchange_extension_requested',
    'Extension Requested',
    format('The recipient has requested %s more days to book their return session. Approve or let it expire.',
      p_extension_days
    ),
    jsonb_build_object(
      'requestId', p_request_id,
      'extensionDays', p_extension_days,
      'recipientId', p_recipient_id
    ),
    'treatment_exchange_request',
    p_request_id::text
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.request_exchange_extension(uuid, uuid, integer) TO authenticated, service_role;

-- 7. RPC: Requester approves extension
CREATE OR REPLACE FUNCTION public.approve_exchange_extension(
  p_request_id uuid,
  p_requester_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_req record;
  v_recipient_name text;
BEGIN
  SELECT * INTO v_req
  FROM treatment_exchange_requests
  WHERE id = p_request_id
    AND requester_id = p_requester_id
    AND status = 'accepted'
    AND extension_requested_at IS NOT NULL
    AND extension_approved_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or extension not pending';
  END IF;

  UPDATE treatment_exchange_requests
  SET
    extension_approved_by = p_requester_id,
    extension_approved_at = NOW(),
    reciprocal_booking_deadline = COALESCE(reciprocal_booking_deadline, accepted_at + interval '7 days')
      + (COALESCE(extension_days, 3) || ' days')::interval,
    updated_at = NOW()
  WHERE id = p_request_id;

  SELECT trim(coalesce(first_name,'') || ' ' || coalesce(last_name,''))
  INTO v_recipient_name
  FROM users WHERE id = v_req.recipient_id;

  PERFORM public.create_notification(
    v_req.recipient_id,
    'exchange_extension_approved',
    'Extension Approved',
    format('Your request for more time has been approved. You now have %s more days to book your return session.',
      COALESCE(v_req.extension_days, 3)
    ),
    jsonb_build_object('requestId', p_request_id),
    'treatment_exchange_request',
    p_request_id::text
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.approve_exchange_extension(uuid, uuid) TO authenticated, service_role;

-- 8. Schedule reminder cron: run daily at 10:00 UTC (after main expire at 02:00)
DO $$
DECLARE
  v_job_id integer;
BEGIN
  SELECT jobid INTO v_job_id
  FROM cron.job
  WHERE command = 'SELECT public.send_exchange_reciprocal_reminders();'
  LIMIT 1;

  IF v_job_id IS NULL THEN
    PERFORM cron.schedule(
      '0 10 * * *',
      'SELECT public.send_exchange_reciprocal_reminders();'
    );
  END IF;
END;
$$;
