-- Treatment Exchange: decline_exchange_request RPC + reconcile orphaned slot holds
-- ACCEPT_DECLINE_CANCEL_CREDITS_FLOW_GAPS: Fix 1 (orphaned holds), Fix 2 (decline RPC)

-- 1. Add exchange_request_declined to notification_type if not present
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'exchange_request_declined';

-- 2. RPC: Recipient declines pending exchange request (server-side, atomic)
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
BEGIN
  SELECT * INTO v_request
  FROM public.treatment_exchange_requests
  WHERE id = p_request_id
    AND recipient_id = p_recipient_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or already processed';
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

-- 3. Extend reconcile: release slot holds for declined/cancelled requests (orphan cleanup)
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
  v_orphan_released integer := 0;
BEGIN
  -- Release expired slot holds (existing logic)
  v_released := public.release_expired_slot_holds();

  -- NEW: Release orphaned slot holds for declined/cancelled requests (frontend may have failed)
  UPDATE public.slot_holds sh
  SET status = 'released', updated_at = NOW()
  FROM public.treatment_exchange_requests ter
  WHERE sh.request_id = ter.id
    AND sh.status = 'active'
    AND ter.status IN ('declined', 'cancelled');

  GET DIAGNOSTICS v_orphan_released = ROW_COUNT;
  v_released := v_released + v_orphan_released;

  -- Get requests we're about to expire (for notification)
  FOR v_req IN
    SELECT id, requester_id, recipient_id, requested_session_date, requested_start_time, duration_minutes
    FROM public.treatment_exchange_requests
    WHERE status = 'pending' AND expires_at < NOW()
  LOOP
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

  UPDATE public.treatment_exchange_requests
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'pending' AND expires_at < NOW();

  GET DIAGNOSTICS v_expired = ROW_COUNT;

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
