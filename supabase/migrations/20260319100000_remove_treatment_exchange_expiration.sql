-- Remove 24-hour expiration from treatment exchange requests (consistent with mobile booking).
-- Requests stay pending until accepted or declined.

-- Update reconcile_pending_exchange_requests: do not expire by time (only release orphaned holds)
CREATE OR REPLACE FUNCTION public.reconcile_pending_exchange_requests()
RETURNS TABLE(released_holds integer, expired_requests integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_released integer;
  v_expired integer := 0;
  v_orphan_released integer := 0;
BEGIN
  v_released := public.release_expired_slot_holds();

  -- Release orphaned slot holds for declined/cancelled requests
  UPDATE public.slot_holds sh
  SET status = 'released', updated_at = NOW()
  FROM public.treatment_exchange_requests ter
  WHERE sh.request_id = ter.id
    AND sh.status = 'active'
    AND ter.status IN ('declined', 'cancelled');

  GET DIAGNOSTICS v_orphan_released = ROW_COUNT;
  v_released := v_released + v_orphan_released;

  -- No longer expire pending requests by time (expired_requests stays 0)
  released_holds := v_released;
  expired_requests := v_expired;
  RETURN NEXT;
END;
$function$;
