-- Fix Credit System for Paid Practitioners
-- This migration fixes existing subscriptions that have monthly_credits = 0
-- and allocates missing initial credits for active subscriptions

-- ============================================================================
-- Step 1: Fix monthly_credits for active subscriptions where it's 0 or NULL
-- ============================================================================

-- Update subscriptions based on plan field
UPDATE public.subscriptions s
SET monthly_credits = CASE 
  WHEN s.plan = 'practitioner' THEN 60
  WHEN s.plan = 'pro' THEN 120
  ELSE 0
END
WHERE s.status IN ('active', 'trialing')
  AND (s.monthly_credits IS NULL OR s.monthly_credits = 0)
  AND s.plan IN ('practitioner', 'pro');

-- Fallback: Update based on price_id if plan is missing/incorrect
-- Practitioner plans (monthly)
UPDATE public.subscriptions s
SET monthly_credits = 60
WHERE s.status IN ('active', 'trialing')
  AND (s.monthly_credits IS NULL OR s.monthly_credits = 0)
  AND s.price_id IN ('price_1SGfP1Fk77knaVvan6m5IRRS', 'price_1SGOrXFk77knaVvaCbVM0FZN')
  AND s.plan != 'pro';

-- Pro plans (monthly)
UPDATE public.subscriptions s
SET monthly_credits = 120
WHERE s.status IN ('active', 'trialing')
  AND (s.monthly_credits IS NULL OR s.monthly_credits = 0)
  AND s.price_id IN ('price_1SGfPIFk77knaVvaeBxPlhJ9', 'price_1SGOrgFk77knaVvatu5ksh5y');

-- ============================================================================
-- Step 2: Create function to allocate missing initial credits
-- ============================================================================

CREATE OR REPLACE FUNCTION public.allocate_missing_initial_credits()
RETURNS TABLE (
  subscription_id UUID,
  user_id UUID,
  allocated_amount INTEGER,
  success BOOLEAN,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_subscription RECORD;
  v_allocation_id UUID;
  v_error TEXT;
BEGIN
  -- Loop through active subscriptions that never received initial credits
  FOR v_subscription IN 
    SELECT 
      s.id as subscription_id,
      s.user_id,
      s.monthly_credits,
      s.current_period_start,
      s.current_period_end,
      s.stripe_subscription_id
    FROM public.subscriptions s
    WHERE s.status IN ('active', 'trialing')
      AND s.monthly_credits > 0
      AND s.credits_allocated_at IS NULL
      AND NOT EXISTS (
        SELECT 1 
        FROM public.credit_allocations ca
        WHERE ca.subscription_id = s.id
      )
    ORDER BY s.created_at
  LOOP
    BEGIN
      -- Call the allocation RPC function (returns UUID allocation_id)
      SELECT public.allocate_monthly_credits(
        v_subscription.user_id,
        v_subscription.subscription_id,
        v_subscription.monthly_credits,
        'initial',
        v_subscription.current_period_start,
        COALESCE(v_subscription.current_period_end, v_subscription.current_period_start + INTERVAL '1 month')
      ) INTO v_allocation_id;
      
      -- Return success
      subscription_id := v_subscription.subscription_id;
      user_id := v_subscription.user_id;
      allocated_amount := v_subscription.monthly_credits;
      success := TRUE;
      error_message := NULL;
      
      RETURN NEXT;
      
    EXCEPTION WHEN OTHERS THEN
      -- Return error
      subscription_id := v_subscription.subscription_id;
      user_id := v_subscription.user_id;
      allocated_amount := v_subscription.monthly_credits;
      success := FALSE;
      error_message := SQLERRM;
      
      RETURN NEXT;
    END;
  END LOOP;
  
  RETURN;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.allocate_missing_initial_credits() TO authenticated;
GRANT EXECUTE ON FUNCTION public.allocate_missing_initial_credits() TO service_role;

-- Add comment
COMMENT ON FUNCTION public.allocate_missing_initial_credits() IS 
'Allocates missing initial credits for active subscriptions that never received their first credit allocation';

-- ============================================================================
-- Step 3: Ensure credits table exists for all practitioners with active subscriptions
-- ============================================================================

-- Create credits records if they don't exist for practitioners with active subscriptions
INSERT INTO public.credits (user_id, balance, current_balance, total_earned, total_spent)
SELECT DISTINCT s.user_id, 0, 0, 0, 0
FROM public.subscriptions s
JOIN public.users u ON s.user_id = u.id
WHERE s.status IN ('active', 'trialing')
  AND u.user_role IN ('osteopath', 'sports_therapist', 'massage_therapist')
  AND NOT EXISTS (
    SELECT 1 FROM public.credits c WHERE c.user_id = s.user_id
  )
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- Step 4: Run the allocation function to fix missing credits
-- ============================================================================

-- This will allocate credits for all subscriptions that need them
SELECT * FROM public.allocate_missing_initial_credits();

