-- Story 13: Apply Rating-Based Booking Restrictions
-- This script adds rating restrictions to create_booking_with_validation
-- Run this via Supabase CLI: supabase db execute --file STORY_13_APPLY_RATING_RESTRICTIONS.sql
-- Or apply via Supabase Dashboard SQL Editor

-- Helper function (already applied, but included for completeness)
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

-- NOTE: The main function update is in the migration file:
-- supabase/migrations/20250127_add_rating_based_booking_restrictions.sql
-- 
-- To apply the complete function update:
-- 1. Read the current function: SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'create_booking_with_validation' AND prorettype::regtype = 'jsonb';
-- 2. Modify it to add rating tier variables to DECLARE section
-- 3. Add rating check after date validation (after "Validate date is not in the past")
-- 4. Replace the function with CREATE OR REPLACE FUNCTION

-- The rating check should be added after line 247 (after date validation) and before "Calculate booking time range"
-- See migration file for the complete function definition with rating restrictions
