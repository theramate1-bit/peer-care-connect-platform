-- Gap 1: Refund as credit restore (no transfer). Credits are burned on booking; refund restores to recipient only.
CREATE OR REPLACE FUNCTION public.credits_refund(
  p_user_id uuid,
  p_amount integer,
  p_reference_id uuid DEFAULT NULL,
  p_description text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_balance_before integer;
  v_balance_after integer;
  v_transaction_id uuid;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Refund amount must be positive';
  END IF;

  INSERT INTO public.credits (user_id, balance, current_balance, total_earned, total_spent)
  VALUES (p_user_id, 0, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT balance INTO v_balance_before
  FROM public.credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  v_balance_before := COALESCE(v_balance_before, 0);
  v_balance_after := v_balance_before + p_amount;

  UPDATE public.credits
  SET
    balance = v_balance_after,
    current_balance = v_balance_after,
    total_earned = COALESCE(total_earned, 0) + p_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  INSERT INTO public.credit_transactions (
    user_id,
    transaction_type,
    amount,
    balance_before,
    balance_after,
    description,
    session_id,
    created_at
  ) VALUES (
    p_user_id,
    'refund',
    p_amount,
    v_balance_before,
    v_balance_after,
    COALESCE(p_description, 'Cancellation refund'),
    p_reference_id,
    NOW()
  )
  RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.credits_refund(uuid, integer, uuid, text) TO authenticated, service_role;

-- Gap 2: Reconcile pending exchange requests and orphaned holds (admin-safe).
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

  released_holds := v_released;
  expired_requests := v_expired;
  RETURN NEXT;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.reconcile_pending_exchange_requests() TO authenticated, service_role;

-- Gap 3: Single canonical update_credit_balance (replaces both overloads).
-- Drop existing overloads by creating a single function with a unified signature.
DROP FUNCTION IF EXISTS public.update_credit_balance(uuid, integer, character varying, text, uuid, character varying);
DROP FUNCTION IF EXISTS public.update_credit_balance(uuid, integer, character varying, text, uuid, jsonb);

CREATE OR REPLACE FUNCTION public.update_credit_balance(
  p_user_id uuid,
  p_amount integer,
  p_transaction_type character varying,
  p_description text DEFAULT NULL,
  p_reference_id uuid DEFAULT NULL,
  p_reference_type character varying DEFAULT NULL,
  p_session_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_balance_before integer;
  v_balance_after integer;
  v_total_earned integer;
  v_total_spent integer;
  v_transaction_id uuid;
  v_ref uuid;
  v_tx_type text;
BEGIN
  v_ref := COALESCE(p_session_id, p_reference_id);

  SELECT balance, total_earned, total_spent
  INTO v_balance_before, v_total_earned, v_total_spent
  FROM public.credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_balance_before IS NULL THEN
    INSERT INTO public.credits (user_id, balance, current_balance, total_earned, total_spent)
    VALUES (p_user_id, 0, 0, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;
    v_balance_before := 0;
    v_total_earned := 0;
    v_total_spent := 0;
    SELECT balance, total_earned, total_spent
    INTO v_balance_before, v_total_earned, v_total_spent
    FROM public.credits
    WHERE user_id = p_user_id
    FOR UPDATE;
    v_balance_before := COALESCE(v_balance_before, 0);
    v_total_earned := COALESCE(v_total_earned, 0);
    v_total_spent := COALESCE(v_total_spent, 0);
  END IF;

  IF p_transaction_type IN ('spend', 'session_payment', 'credit_purchase') THEN
    v_balance_after := v_balance_before - p_amount;
    v_total_spent := v_total_spent + p_amount;
    IF v_balance_after < 0 THEN
      RAISE EXCEPTION 'Insufficient credits. Current balance: %, Required: %', v_balance_before, p_amount;
    END IF;
  ELSE
    v_balance_after := v_balance_before + p_amount;
    v_total_earned := v_total_earned + p_amount;
  END IF;

  v_tx_type := CASE p_transaction_type
    WHEN 'spend' THEN 'session_payment'
    WHEN 'earn' THEN 'session_earning'
    ELSE p_transaction_type::text
  END;

  UPDATE public.credits
  SET
    balance = v_balance_after,
    current_balance = v_balance_after,
    total_earned = v_total_earned,
    total_spent = v_total_spent,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  INSERT INTO public.credit_transactions (
    user_id,
    transaction_type,
    amount,
    balance_before,
    balance_after,
    description,
    session_id,
    metadata,
    created_at
  ) VALUES (
    p_user_id,
    v_tx_type,
    p_amount,
    v_balance_before,
    v_balance_after,
    p_description,
    v_ref,
    p_metadata,
    NOW()
  )
  RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.update_credit_balance(uuid, integer, character varying, text, uuid, character varying, uuid, jsonb) TO authenticated, service_role;

-- Backward compatibility: allow call with 6 args (reference only) or 8 args.
CREATE OR REPLACE FUNCTION public.update_credit_balance(
  p_user_id uuid,
  p_amount integer,
  p_transaction_type character varying,
  p_description text DEFAULT NULL,
  p_reference_id uuid DEFAULT NULL,
  p_reference_type character varying DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN public.update_credit_balance(
    p_user_id,
    p_amount,
    p_transaction_type,
    p_description,
    p_reference_id,
    p_reference_type,
    NULL::uuid,
    NULL::jsonb
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.update_credit_balance(uuid, integer, character varying, text, uuid, character varying) TO authenticated, service_role;
