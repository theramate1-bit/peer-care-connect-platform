-- Monthly Credit Allocation System
-- Implements fair peer-treatment credit system where all practitioners get fixed monthly credits based on subscription tier

-- ============================================================================
-- 1. Add monthly credit allocation fields to subscriptions table
-- ============================================================================

ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS monthly_credits INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS credits_allocated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS next_credit_allocation TIMESTAMP WITH TIME ZONE;

-- Set monthly credits based on plan tier
UPDATE public.subscriptions 
SET monthly_credits = CASE 
  WHEN plan = 'practitioner' THEN 30  -- £30/month = 30 credits (30 min peer treatment)
  WHEN plan = 'pro' THEN 60            -- £50/month = 60 credits (1 hour peer treatment)
  ELSE 0
END
WHERE status IN ('active', 'trialing');

-- Set initial allocation timestamps for active subscriptions
UPDATE public.subscriptions 
SET 
  credits_allocated_at = current_period_start,
  next_credit_allocation = current_period_end
WHERE status IN ('active', 'trialing')
AND credits_allocated_at IS NULL;

-- ============================================================================
-- 2. Create credit_allocations table for tracking history
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.credit_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
    amount INTEGER NOT NULL CHECK (amount > 0),
    allocation_type VARCHAR(20) NOT NULL DEFAULT 'monthly' CHECK (allocation_type IN ('initial', 'monthly', 'bonus', 'adjustment')),
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    allocated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_credit_allocations_user_id ON public.credit_allocations(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_allocations_subscription_id ON public.credit_allocations(subscription_id);
CREATE INDEX IF NOT EXISTS idx_credit_allocations_allocated_at ON public.credit_allocations(allocated_at);
CREATE INDEX IF NOT EXISTS idx_credit_allocations_period ON public.credit_allocations(period_start, period_end);

-- Enable RLS
ALTER TABLE public.credit_allocations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own credit allocations" 
ON public.credit_allocations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert credit allocations" 
ON public.credit_allocations 
FOR INSERT 
WITH CHECK (true);

-- ============================================================================
-- 3. Function to allocate monthly credits
-- ============================================================================

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
    v_new_balance INTEGER;
BEGIN
    -- Get current credit balance
    SELECT balance INTO v_current_balance 
    FROM public.credits 
    WHERE user_id = p_user_id;
    
    -- If no credit record exists, create one
    IF v_current_balance IS NULL THEN
        INSERT INTO public.credits (user_id, balance)
        VALUES (p_user_id, 0)
        RETURNING balance INTO v_current_balance;
    END IF;
    
    -- Calculate new balance
    v_new_balance := v_current_balance + p_amount;
    
    -- Update credits balance
    UPDATE public.credits 
    SET 
        balance = v_new_balance,
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

-- ============================================================================
-- 4. Function to check and process pending credit allocations
-- ============================================================================

CREATE OR REPLACE FUNCTION public.process_pending_credit_allocations()
RETURNS TABLE (
    user_id UUID,
    amount INTEGER,
    allocation_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH pending_allocations AS (
        SELECT 
            s.user_id,
            s.id as subscription_id,
            s.monthly_credits,
            s.next_credit_allocation,
            s.current_period_end
        FROM public.subscriptions s
        WHERE s.status IN ('active', 'trialing')
        AND s.monthly_credits > 0
        AND s.next_credit_allocation IS NOT NULL
        AND s.next_credit_allocation <= NOW()
    ),
    allocations_made AS (
        SELECT 
            pa.user_id,
            pa.monthly_credits as amount,
            public.allocate_monthly_credits(
                pa.user_id,
                pa.subscription_id,
                pa.monthly_credits,
                'monthly',
                pa.next_credit_allocation,
                pa.current_period_end
            ) as allocation_id
        FROM pending_allocations pa
    )
    SELECT * FROM allocations_made;
END;
$$;

-- ============================================================================
-- 5. Add helpful comments
-- ============================================================================

COMMENT ON TABLE public.credit_allocations IS 'Tracks monthly credit allocations to practitioners based on their subscription plan';
COMMENT ON COLUMN public.subscriptions.monthly_credits IS 'Number of credits allocated monthly: 30 for practitioner (£30), 60 for pro (£50)';
COMMENT ON COLUMN public.subscriptions.credits_allocated_at IS 'Last time credits were allocated to this subscription';
COMMENT ON COLUMN public.subscriptions.next_credit_allocation IS 'When the next credit allocation should occur (typically at subscription renewal)';
COMMENT ON FUNCTION public.allocate_monthly_credits IS 'Allocates credits to a user based on their subscription plan and records the transaction';
COMMENT ON FUNCTION public.process_pending_credit_allocations IS 'Processes all pending credit allocations for subscriptions that have reached their renewal date';

-- ============================================================================
-- 6. Grant necessary permissions
-- ============================================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.credit_allocations TO authenticated;
GRANT SELECT, UPDATE ON public.credits TO authenticated;
GRANT SELECT ON public.subscriptions TO authenticated;

-- ============================================================================
-- 7. Allocate initial credits to existing active subscriptions
-- ============================================================================

-- Allocate initial credits for all active subscriptions that haven't received credits yet
DO $$
DECLARE
    sub_record RECORD;
    allocation_id UUID;
BEGIN
    FOR sub_record IN 
        SELECT 
            s.id as subscription_id,
            s.user_id,
            s.monthly_credits,
            s.current_period_start,
            s.current_period_end
        FROM public.subscriptions s
        WHERE s.status IN ('active', 'trialing')
        AND s.monthly_credits > 0
        AND s.credits_allocated_at IS NULL
    LOOP
        -- Allocate initial credits
        SELECT public.allocate_monthly_credits(
            sub_record.user_id,
            sub_record.subscription_id,
            sub_record.monthly_credits,
            'initial',
            sub_record.current_period_start,
            sub_record.current_period_end
        ) INTO allocation_id;
        
        RAISE NOTICE 'Allocated % credits to user % (allocation: %)', 
            sub_record.monthly_credits, sub_record.user_id, allocation_id;
    END LOOP;
END $$;

