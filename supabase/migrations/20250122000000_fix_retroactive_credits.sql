-- Fix Retroactive Credit Allocation for Existing Subscriptions
-- This migration fixes monthly_credits field and sets it based on plan for existing subscriptions

-- ============================================================================
-- 1. Update monthly_credits for existing subscriptions based on plan
-- ============================================================================

UPDATE public.subscriptions 
SET monthly_credits = CASE 
  WHEN plan = 'practitioner' THEN 60  -- Practitioner plan = 60 credits/month
  WHEN plan = 'pro' THEN 120          -- Pro plan = 120 credits/month
  WHEN monthly_credits IS NULL OR monthly_credits = 0 THEN 
    CASE 
      WHEN plan = 'practitioner' THEN 60
      WHEN plan = 'pro' THEN 120
      ELSE 60  -- Default fallback
    END
  ELSE monthly_credits  -- Keep existing value if set and plan doesn't match
END
WHERE status IN ('active', 'trialing')
AND (monthly_credits IS NULL OR monthly_credits = 0 OR 
     (plan = 'pro' AND monthly_credits < 120) OR
     (plan = 'practitioner' AND monthly_credits > 60));

-- ============================================================================
-- 2. Create function to retroactively allocate credits for existing subscriptions
-- ============================================================================

CREATE OR REPLACE FUNCTION retroactive_credit_allocation()
RETURNS TABLE(
  subscription_id UUID,
  user_id UUID,
  credits_allocated INTEGER,
  allocation_date TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sub_record RECORD;
  credit_amount INTEGER;
  allocation_date_value TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Loop through all active subscriptions
  FOR sub_record IN 
    SELECT 
      s.id,
      s.user_id,
      s.plan,
      s.monthly_credits,
      s.current_period_start,
      s.current_period_end,
      s.stripe_subscription_id
    FROM public.subscriptions s
    WHERE s.status IN ('active', 'trialing')
    AND s.monthly_credits > 0
  LOOP
    -- Skip if no monthly_credits set
    IF sub_record.monthly_credits IS NULL OR sub_record.monthly_credits = 0 THEN
      CONTINUE;
    END IF;
    
    credit_amount := sub_record.monthly_credits;
    
    -- Check if credits have already been allocated for current period
    IF NOT EXISTS (
      SELECT 1 
      FROM public.credit_allocations ca
      WHERE ca.subscription_id = sub_record.id
      AND ca.allocated_at >= COALESCE(sub_record.current_period_start, NOW() - INTERVAL '30 days')
      AND ca.allocated_at <= COALESCE(sub_record.current_period_end, NOW() + INTERVAL '30 days')
    ) THEN
      -- Allocate credits using the existing RPC function
      BEGIN
        PERFORM allocate_monthly_credits(
          sub_record.user_id,
          sub_record.id,
          credit_amount,
          'initial',
          COALESCE(sub_record.current_period_start, NOW()),
          COALESCE(sub_record.current_period_end, NOW() + INTERVAL '30 days')
        );
        
        -- Get the allocation date from the most recent credit_allocation
        SELECT ca.allocated_at INTO allocation_date_value
        FROM public.credit_allocations ca
        WHERE ca.subscription_id = sub_record.id
        ORDER BY ca.allocated_at DESC
        LIMIT 1;
        
        -- Return result
        RETURN QUERY SELECT 
          sub_record.id,
          sub_record.user_id,
          credit_amount,
          COALESCE(allocation_date_value, NOW());
          
      EXCEPTION WHEN OTHERS THEN
        -- Log error but continue with next subscription
        RAISE WARNING 'Failed to allocate credits for subscription %: %', sub_record.id, SQLERRM;
      END;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$;

-- ============================================================================
-- 3. Add comment
-- ============================================================================

COMMENT ON FUNCTION retroactive_credit_allocation() IS 
'Retroactively allocates credits for existing active subscriptions that have not received credits for their current billing period. Returns table of subscriptions that received allocations.';

