-- Migration: Cleanup Unused Subscription Tables
-- Date: 2025-01-10
-- Purpose: Mark deprecated tables and add metadata to active subscriptions table

-- Mark unused tables as deprecated (DO NOT DROP - they may have references)
COMMENT ON TABLE IF EXISTS practitioner_subscriptions IS 'DEPRECATED 2025-01-10: Use subscriptions table instead. This table was created but never used in production code.';
COMMENT ON TABLE IF EXISTS practitioner_subscription_plans IS 'DEPRECATED 2025-01-10: Plan data now stored in application code and subscriptions.plan_metadata.';
COMMENT ON TABLE IF EXISTS subscribers IS 'DEPRECATED 2025-01-10: Replaced by subscriptions table.';

-- Add plan_metadata column to subscriptions table if it doesn't exist
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS plan_metadata JSONB DEFAULT '{}';

-- Update existing records with marketplace fee percentage based on plan
UPDATE subscriptions
SET plan_metadata = jsonb_build_object(
  'marketplace_fee_percentage', 
  CASE plan
    WHEN 'practitioner' THEN 3.0
    WHEN 'pro' THEN 1.0
    WHEN 'starter' THEN 0.0
    ELSE 5.0
  END,
  'features', 
  CASE plan
    WHEN 'practitioner' THEN '["Professional profile", "Advanced booking", "Client management", "Analytics"]'::jsonb
    WHEN 'pro' THEN '["Everything in Practitioner", "AI-powered notes", "Voice transcription", "Priority support"]'::jsonb
    WHEN 'starter' THEN '[]'::jsonb
    ELSE '[]'::jsonb
  END
)
WHERE plan_metadata = '{}' OR plan_metadata IS NULL;

-- Create helper function to get marketplace fee percentage
CREATE OR REPLACE FUNCTION get_marketplace_fee_percentage(subscription_plan TEXT)
RETURNS DECIMAL AS $$
BEGIN
  RETURN CASE subscription_plan
    WHEN 'starter' THEN 0.00
    WHEN 'practitioner' THEN 3.00
    WHEN 'pro' THEN 1.00
    ELSE 5.00  -- Default/fallback for any unrecognized plan
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_marketplace_fee_percentage IS 'Returns the marketplace fee percentage for a given subscription plan. Used for calculating platform fees on transactions.';

-- Create view for active subscriptions with enriched metadata
CREATE OR REPLACE VIEW active_subscriptions AS
SELECT 
  s.id,
  s.user_id,
  s.plan,
  s.billing_cycle,
  s.status,
  s.stripe_subscription_id,
  s.current_period_start,
  s.current_period_end,
  s.subscription_end,
  s.plan_metadata,
  u.email,
  u.full_name,
  u.user_role,
  get_marketplace_fee_percentage(s.plan) as marketplace_fee_percentage,
  s.created_at,
  s.updated_at
FROM subscriptions s
JOIN users u ON u.id = s.user_id
WHERE s.status IN ('active', 'trialing');

COMMENT ON VIEW active_subscriptions IS 'View of active subscriptions with user data and calculated marketplace fees. Use this for reporting and analytics.';

-- Add index on subscription status for faster queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions(user_id, status);

-- Grant appropriate permissions
GRANT SELECT ON active_subscriptions TO authenticated;

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 20250110000002 completed successfully';
  RAISE NOTICE 'Deprecated tables marked: practitioner_subscriptions, practitioner_subscription_plans, subscribers';
  RAISE NOTICE 'Added plan_metadata column to subscriptions';
  RAISE NOTICE 'Created get_marketplace_fee_percentage function';
  RAISE NOTICE 'Created active_subscriptions view';
END $$;

