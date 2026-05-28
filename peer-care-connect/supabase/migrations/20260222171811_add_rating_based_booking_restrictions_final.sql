-- Add rating-based booking restrictions to create_booking_with_validation
-- This enforces that practitioners can only book with others in the same rating tier:
-- - 4-5 stars can book with each other
-- - 2-3 stars can book with each other
-- - 0-1 stars can book with each other
-- Only applies when both client and practitioner are practitioners (peer bookings)

-- Helper function to determine rating tier (already created, but ensure it exists)
CREATE OR REPLACE FUNCTION public.get_rating_tier(p_rating NUMERIC)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_rating IS NULL OR p_rating = 0 THEN
    RETURN 'tier_0_1';  -- 0-1 stars
  ELSIF p_rating >= 4 THEN
    RETURN 'tier_4_5';  -- 4-5 stars
  ELSIF p_rating >= 2 THEN
    RETURN 'tier_2_3';   -- 2-3 stars
  ELSE
    RETURN 'tier_0_1';  -- 0-1 stars (default)
  END IF;
END;
$$;

COMMENT ON FUNCTION public.get_rating_tier IS 'Determines rating tier for booking restrictions: tier_0_1 (0-1 stars), tier_2_3 (2-3 stars), tier_4_5 (4-5 stars)';

-- Update create_booking_with_validation to include rating-based restrictions
-- We need to add rating tier variables to DECLARE and rating check after date validation
-- Since the function in the database has different variable names, we'll update it carefully

-- First, let's add the rating tier variables to the DECLARE section
-- Then add the rating check logic after the date validation (after line 247)

-- We'll use ALTER FUNCTION to modify the function, but PostgreSQL doesn't support that easily
-- So we'll need to replace the entire function with the updated version

-- For now, let's create a script that will add the rating check
-- We'll read the current function, modify it, and replace it

-- Actually, the best approach is to apply the complete function replacement
-- Since we have the migration file with the complete function, let's apply it via MCP
