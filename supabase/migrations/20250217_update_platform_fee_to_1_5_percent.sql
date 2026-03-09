-- Migration: Update Platform Fee to 1.5%
-- Date: 2025-02-17
-- Purpose: Standardize platform fee to 1.5% across all functions

-- Note: Platform fee is calculated in code (Edge Functions) at 1.5% (0.015)
-- This migration updates the database function for consistency

-- Step 3: Update get_marketplace_fee_percentage() function to return 1.5% for all paid plans
CREATE OR REPLACE FUNCTION get_marketplace_fee_percentage(subscription_plan TEXT)
RETURNS DECIMAL AS $$
BEGIN
  RETURN CASE subscription_plan
    WHEN 'starter' THEN 0.00  -- Free plan
    WHEN 'practitioner' THEN 1.50  -- Updated from 3.00 to 1.50
    WHEN 'pro' THEN 1.50  -- Updated from 1.00 to 1.50 (standardize to 1.5%)
    ELSE 1.50  -- Default/fallback updated from 5.00 to 1.50
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update comment
COMMENT ON FUNCTION get_marketplace_fee_percentage IS 'Returns the marketplace fee percentage for a given subscription plan. Standardized to 1.5% for all paid plans.';

-- Step 4: Update plan_metadata in subscriptions table (if needed)
UPDATE subscriptions
SET plan_metadata = jsonb_set(
  COALESCE(plan_metadata, '{}'::jsonb),
  '{marketplace_fee_percentage}',
  CASE plan
    WHEN 'starter' THEN '0.00'::jsonb
    WHEN 'practitioner' THEN '1.50'::jsonb
    WHEN 'pro' THEN '1.50'::jsonb
    ELSE '1.50'::jsonb
  END
)
WHERE plan_metadata->>'marketplace_fee_percentage' IS NULL
   OR (plan_metadata->>'marketplace_fee_percentage')::DECIMAL != 
      CASE plan
        WHEN 'starter' THEN 0.00
        WHEN 'practitioner' THEN 1.50
        WHEN 'pro' THEN 1.50
        ELSE 1.50
      END;

-- Step 5: Update any CHECK constraints that might restrict values
-- Remove old constraints if they exist and add new ones
DO $$
BEGIN
  -- Update practitioner_services constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'practitioner_services' 
    AND constraint_name LIKE '%platform_fee_percentage%'
  ) THEN
    ALTER TABLE practitioner_services 
    DROP CONSTRAINT IF EXISTS practitioner_services_platform_fee_percentage_check;
    
    ALTER TABLE practitioner_services 
    ADD CONSTRAINT practitioner_services_platform_fee_percentage_check 
    CHECK (platform_fee_percentage >= 0 AND platform_fee_percentage <= 100);
  END IF;
  
  -- Update service_categories constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'service_categories' 
    AND constraint_name LIKE '%platform_fee_percentage%'
  ) THEN
    ALTER TABLE service_categories 
    DROP CONSTRAINT IF EXISTS service_categories_platform_fee_percentage_check;
    
    ALTER TABLE service_categories 
    ADD CONSTRAINT service_categories_platform_fee_percentage_check 
    CHECK (platform_fee_percentage >= 0 AND platform_fee_percentage <= 100);
  END IF;
END $$;

