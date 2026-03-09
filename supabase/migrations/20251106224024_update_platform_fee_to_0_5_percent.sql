-- Migration: Update Platform Fee to 0.5%
-- Date: 2025-11-06
-- Purpose: Reduce platform fee from 1.5% to 0.5% across all functions

-- Note: Platform fee is calculated in code (Edge Functions) at 0.5% (0.005)
-- This migration updates the database function for consistency

-- Step 1: Update get_marketplace_fee_percentage() function to return 0.5% for all paid plans
CREATE OR REPLACE FUNCTION get_marketplace_fee_percentage(subscription_plan TEXT)
RETURNS DECIMAL AS $$
BEGIN
  RETURN CASE subscription_plan
    WHEN 'starter' THEN 0.00  -- Free plan
    WHEN 'practitioner' THEN 0.50  -- Updated from 1.50 to 0.50
    WHEN 'pro' THEN 0.50  -- Updated from 1.50 to 0.50
    ELSE 0.50  -- Default/fallback updated from 1.50 to 0.50
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update comment
COMMENT ON FUNCTION get_marketplace_fee_percentage IS 'Returns the marketplace fee percentage for a given subscription plan. Standardized to 0.5% for all paid plans.';

-- Step 2: Update plan_metadata in subscriptions table (if needed)
UPDATE subscriptions
SET plan_metadata = jsonb_set(
  COALESCE(plan_metadata, '{}'::jsonb),
  '{marketplace_fee_percentage}',
  CASE plan
    WHEN 'starter' THEN '0.00'::jsonb
    WHEN 'practitioner' THEN '0.50'::jsonb
    WHEN 'pro' THEN '0.50'::jsonb
    ELSE '0.50'::jsonb
  END
)
WHERE plan_metadata->>'marketplace_fee_percentage' IS NULL
   OR (plan_metadata->>'marketplace_fee_percentage')::DECIMAL != 
      CASE plan
        WHEN 'starter' THEN 0.00
        WHEN 'practitioner' THEN 0.50
        WHEN 'pro' THEN 0.50
        ELSE 0.50
      END;

