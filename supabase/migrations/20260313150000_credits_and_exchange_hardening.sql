BEGIN;

CREATE OR REPLACE FUNCTION public.link_slot_hold_to_request(
  p_hold_id uuid,
  p_request_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_auth_user_id uuid;
  v_requester_id uuid;
  v_recipient_id uuid;
  v_linked_request_id uuid;
BEGIN
  v_auth_user_id := auth.uid();

  IF v_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  SELECT requester_id, recipient_id
  INTO v_requester_id, v_recipient_id
  FROM public.treatment_exchange_requests
  WHERE id = p_request_id;

  IF v_requester_id IS NULL THEN
    RAISE EXCEPTION 'Treatment exchange request not found';
  END IF;

  IF v_requester_id <> v_auth_user_id THEN
    RAISE EXCEPTION 'Only the request creator can link a slot hold';
  END IF;

  UPDATE public.slot_holds
  SET
    request_id = p_request_id,
    updated_at = NOW()
  WHERE id = p_hold_id
    AND practitioner_id = v_recipient_id
    AND status = 'active'
  RETURNING request_id INTO v_linked_request_id;

  IF v_linked_request_id IS NULL THEN
    RAISE EXCEPTION 'Active slot hold not found for request';
  END IF;

  RETURN v_linked_request_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.link_slot_hold_to_request(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.release_expired_slot_holds()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  released_count INTEGER;
BEGIN
  UPDATE public.slot_holds
  SET
    status = 'released',
    updated_at = NOW()
  WHERE status = 'active'
    AND expires_at < NOW();

  GET DIAGNOSTICS released_count = ROW_COUNT;
  RETURN released_count;
END;
$function$;

WITH tx AS (
  SELECT
    user_id,
    COALESCE(SUM(CASE WHEN transaction_type IN ('session_earning', 'bonus', 'refund') THEN amount ELSE 0 END), 0) AS calculated_earned,
    COALESCE(SUM(CASE WHEN transaction_type = 'session_payment' THEN amount ELSE 0 END), 0) AS calculated_spent
  FROM public.credit_transactions
  GROUP BY user_id
)
UPDATE public.credits c
SET
  balance = tx.calculated_earned - tx.calculated_spent,
  current_balance = tx.calculated_earned - tx.calculated_spent,
  total_earned = tx.calculated_earned,
  total_spent = tx.calculated_spent,
  updated_at = NOW()
FROM tx
WHERE c.user_id = tx.user_id
  AND (
    COALESCE(c.balance, 0) <> (tx.calculated_earned - tx.calculated_spent)
    OR COALESCE(c.current_balance, 0) <> (tx.calculated_earned - tx.calculated_spent)
    OR COALESCE(c.total_earned, 0) <> tx.calculated_earned
    OR COALESCE(c.total_spent, 0) <> tx.calculated_spent
  );

DROP POLICY IF EXISTS "Users can insert their own credits" ON public.credits;
DROP POLICY IF EXISTS "Users can update their own credits" ON public.credits;
DROP POLICY IF EXISTS "Users can delete their own credits" ON public.credits;
DROP POLICY IF EXISTS "Users can insert their own credit transactions" ON public.credit_transactions;

SELECT public.release_expired_slot_holds();

DO $$
DECLARE
  v_job_id integer;
BEGIN
  SELECT jobid
  INTO v_job_id
  FROM cron.job
  WHERE command = 'SELECT public.release_expired_slot_holds();'
  LIMIT 1;

  IF v_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(v_job_id);
  END IF;

  PERFORM cron.schedule('*/5 * * * *', 'SELECT public.release_expired_slot_holds();');
END $$;

COMMIT;
