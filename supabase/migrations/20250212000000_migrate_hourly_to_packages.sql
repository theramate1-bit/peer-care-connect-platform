-- Migration: Auto-convert hourly_rate practitioners to packages
-- This migration creates default packages for practitioners who have hourly_rate set but no active packages
-- Only runs for practitioners who have hourly_rate but no active packages

-- Create default "General Session" package for practitioners with hourly_rate but no packages
INSERT INTO practitioner_products (
  practitioner_id,
  name,
  description,
  price_amount,
  duration_minutes,
  currency,
  is_active,
  created_at,
  updated_at
)
SELECT 
  u.id as practitioner_id,
  'General Session - £' || (u.hourly_rate::numeric / 1)::text || '/hour' as name,
  'General session based on hourly rate. Duration: 60 minutes.' as description,
  (u.hourly_rate * 100)::integer as price_amount, -- Convert to pence
  60 as duration_minutes,
  'gbp' as currency,
  true as is_active,
  NOW() as created_at,
  NOW() as updated_at
FROM users u
WHERE 
  u.user_role IN ('sports_therapist', 'massage_therapist', 'osteopath')
  AND u.hourly_rate IS NOT NULL
  AND u.hourly_rate > 0
  AND NOT EXISTS (
    -- Check if practitioner already has any active packages
    SELECT 1 
    FROM practitioner_products pp 
    WHERE pp.practitioner_id = u.id 
    AND pp.is_active = true
  )
ON CONFLICT DO NOTHING;

-- Add comment explaining the migration
COMMENT ON TABLE practitioner_products IS 'Products/packages that practitioners offer. Auto-migrated from hourly_rate for practitioners without packages.';

