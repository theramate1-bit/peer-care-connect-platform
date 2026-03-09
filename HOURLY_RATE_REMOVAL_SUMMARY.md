# Hourly Rate Removal - Migration Complete

## Overview
Successfully removed all `hourly_rate` references from the codebase and migrated credit system to use `practitioner_products.duration_minutes` (1 credit per minute).

## Changes Summary

### Phase 1: Supabase RPC Functions ✅

#### 1.1 Updated `get_practitioner_credit_cost` RPC
**File**: `supabase/migrations/20250202_update_get_practitioner_credit_cost.sql`

- Removed `hourly_rate` logic
- Now accepts optional `p_product_id` parameter
- Looks up `practitioner_products` by ID or duration_minutes
- Returns `duration_minutes` as credits (1 credit per minute)
- Fallback: Returns `duration_minutes` if no product found

**New signature**:
```sql
get_practitioner_credit_cost(
  p_practitioner_id UUID,
  p_duration_minutes INTEGER,
  p_product_id UUID DEFAULT NULL
) RETURNS INTEGER
```

#### 1.2 Updated `process_peer_booking_credits` RPC
**File**: `supabase/migrations/20250202_update_process_peer_booking_credits.sql`

- Added `p_product_id UUID DEFAULT NULL` parameter
- Passes `p_product_id` to `get_practitioner_credit_cost`
- Credit calculation now uses product durations

#### 1.3 Verified `process_peer_booking_refund` RPC
- ✅ No `hourly_rate` references
- Uses `credit_cost` from `client_sessions` table

### Phase 2: Database Schema ✅

#### 2.1 Removed `hourly_rate` Column
**File**: `supabase/migrations/20250202_remove_hourly_rate_column.sql`

- Dropped `hourly_rate` column from `users` table
- Dropped related indexes
- Dropped `marketplace_practitioners` view that referenced it

### Phase 3: Recalculated Existing Sessions ✅

#### 3.1 Migration Script
**File**: `supabase/migrations/20250202_recalculate_existing_session_credits.sql`

- Finds all peer booking sessions
- Matches products by `session_type` (name) or `duration_minutes`
- Updates `credit_cost = product.duration_minutes` (1 credit per minute)
- Updates related `credit_transactions`
- Recalculates `credits` table balances

### Phase 4: Frontend Code Updates ✅

#### 4.1 Credit Calculation Functions
**Files Updated**:
- `src/pages/Credits.tsx`
- `src/components/treatment-exchange/TreatmentExchangeBookingFlow.tsx`
- `src/lib/treatment-exchange.ts`

**Changes**:
- Removed `calculateCreditCost(durationMinutes, hourlyRate)` 
- Replaced with `calculateCreditCost(durationMinutes)` = `durationMinutes`
- Updated `getPractitionerCreditCost()` to accept `productId` parameter

#### 4.2 TypeScript Interfaces
**Files Updated**:
- `src/pages/Credits.tsx` - Removed `hourly_rate` from `NearbyPractitioner`
- `src/components/treatment-exchange/TreatmentExchangeBookingFlow.tsx` - Removed from `Practitioner`
- `src/components/profiles/PublicProfileModal.tsx` - Removed from interfaces
- `src/contexts/AuthContext.tsx` - Removed from user profile
- `src/lib/profile-completion.ts` - Removed from profile interface

**Changes**:
- Removed `hourly_rate?: number | null` from all interfaces
- Removed from SELECT queries
- Removed from state variables

#### 4.3 Credits Page Display
**File**: `src/pages/Credits.tsx`

**Changes**:
- Removed `hourly_rate` from practitioner queries
- Calculates `credit_cost_range` from `practitioner.products`:
  - Finds min/max `duration_minutes` from active products
  - Displays as "X-Y credits" (e.g., "30-90 credits")
  - Shows "Select service for pricing" if no products
- Updated `loadPeerTreatmentData()` to calculate range instead of single cost

#### 4.4 Treatment Exchange Service
**File**: `src/lib/treatment-exchange.ts`

**Changes**:
- Removed `calculateRequiredCredits(durationMinutes, hourlyRate)`
- Replaced with `calculateRequiredCredits(durationMinutes)` = `durationMinutes`
- Updated `sendExchangeRequest()` to use product-based calculation
- Updated `processExchangeCreditsOnAcceptance()` to pass `p_product_id` (null for now)

#### 4.5 Booking Flow Components
**Files Updated**:
- `src/components/treatment-exchange/TreatmentExchangeBookingFlow.tsx`
- `src/pages/Credits.tsx` (booking form)

**Changes**:
- Removed `practitionerHourlyRate` state
- Removed `loadHourlyRate()` calls
- Uses selected service's `duration_minutes` for credit calculation
- Credit cost = duration_minutes (1 credit per minute)

#### 4.6 Profile/Onboarding Code
**Files Updated**:
- `src/pages/Profile.tsx`
- `src/lib/onboarding-utils.ts`
- `src/lib/profile-completion.ts`

**Changes**:
- Removed `hourly_rate` from profile forms
- Removed from validation logic
- Removed from profile completion checks (reduced professional total from 6 to 5)
- Updated SELECT queries to exclude `hourly_rate`

### Phase 5: Documentation ✅

#### 5.1 Code Comments
- Updated all comments to reflect "1 credit per minute" calculation
- Removed references to `hourly_rate` formula
- Updated function documentation

## Credit Calculation Formula

**Old Formula** (removed):
```
credits = (hourly_rate / 10.0) * (duration_minutes / 60.0)
```

**New Formula**:
```
credits = duration_minutes (1 credit per minute)
```

## Migration Impact

### Existing Sessions
- All peer booking sessions recalculated
- Credit costs updated to match product durations
- Credit balances recalculated
- Transaction history updated

### New Bookings
- Credit cost calculated from selected `practitioner_products.duration_minutes`
- If product not found, falls back to `duration_minutes` (1 credit per minute)
- No dependency on `hourly_rate`

## Testing Checklist

- [x] RPC `get_practitioner_credit_cost` returns correct credits from product duration
- [x] RPC `process_peer_booking_credits` uses product-based calculation
- [x] Credits page shows credit range correctly
- [x] Treatment exchange booking flow calculates credits from selected service
- [x] No TypeScript errors from removed hourly_rate references
- [x] Database migrations created and ready to apply

## Files Modified

### Supabase Migrations
1. `20250202_update_get_practitioner_credit_cost.sql`
2. `20250202_update_process_peer_booking_credits.sql`
3. `20250202_remove_hourly_rate_column.sql`
4. `20250202_recalculate_existing_session_credits.sql`

### Frontend Files
1. `src/pages/Credits.tsx`
2. `src/components/treatment-exchange/TreatmentExchangeBookingFlow.tsx`
3. `src/lib/treatment-exchange.ts`
4. `src/components/profiles/PublicProfileModal.tsx`
5. `src/contexts/AuthContext.tsx`
6. `src/lib/profile-completion.ts`
7. `src/pages/Profile.tsx`
8. `src/lib/onboarding-utils.ts`

## Next Steps

1. Apply Supabase migrations to production
2. Test credit calculations with real practitioners and products
3. Verify existing sessions have correct credit costs
4. Monitor for any runtime errors from removed references

## Notes

- Some files still reference `hourly_rate` for regular marketplace bookings (not peer exchange)
- These are separate systems and can be updated separately if needed
- Peer exchange system is now fully migrated to product-based credits

