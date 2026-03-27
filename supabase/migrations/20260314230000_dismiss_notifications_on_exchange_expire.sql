-- Dismiss exchange-related notifications when treatment_exchange_requests expire.
-- Aligns with TREATMENT_EXCHANGE_NOTIFICATION_FLOWS: lifecycle on accept/decline/expire.

CREATE OR REPLACE FUNCTION public.reconcile_pending_exchange_requests()
RETURNS TABLE(released_holds integer, expired_requests integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_released integer;
  v_expired integer;
BEGIN
  v_released := public.release_expired_slot_holds();

  UPDATE public.treatment_exchange_requests
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'pending' AND expires_at < NOW();

  GET DIAGNOSTICS v_expired = ROW_COUNT;

  -- Soft-dismiss notifications for all expired requests (idempotent)
  UPDATE public.notifications
  SET dismissed_at = NOW(),
      read_at = NOW(),
      read = true
  WHERE source_type IN ('treatment_exchange_request', 'slot_hold')
    AND source_id IN (SELECT id FROM public.treatment_exchange_requests WHERE status = 'expired')
    AND dismissed_at IS NULL;

  released_holds := v_released;
  expired_requests := v_expired;
  RETURN NEXT;
END;
$function$;

-- Schedule reconcile so expired exchange requests and their notifications are cleaned up
DO $$
DECLARE
  v_job_id integer;
BEGIN
  SELECT jobid INTO v_job_id
  FROM cron.job
  WHERE command = 'SELECT public.reconcile_pending_exchange_requests();'
  LIMIT 1;

  IF v_job_id IS NULL THEN
    PERFORM cron.schedule('*/5 * * * *', 'SELECT public.reconcile_pending_exchange_requests();');
  END IF;
END $$;
