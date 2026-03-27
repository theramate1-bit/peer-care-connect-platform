-- Treatment Exchange: Reciprocal booking deadline + fraud prevention
-- Gaps: Accept-then-never-book (recipient accepts but never books return), broken accepts
-- Verified against Supabase MCP: e301065e is broken (accepted, no mutual_exchange_sessions)

-- 1. Add reciprocal_booking_deadline column (set on accept; default accepted_at + 7 days)
ALTER TABLE public.treatment_exchange_requests
  ADD COLUMN IF NOT EXISTS reciprocal_booking_deadline timestamptz;

-- 2. Backfill for existing accepted requests (use accepted_at + 7 days)
UPDATE public.treatment_exchange_requests
SET reciprocal_booking_deadline = accepted_at + interval '7 days'
WHERE status = 'accepted'
  AND accepted_at IS NOT NULL
  AND reciprocal_booking_deadline IS NULL;

-- 3. New notification type for reciprocal expiry
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'exchange_reciprocal_expired';

-- 4. RPC: Expire accepted exchanges where recipient never booked within deadline
CREATE OR REPLACE FUNCTION public.expire_accepted_exchange_without_reciprocal()
RETURNS TABLE(expired_broken integer, expired_no_reciprocal integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_broken integer := 0;
  v_no_reciprocal integer := 0;
  v_req record;
BEGIN
  -- Case A: Accepted with NO mutual session (broken accept from failed RPC)
  FOR v_req IN
    SELECT ter.id, ter.requester_id, ter.recipient_id, ter.requested_session_date, ter.requested_start_time, ter.duration_minutes
    FROM public.treatment_exchange_requests ter
    LEFT JOIN public.mutual_exchange_sessions mes ON mes.exchange_request_id = ter.id
    WHERE ter.status = 'accepted'
      AND mes.id IS NULL
  LOOP
    UPDATE public.treatment_exchange_requests
    SET status = 'expired', updated_at = NOW()
    WHERE id = v_req.id;

    PERFORM public.create_notification(
      v_req.requester_id,
      'exchange_reciprocal_expired',
      'Exchange Request Expired',
      format('The treatment exchange request for %s at %s could not be completed. You can send a new request.',
        v_req.requested_session_date,
        v_req.requested_start_time
      ),
      jsonb_build_object('requestId', v_req.id),
      'treatment_exchange_request',
      v_req.id::text
    );

    v_broken := v_broken + 1;
  END LOOP;

  -- Case B: Accepted WITH mutual session but practitioner_b never booked; deadline passed
  FOR v_req IN
    SELECT ter.id, ter.requester_id, ter.recipient_id, ter.requested_session_date, ter.requested_start_time, ter.duration_minutes,
           mes.id AS mes_id, mes.practitioner_a_id, mes.practitioner_b_id, mes.session_date AS mes_session_date, mes.start_time AS mes_start_time
    FROM public.treatment_exchange_requests ter
    JOIN public.mutual_exchange_sessions mes ON mes.exchange_request_id = ter.id
    WHERE ter.status = 'accepted'
      AND mes.practitioner_b_booked = false
      AND COALESCE(mes.credits_deducted, false) = false
      AND (COALESCE(ter.reciprocal_booking_deadline, ter.accepted_at + interval '7 days') < NOW())
  LOOP
    -- Cancel mutual session
    UPDATE public.mutual_exchange_sessions
    SET status = 'cancelled', cancelled_at = NOW(), cancellation_reason = 'Reciprocal booking deadline passed'
    WHERE id = v_req.mes_id;

    -- Cancel related client_sessions (requester's initial session: recipient provides, requester receives)
    UPDATE public.client_sessions
    SET status = 'cancelled', cancelled_at = NOW()
    WHERE therapist_id = v_req.practitioner_b_id
      AND client_id = v_req.practitioner_a_id
      AND session_date = v_req.mes_session_date
      AND start_time = v_req.mes_start_time
      AND is_peer_booking = true;

    UPDATE public.treatment_exchange_requests
    SET status = 'expired', updated_at = NOW()
    WHERE id = v_req.id;

    PERFORM public.create_notification(
      v_req.requester_id,
      'exchange_reciprocal_expired',
      'Reciprocal Booking Deadline Passed',
      format('The recipient did not book their return session within 7 days. Your request for %s at %s has expired. You can send a new request.',
        v_req.requested_session_date,
        v_req.requested_start_time
      ),
      jsonb_build_object('requestId', v_req.id),
      'treatment_exchange_request',
      v_req.id::text
    );

    PERFORM public.create_notification(
      v_req.recipient_id,
      'exchange_reciprocal_expired',
      'Reciprocal Booking Expired',
      format('You did not book your return session within 7 days. The exchange request for %s at %s has expired.',
        v_req.requested_session_date,
        v_req.requested_start_time
      ),
      jsonb_build_object('requestId', v_req.id),
      'treatment_exchange_request',
      v_req.id::text
    );

    v_no_reciprocal := v_no_reciprocal + 1;
  END LOOP;

  expired_broken := v_broken;
  expired_no_reciprocal := v_no_reciprocal;
  RETURN NEXT;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.expire_accepted_exchange_without_reciprocal() TO authenticated, service_role;

-- 5. Update decline_exchange_request to set recipient_notes for Reschedule (no schema change; already supports notes)

-- 6. Schedule cron: run daily at 02:00 UTC
DO $$
DECLARE
  v_job_id integer;
BEGIN
  SELECT jobid INTO v_job_id
  FROM cron.job
  WHERE command = 'SELECT public.expire_accepted_exchange_without_reciprocal();'
  LIMIT 1;

  IF v_job_id IS NULL THEN
    PERFORM cron.schedule(
      '0 2 * * *',
      'SELECT public.expire_accepted_exchange_without_reciprocal();'
    );
  END IF;
END;
$$;
