-- Fix credits table schema to match UI expectations
-- Add total_earned and total_spent columns
-- Add CHECK constraint for balance validation
-- Implement row-level locking for balance updates

-- Step 1: Add missing columns to credits table
ALTER TABLE public.credits
ADD COLUMN IF NOT EXISTS current_balance INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_earned INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_spent INTEGER DEFAULT 0;

-- Migrate existing balance data to current_balance
UPDATE public.credits
SET current_balance = balance
WHERE current_balance = 0 AND balance > 0;

-- Calculate totals from existing transactions (if any)
UPDATE public.credits c
SET 
  total_earned = COALESCE((
    SELECT SUM(amount) 
    FROM public.credit_transactions ct 
    WHERE ct.user_id = c.user_id 
      AND ct.transaction_type IN ('earn', 'purchase', 'refund', 'transfer')
  ), 0),
  total_spent = COALESCE((
    SELECT SUM(amount) 
    FROM public.credit_transactions ct 
    WHERE ct.user_id = c.user_id 
      AND ct.transaction_type = 'spend'
  ), 0)
WHERE EXISTS (
  SELECT 1 FROM public.credit_transactions ct WHERE ct.user_id = c.user_id
);

-- Step 2: Add CHECK constraint for balance validation
ALTER TABLE public.credits
DROP CONSTRAINT IF EXISTS balance_non_negative;

ALTER TABLE public.credits
ADD CONSTRAINT balance_non_negative CHECK (balance >= 0);

ALTER TABLE public.credits
ADD CONSTRAINT current_balance_non_negative CHECK (current_balance >= 0);

