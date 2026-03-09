-- Add unique constraint to prevent duplicate credit allocations
-- This is a HIGH PRIORITY data integrity fix to prevent race conditions

-- Drop existing constraint if it exists (in case of re-run)
ALTER TABLE public.credit_allocations
DROP CONSTRAINT IF EXISTS unique_subscription_period;

-- Add unique constraint on subscription_id + period_start + period_end
-- This prevents duplicate allocations for the same subscription period
ALTER TABLE public.credit_allocations
ADD CONSTRAINT unique_subscription_period 
UNIQUE (subscription_id, period_start, period_end);

-- Update allocate_monthly_credits to handle conflicts gracefully
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
        ON CONFLICT (user_id) DO UPDATE
        SET balance = EXCLUDED.balance
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
    
    -- Record the allocation with conflict handling
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
    )
    ON CONFLICT (subscription_id, period_start, period_end) 
    DO NOTHING
    RETURNING id INTO v_allocation_id;
    
    -- If allocation already exists (conflict), get existing allocation_id
    IF v_allocation_id IS NULL THEN
        SELECT id INTO v_allocation_id
        FROM public.credit_allocations
        WHERE subscription_id = p_subscription_id
          AND period_start = p_period_start
          AND period_end = p_period_end;
        
        -- Log that we found an existing allocation
        RAISE NOTICE 'Credit allocation already exists for subscription % period % to %', 
                     p_subscription_id, p_period_start, p_period_end;
        
        -- Return existing allocation ID (idempotent behavior)
        RETURN v_allocation_id;
    END IF;
    
    -- Create transaction record for tracking (only if new allocation was created)
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.allocate_monthly_credits TO authenticated;
GRANT EXECUTE ON FUNCTION public.allocate_monthly_credits TO service_role;

-- Add helpful comment
COMMENT ON CONSTRAINT unique_subscription_period ON public.credit_allocations IS 
'Prevents duplicate credit allocations for the same subscription period. Ensures idempotency.';

