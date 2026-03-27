-- Unify duplicate allocation overloads and ensure balance fields stay in sync
DROP FUNCTION IF EXISTS public.allocate_monthly_credits(uuid, uuid, integer, text, timestamp with time zone, timestamp with time zone);
DROP FUNCTION IF EXISTS public.allocate_monthly_credits(uuid, uuid, integer, character varying, timestamp with time zone, timestamp with time zone);

CREATE OR REPLACE FUNCTION public.allocate_monthly_credits(
  p_user_id uuid,
  p_subscription_id uuid,
  p_amount integer,
  p_allocation_type text DEFAULT 'monthly',
  p_period_start timestamp with time zone DEFAULT now(),
  p_period_end timestamp with time zone DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allocation_id uuid;
  v_existing_allocation_id uuid;
  v_current_balance integer;
  v_current_earned integer;
  v_new_balance integer;
  v_period_start timestamptz;
  v_period_end timestamptz;
  v_balance_before integer;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Credit allocation amount must be greater than 0';
  END IF;

  v_period_start := COALESCE(p_period_start, now());
  v_period_end := CASE
    WHEN p_period_end IS NULL OR p_period_end <= v_period_start THEN v_period_start + interval '1 month'
    ELSE p_period_end
  END;

  -- Idempotency guard: if period allocation already exists, return it without changing balances.
  SELECT id
  INTO v_existing_allocation_id
  FROM public.credit_allocations
  WHERE subscription_id = p_subscription_id
    AND period_start = v_period_start
    AND period_end = v_period_end
  LIMIT 1;

  IF v_existing_allocation_id IS NOT NULL THEN
    RETURN v_existing_allocation_id;
  END IF;

  -- Lock existing credit row (or create it first) to prevent race conditions.
  SELECT COALESCE(balance, current_balance, 0), COALESCE(total_earned, 0)
  INTO v_current_balance, v_current_earned
  FROM public.credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.credits (user_id, balance, current_balance, total_earned, total_spent)
    VALUES (p_user_id, 0, 0, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;

    SELECT COALESCE(balance, current_balance, 0), COALESCE(total_earned, 0)
    INTO v_current_balance, v_current_earned
    FROM public.credits
    WHERE user_id = p_user_id
    FOR UPDATE;
  END IF;

  v_balance_before := COALESCE(v_current_balance, 0);
  v_new_balance := v_balance_before + p_amount;
  v_current_earned := COALESCE(v_current_earned, 0) + p_amount;

  UPDATE public.credits
  SET
    balance = v_new_balance,
    current_balance = v_new_balance,
    total_earned = v_current_earned,
    updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO public.credit_allocations (
    user_id,
    subscription_id,
    amount,
    allocation_type,
    period_start,
    period_end,
    allocated_at
  ) VALUES (
    p_user_id,
    p_subscription_id,
    p_amount,
    p_allocation_type,
    v_period_start,
    v_period_end,
    now()
  )
  ON CONFLICT (subscription_id, period_start, period_end) DO NOTHING
  RETURNING id INTO v_allocation_id;

  IF v_allocation_id IS NULL THEN
    -- Another worker inserted the same allocation concurrently; return existing id.
    SELECT id
    INTO v_allocation_id
    FROM public.credit_allocations
    WHERE subscription_id = p_subscription_id
      AND period_start = v_period_start
      AND period_end = v_period_end
    LIMIT 1;

    RETURN v_allocation_id;
  END IF;

  INSERT INTO public.credit_transactions (
    user_id,
    amount,
    transaction_type,
    description,
    session_id,
    balance_before,
    balance_after,
    metadata,
    created_at
  ) VALUES (
    p_user_id,
    p_amount,
    'bonus',
    CASE
      WHEN p_allocation_type = 'initial' THEN 'Initial subscription credit allocation'
      WHEN p_allocation_type = 'monthly' THEN 'Monthly subscription credit allocation'
      ELSE 'Credit allocation'
    END,
    NULL,
    v_balance_before,
    v_new_balance,
    jsonb_build_object(
      'subscription_id', p_subscription_id,
      'allocation_type', p_allocation_type,
      'period_start', v_period_start,
      'period_end', v_period_end
    ),
    now()
  );

  UPDATE public.subscriptions
  SET
    credits_allocated_at = now(),
    last_credit_allocation = now(),
    next_credit_allocation = v_period_end,
    updated_at = now()
  WHERE id = p_subscription_id;

  RETURN v_allocation_id;
END;
$$;

-- Initial backfill helper
CREATE OR REPLACE FUNCTION public.allocate_missing_initial_credits()
RETURNS TABLE(
  subscription_id uuid,
  user_id uuid,
  allocated_amount integer,
  success boolean,
  error_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subscription RECORD;
  v_allocation_id uuid;
  v_period_start timestamptz;
  v_period_end timestamptz;
BEGIN
  FOR v_subscription IN
    SELECT
      s.id AS subscription_id,
      s.user_id,
      s.monthly_credits,
      s.current_period_start,
      s.current_period_end
    FROM public.subscriptions s
    WHERE s.status IN ('active', 'trialing')
      AND COALESCE(s.monthly_credits, 0) > 0
      AND s.credits_allocated_at IS NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.credit_allocations ca
        WHERE ca.subscription_id = s.id
      )
    ORDER BY s.created_at
  LOOP
    BEGIN
      v_period_start := COALESCE(v_subscription.current_period_start, now());
      v_period_end := CASE
        WHEN v_subscription.current_period_end IS NOT NULL
             AND v_subscription.current_period_end > v_period_start
          THEN v_subscription.current_period_end
        ELSE v_period_start + interval '1 month'
      END;

      SELECT public.allocate_monthly_credits(
        v_subscription.user_id,
        v_subscription.subscription_id,
        v_subscription.monthly_credits,
        'initial',
        v_period_start,
        v_period_end
      ) INTO v_allocation_id;

      subscription_id := v_subscription.subscription_id;
      user_id := v_subscription.user_id;
      allocated_amount := v_subscription.monthly_credits;
      success := true;
      error_message := NULL;
      RETURN NEXT;
    EXCEPTION WHEN OTHERS THEN
      subscription_id := v_subscription.subscription_id;
      user_id := v_subscription.user_id;
      allocated_amount := v_subscription.monthly_credits;
      success := false;
      error_message := SQLERRM;
      RETURN NEXT;
    END;
  END LOOP;

  RETURN;
END;
$$;

-- Monthly processor used by scheduler / edge function
CREATE OR REPLACE FUNCTION public.process_pending_credit_allocations()
RETURNS TABLE(
  subscription_id uuid,
  user_id uuid,
  allocated_amount integer,
  allocation_type text,
  success boolean,
  error_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subscription RECORD;
  v_allocation_id uuid;
  v_period_start timestamptz;
  v_period_end timestamptz;
BEGIN
  FOR v_subscription IN
    SELECT
      s.id AS subscription_id,
      s.user_id,
      s.monthly_credits,
      COALESCE(
        s.next_credit_allocation,
        NULLIF(s.current_period_end, s.current_period_start),
        s.current_period_start + interval '1 month',
        s.created_at + interval '1 month',
        now()
      ) AS due_at,
      (
        s.credits_allocated_at IS NULL
        AND NOT EXISTS (SELECT 1 FROM public.credit_allocations ca WHERE ca.subscription_id = s.id)
      ) AS is_initial
    FROM public.subscriptions s
    WHERE s.status IN ('active', 'trialing')
      AND COALESCE(s.monthly_credits, 0) > 0
      AND (
        (
          s.credits_allocated_at IS NULL
          AND NOT EXISTS (SELECT 1 FROM public.credit_allocations ca WHERE ca.subscription_id = s.id)
        )
        OR COALESCE(
          s.next_credit_allocation,
          NULLIF(s.current_period_end, s.current_period_start),
          s.current_period_start + interval '1 month',
          s.created_at + interval '1 month',
          now() + interval '100 years'
        ) <= now()
      )
    ORDER BY s.created_at
  LOOP
    BEGIN
      v_period_start := COALESCE(v_subscription.due_at, now());
      v_period_end := v_period_start + interval '1 month';

      SELECT public.allocate_monthly_credits(
        v_subscription.user_id,
        v_subscription.subscription_id,
        v_subscription.monthly_credits,
        CASE WHEN v_subscription.is_initial THEN 'initial' ELSE 'monthly' END,
        v_period_start,
        v_period_end
      ) INTO v_allocation_id;

      subscription_id := v_subscription.subscription_id;
      user_id := v_subscription.user_id;
      allocated_amount := v_subscription.monthly_credits;
      allocation_type := CASE WHEN v_subscription.is_initial THEN 'initial' ELSE 'monthly' END;
      success := true;
      error_message := NULL;
      RETURN NEXT;
    EXCEPTION WHEN OTHERS THEN
      subscription_id := v_subscription.subscription_id;
      user_id := v_subscription.user_id;
      allocated_amount := v_subscription.monthly_credits;
      allocation_type := CASE WHEN v_subscription.is_initial THEN 'initial' ELSE 'monthly' END;
      success := false;
      error_message := SQLERRM;
      RETURN NEXT;
    END;
  END LOOP;

  RETURN;
END;
$$;

-- Keep legacy credit write function consistent with both balance columns.
CREATE OR REPLACE FUNCTION public.process_credit_transaction(
  p_user_id uuid,
  p_amount integer,
  p_transaction_type text,
  p_description text DEFAULT NULL::text,
  p_session_id uuid DEFAULT NULL::uuid,
  p_metadata jsonb DEFAULT NULL::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_credit_id uuid;
  v_current_balance integer;
  v_new_balance integer;
  v_transaction_id uuid;
BEGIN
  INSERT INTO public.credits (user_id, balance, current_balance, total_earned, total_spent)
  VALUES (p_user_id, 0, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT id, COALESCE(balance, current_balance, 0)
  INTO v_credit_id, v_current_balance
  FROM public.credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  v_new_balance := v_current_balance + p_amount;

  UPDATE public.credits
  SET
    balance = v_new_balance,
    current_balance = v_new_balance,
    total_earned = CASE WHEN p_amount > 0 THEN COALESCE(total_earned, 0) + p_amount ELSE COALESCE(total_earned, 0) END,
    total_spent = CASE WHEN p_amount < 0 THEN COALESCE(total_spent, 0) + ABS(p_amount) ELSE COALESCE(total_spent, 0) END,
    updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO public.credit_transactions (
    user_id,
    amount,
    transaction_type,
    description,
    balance_after,
    session_id,
    metadata,
    balance_before,
    created_at
  ) VALUES (
    p_user_id,
    p_amount,
    p_transaction_type,
    p_description,
    v_new_balance,
    p_session_id,
    p_metadata,
    v_current_balance,
    now()
  )
  RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
END;
$$;

-- Keep historical rows coherent for UI/API consumers.
UPDATE public.credits
SET balance = COALESCE(current_balance, balance, 0),
    current_balance = COALESCE(current_balance, balance, 0),
    updated_at = now()
WHERE COALESCE(balance, -2147483648) <> COALESCE(current_balance, -2147483648)
   OR balance IS NULL
   OR current_balance IS NULL;

UPDATE public.subscriptions
SET credits_allocated_at = COALESCE(credits_allocated_at, last_credit_allocation),
    next_credit_allocation = COALESCE(
      next_credit_allocation,
      CASE
        WHEN current_period_end IS NOT NULL AND current_period_start IS NOT NULL AND current_period_end > current_period_start THEN current_period_end
        ELSE COALESCE(current_period_start, created_at, now()) + interval '1 month'
      END
    ),
    updated_at = now()
WHERE status IN ('active', 'trialing')
  AND COALESCE(monthly_credits, 0) > 0;

-- Backfill allocation records for subscriptions that already received credits historically.
INSERT INTO public.credit_allocations (
  user_id,
  subscription_id,
  amount,
  allocation_type,
  period_start,
  period_end,
  allocated_at
)
SELECT
  s.user_id,
  s.id,
  s.monthly_credits,
  'initial'::text,
  COALESCE(s.current_period_start, s.created_at, now()) AS period_start,
  COALESCE(s.next_credit_allocation, COALESCE(s.current_period_start, s.created_at, now()) + interval '1 month') AS period_end,
  COALESCE(s.credits_allocated_at, s.last_credit_allocation, now()) AS allocated_at
FROM public.subscriptions s
WHERE s.status IN ('active', 'trialing')
  AND COALESCE(s.monthly_credits, 0) > 0
  AND NOT EXISTS (
    SELECT 1
    FROM public.credit_allocations ca
    WHERE ca.subscription_id = s.id
  )
ON CONFLICT (subscription_id, period_start, period_end) DO NOTHING;

-- Ensure scheduler exists (hourly) for recurring monthly allocations.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM cron.job
    WHERE command = 'SELECT public.process_pending_credit_allocations();'
  ) THEN
    PERFORM cron.schedule('0 * * * *', 'SELECT public.process_pending_credit_allocations();');
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.allocate_monthly_credits(uuid, uuid, integer, text, timestamp with time zone, timestamp with time zone) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.allocate_missing_initial_credits() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.process_pending_credit_allocations() TO service_role;
