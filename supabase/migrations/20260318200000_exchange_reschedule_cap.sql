-- Treatment Exchange: Reschedule cap per pair (prevents infinite reschedule loop)
-- Max 2 reschedules per requester/recipient pair per 30 days

-- 1. App config for cap and window
INSERT INTO public.app_config (key, value, description, updated_at)
VALUES (
  'exchange_reschedule_cap',
  '2',
  'Max reschedules (declines) per requester/recipient pair per window',
  NOW()
)
ON CONFLICT (key) DO UPDATE SET value = '2', description = EXCLUDED.description, updated_at = NOW();

INSERT INTO public.app_config (key, value, description, updated_at)
VALUES (
  'exchange_reschedule_window_days',
  '30',
  'Window in days for reschedule cap (counts declines in this period)',
  NOW()
)
ON CONFLICT (key) DO UPDATE SET value = '30', description = EXCLUDED.description, updated_at = NOW();

-- 2. Update decline_exchange_request to enforce cap before declining
CREATE OR REPLACE FUNCTION public.decline_exchange_request(
  p_request_id uuid,
  p_recipient_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_request record;
  v_recipient_name text;
  v_hold_id uuid;
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

  -- Reschedule cap: count declines for this pair in window
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

  -- Release slot hold atomically (server-side)
  UPDATE public.slot_holds
  SET status = 'released', updated_at = NOW()
  WHERE request_id = p_request_id AND status = 'active';

  -- Update request
  UPDATE public.treatment_exchange_requests
  SET status = 'declined', declined_at = NOW(), recipient_notes = p_reason, updated_at = NOW()
  WHERE id = p_request_id;

  -- Dismiss recipient's notifications (exchange_request_received, exchange_slot_held)
  UPDATE public.notifications
  SET dismissed_at = NOW(), read_at = NOW(), read = true
  WHERE recipient_id = p_recipient_id
    AND source_id::uuid = p_request_id
    AND source_type IN ('treatment_exchange_request', 'slot_hold')
    AND dismissed_at IS NULL;

  -- Notify requester
  SELECT trim(coalesce(first_name,'') || ' ' || coalesce(last_name,'')) INTO v_recipient_name
  FROM public.users WHERE id = p_recipient_id;

  PERFORM public.create_notification(
    v_request.requester_id,
    'exchange_request_declined',
    'Treatment Exchange Request Declined',
    format('%s has declined your treatment exchange request for %s at %s',
      coalesce(nullif(trim(v_recipient_name),''), 'A practitioner'),
      v_request.requested_session_date,
      v_request.requested_start_time
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
$$;

GRANT EXECUTE ON FUNCTION public.decline_exchange_request(uuid, uuid, text) TO authenticated;
