# Story 13: Rating-Based Booking Restrictions - Complete Instructions

**Date:** 2025-01-27  
**Status:** ⚠️ Helper function applied, main function update needs manual application

## Current Status

1. ✅ **Helper Function Applied**: `get_rating_tier()` function has been successfully created and tested
2. ⚠️ **Main Function Update Pending**: The `create_booking_with_validation` function needs to be updated

## Why Manual Application is Needed

The `create_booking_with_validation` function is very large (14,894 characters) and the database structure uses different variable names than the migration file:
- Database uses: `v_conflict_exists`, `v_blocked_exists` (BOOLEAN)
- Migration file uses: `v_conflict_count`, `v_blocked_count` (INTEGER)

## How to Apply

### Option 1: Via Supabase Dashboard SQL Editor

1. Open Supabase Dashboard → SQL Editor
2. Copy the complete function definition from: `supabase/migrations/20250127_add_rating_based_booking_restrictions.sql`
3. Execute the SQL (lines 32-544 contain the complete function with rating restrictions)

### Option 2: Via Supabase CLI

```bash
cd peer-care-connect
supabase db execute --file supabase/migrations/20250127_add_rating_based_booking_restrictions.sql
```

### Option 3: Manual Update

If the function structure differs, you'll need to:
1. Get the current function: `SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'create_booking_with_validation' AND prorettype::regtype = 'jsonb';`
2. Add rating tier variables to DECLARE section (after `v_log_id`):
   ```sql
   v_therapist_rating NUMERIC;
   v_client_rating NUMERIC;
   v_therapist_role TEXT;
   v_client_role TEXT;
   v_therapist_tier TEXT;
   v_client_tier TEXT;
   ```
3. Add rating check after date validation (after line 208, before "Calculate booking time range")
4. See migration file lines 210-271 for the complete rating check logic

## Verification

After applying, verify with:
```sql
SELECT 
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%RATING-BASED BOOKING RESTRICTIONS%' THEN 'Rating check EXISTS'
    ELSE 'Rating check MISSING'
  END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'create_booking_with_validation'
  AND pg_catalog.format_type(p.prorettype, NULL) = 'jsonb';
```

## What the Rating Restrictions Do

- **4-5 stars** can only book with other 4-5 star practitioners
- **2-3 stars** can only book with other 2-3 star practitioners  
- **0-1 stars** can only book with other 0-1 star practitioners
- Only applies to peer bookings (when both client and practitioner are practitioners)
- Returns `RATING_TIER_MISMATCH` error code when tiers don't match