-- Step 3: Update the update_credit_balance function to use row-level locking
CREATE OR REPLACE FUNCTION update_credit_balance(
    p_user_id UUID,
    p_amount INTEGER,
    p_transaction_type VARCHAR(20),
    p_description TEXT DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL,
    p_reference_type VARCHAR(50) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_balance_before INTEGER;
    v_balance_after INTEGER;
    v_transaction_id UUID;
    v_total_earned INTEGER;
    v_total_spent INTEGER;
BEGIN
    -- Get current balance WITH row-level lock (FOR UPDATE)
    SELECT balance, total_earned, total_spent INTO v_balance_before, v_total_earned, v_total_spent
    FROM credits 
    WHERE user_id = p_user_id
    FOR UPDATE; -- ⚠️ CRITICAL: Prevents concurrent updates
    
    -- If no credit record exists, create one
    IF v_balance_before IS NULL THEN
        INSERT INTO credits (user_id, balance, current_balance, total_earned, total_spent) 
        VALUES (p_user_id, 0, 0, 0, 0)
        ON CONFLICT (user_id) DO UPDATE
        SET balance = EXCLUDED.balance
        RETURNING balance, total_earned, total_spent INTO v_balance_before, v_total_earned, v_total_spent;
    END IF;
    
    -- Calculate new balance
    IF p_transaction_type = 'spend' THEN
        v_balance_after := v_balance_before - p_amount;
        v_total_spent := COALESCE(v_total_spent, 0) + p_amount;
    ELSE
        v_balance_after := v_balance_before + p_amount;
        v_total_earned := COALESCE(v_total_earned, 0) + p_amount;
    END IF;
    
    -- Check for insufficient credits on spend
    IF p_transaction_type = 'spend' AND v_balance_after < 0 THEN
        RAISE EXCEPTION 'Insufficient credits. Current balance: %, Required: %', v_balance_before, p_amount;
    END IF;
    
    -- Update credits table WITH totals
    UPDATE credits 
    SET 
        balance = v_balance_after,
        current_balance = v_balance_after,
        total_earned = COALESCE(v_total_earned, 0),
        total_spent = COALESCE(v_total_spent, 0),
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Insert transaction record
    INSERT INTO credit_transactions (
        user_id, transaction_type, amount, balance_before, balance_after,
        description, reference_id, reference_type
    ) VALUES (
        p_user_id, p_transaction_type, p_amount, v_balance_before, v_balance_after,
        p_description, p_reference_id, p_reference_type
    ) RETURNING id INTO v_transaction_id;
    
    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Update get_credit_balance to return new structure
CREATE OR REPLACE FUNCTION get_credit_balance(p_user_id UUID)
RETURNS TABLE (
    current_balance INTEGER,
    total_earned INTEGER,
    total_spent INTEGER,
    balance INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(c.current_balance, 0),
        COALESCE(c.total_earned, 0),
        COALESCE(c.total_spent, 0),
        COALESCE(c.balance, 0)
    FROM credits c
    WHERE c.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Update allocate_monthly_credits to maintain totals
CREATE OR REPLACE FUNCTION public.allocate_monthly_credits(
    p_user_id UUID,
    p_subscription_id UUID,
    p_amount INTEGER,
    p_allocation_type VARCHAR DEFAULT 'monthly',
    p_period_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    p_period_end TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 month')
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_allocation_id UUID;
    v_current_balance INTEGER;
    v_current_earned INTEGER;
    v_new_balance INTEGER;
BEGIN
    -- Get current credit balance WITH lock
    SELECT balance, total_earned INTO v_current_balance, v_current_earned
    FROM public.credits 
    WHERE user_id = p_user_id
    FOR UPDATE;
    
    -- If no credit record exists, create one
    IF v_current_balance IS NULL THEN
        INSERT INTO public.credits (user_id, balance, current_balance, total_earned, total_spent)
        VALUES (p_user_id, 0, 0, 0, 0)
        RETURNING balance, total_earned INTO v_current_balance, v_current_earned;
    END IF;
    
    -- Calculate new balance and totals
    v_new_balance := v_current_balance + p_amount;
    v_current_earned := COALESCE(v_current_earned, 0) + p_amount;
    
    -- Update credits balance and totals
    UPDATE public.credits 
    SET 
        balance = v_new_balance,
        current_balance = v_new_balance,
        total_earned = v_current_earned,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Record the allocation
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
        p_period_start,
        p_period_end,
        NOW()
    ) RETURNING id INTO v_allocation_id;
    
    -- Create transaction record for tracking
    INSERT INTO public.credit_transactions (
        user_id,
        amount,
        transaction_type,
        description,
        session_id,
        balance_before,
        balance_after,
        created_at
    ) VALUES (
        p_user_id,
        p_amount,
        'bonus',
        CASE p_allocation_type
            WHEN 'initial' THEN 'Initial subscription credit allocation'
            WHEN 'monthly' THEN 'Monthly credit allocation'
            WHEN 'bonus' THEN 'Bonus credit allocation'
            ELSE 'Credit allocation'
        END,
        NULL,
        v_current_balance,
        v_new_balance,
        NOW()
    );
    
    -- Update subscription allocation timestamp
    UPDATE public.subscriptions
    SET 
        credits_allocated_at = NOW(),
        next_credit_allocation = p_period_end
    WHERE id = p_subscription_id;
    
    RETURN v_allocation_id;
END;
$$;

-- Step 6: Create get_practitioner_credit_cost RPC function
CREATE OR REPLACE FUNCTION get_practitioner_credit_cost(
    p_practitioner_id UUID,
    p_duration_minutes INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_role TEXT;
    v_hourly_rate DECIMAL;
    v_credit_cost INTEGER;
BEGIN
    -- Get practitioner role and hourly rate
    SELECT user_role, hourly_rate INTO v_user_role, v_hourly_rate
    FROM public.users
    WHERE id = p_practitioner_id;
    
    -- Try to get credit cost from credit_rates table
    SELECT credit_cost INTO v_credit_cost
    FROM public.credit_rates
    WHERE service_type = v_user_role
      AND duration_minutes = p_duration_minutes
      AND is_active = true
    LIMIT 1;
    
    -- If not found in credit_rates, calculate from hourly rate
    IF v_credit_cost IS NULL THEN
        -- Default: 1 credit per £1 of hourly rate
        v_credit_cost := ROUND(v_hourly_rate / 10) * ROUND(p_duration_minutes / 60);
    END IF;
    
    RETURN COALESCE(v_credit_cost, 10); -- Default to 10 credits per hour
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_practitioner_credit_cost TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION get_practitioner_credit_cost IS 'Calculates credit cost for a practitioner session based on service type and duration';
COMMENT ON COLUMN public.credits.current_balance IS 'Current available credits (alias for balance)';
COMMENT ON COLUMN public.credits.total_earned IS 'Total credits ever earned by this practitioner';
COMMENT ON COLUMN public.credits.total_spent IS 'Total credits ever spent by this practitioner';
