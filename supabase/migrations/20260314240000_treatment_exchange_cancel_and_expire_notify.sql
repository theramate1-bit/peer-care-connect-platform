-- Treatment Exchange: Requester cancel + Expired notification to requester
-- TREATMENT_EXCHANGE_UX_GAPS: Gap 1 (cancel), Gap 3 (expired notification)

-- 1. Add exchange_request_cancelled to notification_type
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'exchange_request_cancelled';

-- 2. RPC: Requester cancels pending exchange request
CREATE OR REPLACE FUNCTION public.cancel_exchange_request_by_requester(
  p_request_id uuid,
  p_requester_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_request record;
  v_recipient_name text;
  v_requester_name text;
  v_hold_id uuid;
BEGIN
  SELECT * INTO v_request
  FROM public.treatment_exchange_requests
  WHERE id = p_request_id
    AND requester_id = p_requester_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or not cancellable';
  END IF;

  -- Release slot hold if linked
  SELECT id INTO v_hold_id
  FROM public.slot_holds
  WHERE request_id = p_request_id AND status = 'active'
  LIMIT 1;

  IF v_hold_id IS NOT NULL THEN
    UPDATE public.slot_holds
    SET status = 'released', updated_at = NOW()
    WHERE id = v_hold_id;
  END IF;

  -- Update request
  UPDATE public.treatment_exchange_requests
  SET status = 'cancelled', updated_at = NOW()
  WHERE id = p_request_id;

  -- Dismiss recipient's notifications (exchange_request_received, exchange_slot_held)
  UPDATE public.notifications
  SET dismissed_at = NOW(), read_at = NOW(), read = true
  WHERE recipient_id = v_request.recipient_id
    AND source_id::uuid = p_request_id
    AND source_type IN ('treatment_exchange_request', 'slot_hold')
    AND dismissed_at IS NULL;

  -- Notify recipient
  SELECT trim(coalesce(first_name,'') || ' ' || coalesce(last_name,'')) INTO v_requester_name
  FROM public.users WHERE id = p_requester_id;

  PERFORM public.create_notification(
    v_request.recipient_id,
    'exchange_request_cancelled',
    'Treatment Exchange Request Cancelled',
    format('%s has cancelled their treatment exchange request for %s at %s',
      coalesce(nullif(trim(v_requester_name),''), 'A practitioner'),
      v_request.requested_session_date,
      v_request.requested_start_time
    ),
    jsonb_build_object(
      'requestId', p_request_id,
      'requesterId', p_requester_id,
      'sessionDate', v_request.requested_session_date,
      'startTime', v_request.requested_start_time,
      'duration', v_request.duration_minutes
    ),
    'treatment_exchange_request',
    p_request_id::text
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_exchange_request_by_requester(uuid, uuid) TO authenticated;

-- 3. Update reconcile: create exchange_request_expired notification for requester
CREATE OR REPLACE FUNCTION public.reconcile_pending_exchange_requests()
RETURNS TABLE(released_holds integer, expired_requests integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_released integer;
  v_expired integer;
  v_req record;
BEGIN
  v_released := public.release_expired_slot_holds();

  -- Get requests we're about to expire (for notification)
  FOR v_req IN
    SELECT id, requester_id, recipient_id, requested_session_date, requested_start_time, duration_minutes
    FROM public.treatment_exchange_requests
    WHERE status = 'pending' AND expires_at < NOW()
  LOOP
    -- Notify requester their request expired
    PERFORM public.create_notification(
      v_req.requester_id,
      'exchange_request_expired',
      'Treatment Exchange Request Expired',
      format('Your treatment exchange request for %s at %s has expired.',
        v_req.requested_session_date,
        v_req.requested_start_time
      ),
      jsonb_build_object(
        'requestId', v_req.id,
        'sessionDate', v_req.requested_session_date,
        'startTime', v_req.requested_start_time,
        'duration', v_req.duration_minutes
      ),
      'treatment_exchange_request',
      v_req.id::text
    );
  END LOOP;

  -- Update to expired
  UPDATE public.treatment_exchange_requests
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'pending' AND expires_at < NOW();

  GET DIAGNOSTICS v_expired = ROW_COUNT;

  -- Dismiss recipient notifications for expired requests
  UPDATE public.notifications
  SET dismissed_at = NOW(), read_at = NOW(), read = true
  WHERE source_type IN ('treatment_exchange_request', 'slot_hold')
    AND source_id IN (SELECT id FROM public.treatment_exchange_requests WHERE status = 'expired')
    AND dismissed_at IS NULL;

  released_holds := v_released;
  expired_requests := v_expired;
  RETURN NEXT;
END;
$function$;
