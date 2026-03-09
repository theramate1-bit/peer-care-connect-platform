-- Remove hourly_rate column from users table
-- Credit costs are now calculated from practitioner_products.duration_minutes (1 credit per minute)

-- Drop any indexes on hourly_rate (if they exist)
DROP INDEX IF EXISTS idx_users_hourly_rate;
DROP INDEX IF EXISTS idx_user_profiles_hourly_rate;

-- Drop or update views that reference hourly_rate
DROP VIEW IF EXISTS public.marketplace_practitioners CASCADE;

-- Remove the column
ALTER TABLE public.users DROP COLUMN IF EXISTS hourly_rate;

-- Add comment to document the change
COMMENT ON TABLE public.users IS 'Users table. Credit costs for practitioners are now based on practitioner_products.duration_minutes (1 credit per minute), not hourly_rate.';

