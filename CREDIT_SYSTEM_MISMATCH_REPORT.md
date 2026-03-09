# Credit System Mismatch Report

## Executive Summary
Found **hardcoded credit values** and **UI display mismatches** in the credit system. The refund function correctly uses database values, but the UI and some calculation logic have inconsistencies.

## Critical Issues Found

### 1. **Hardcoded Credit Cost in Practitioner Display** ⚠️
**Location:** `peer-care-connect/src/pages/Credits.tsx:450`
```typescript
// Default to 40 credits for 60-minute session display
const creditCost = 40;
```
**Issue:** This hardcodes 40 credits for all practitioners regardless of actual session duration or practitioner pricing.

**Impact:** 
- Practitioner cards show incorrect credit costs
- Users see wrong pricing information
- Mismatch between displayed cost and actual booking cost

### 2. **Hardcoded Fallback Credit Cost** ⚠️
**Location:** `peer-care-connect/src/pages/Credits.tsx:482`
```typescript
credit_cost: 20 // Fixed: 20 credits per session
```
**Issue:** Fallback value is hardcoded to 20 credits.

**Impact:** Error cases show incorrect credit costs.

### 3. **UI Display Mismatch** ⚠️
**Location:** `peer-care-connect/src/pages/Credits.tsx:1605`
```typescript
<SelectItem value="60">60 minutes (40 credits)</SelectItem>
```
**Issue:** UI shows "60 minutes (40 credits)" but:
- The `calculateCreditCost` function (line 107-109) returns `durationMinutes` directly (1 credit per minute = 60 credits for 60 minutes)
- The actual database function `get_practitioner_credit_cost` uses a different formula: `(hourly_rate / 10.0) * (duration_minutes / 60.0)`

**Impact:** Users see incorrect credit costs in the booking form dropdown.

### 4. **Credit Calculation Formula Mismatch** ⚠️
**Location:** Multiple places

**Frontend Calculation:**
- `Credits.tsx:107-109`: `return durationMinutes;` (1 credit per minute)
- Used for: Balance checks, UI display

**Backend Calculation:**
- `get_practitioner_credit_cost()` SQL function: `(hourly_rate / 10.0) * (duration_minutes / 60.0)`
- Used for: Actual booking credit cost storage

**Example:**
- 60-minute session with hourly_rate=80:
  - Frontend shows: 60 credits (1 credit/min)
  - Backend calculates: (80/10) * (60/60) = 8 credits
- 60-minute session with hourly_rate=NULL (defaults to 60):
  - Frontend shows: 60 credits
  - Backend calculates: (60/10) * (60/60) = 6 credits

**Impact:** Users may have insufficient credits displayed, or may see incorrect costs.

## What's Working Correctly ✅

### 1. **Refund Function Uses Database Value**
**Location:** `process_peer_booking_refund` SQL function
```sql
v_credit_cost := v_session.credit_cost; -- Uses stored value from database
```
**Status:** ✅ Correctly uses the `credit_cost` stored in `client_sessions` table

### 2. **Credit Cost Storage**
**Location:** `process_peer_booking_credits` SQL function
```sql
v_credit_cost := get_practitioner_credit_cost(p_practitioner_id, p_duration_minutes);
UPDATE public.client_sessions SET credit_cost = v_credit_cost WHERE id = p_session_id;
```
**Status:** ✅ Correctly calculates and stores credit cost using practitioner-specific logic

## Root Cause Analysis

1. **Inconsistent Credit Calculation Logic:**
   - Frontend assumes 1 credit per minute
   - Backend uses hourly rate-based calculation
   - UI displays hardcoded values (40 credits for 60 min)

2. **Display vs. Reality Mismatch:**
   - UI shows "60 minutes (40 credits)"
   - Frontend function calculates 60 credits
   - Backend may calculate 6-8 credits (depending on hourly rate)

3. **Hardcoded Values:**
   - Practitioner display: 40 credits
   - Error fallback: 20 credits
   - These don't match any actual calculation

## Recommendations

### Immediate Fixes Required:

1. **Remove Hardcoded Values:**
   - Replace `const creditCost = 40;` with actual calculation
   - Replace `credit_cost: 20` with proper fallback calculation
   - Update UI dropdown to use actual calculation

2. **Align Frontend and Backend:**
   - Option A: Use same formula everywhere (recommended: backend formula)
   - Option B: Call backend function from frontend for consistency
   - Option C: Use RPC call to get actual credit cost before displaying

3. **Fix UI Display:**
   - Calculate actual credit cost for each duration option
   - Use `get_practitioner_credit_cost` RPC function or replicate its logic
   - Remove hardcoded "40 credits" text

4. **Add Validation:**
   - Ensure frontend balance check uses same calculation as backend
   - Add warning if displayed cost differs from actual cost

## Database Schema Verification ✅

**Verified via Supabase MCP:**
- `client_sessions.credit_cost` column exists and is properly typed (integer)
- `process_peer_booking_refund` function correctly reads `credit_cost` from database
- `process_peer_booking_credits` function correctly stores `credit_cost` in database
- Refund function uses `v_session.credit_cost` (dynamic, not hardcoded)

## Test Cases to Verify Fix

1. **Booking Flow:**
   - Create booking with 60-minute duration
   - Verify displayed cost matches actual cost charged
   - Verify refund amount matches original charge

2. **Different Practitioners:**
   - Test with practitioner hourly_rate=80
   - Test with practitioner hourly_rate=NULL (defaults to 60)
   - Verify credit costs differ appropriately

3. **UI Consistency:**
   - Check practitioner card displays correct credit cost
   - Check booking form dropdown shows correct costs
   - Verify balance checks use correct calculation

## Files Requiring Changes

1. `peer-care-connect/src/pages/Credits.tsx`
   - Line 450: Remove hardcoded `creditCost = 40`
   - Line 482: Remove hardcoded `credit_cost: 20`
   - Line 1605: Update dropdown to show calculated values
   - Line 107-109: Align `calculateCreditCost` with backend logic

2. Consider creating a shared credit calculation utility that both frontend and backend can use.

## Conclusion

The refund system is **correctly implemented** and uses database values dynamically. However, the **UI and display logic have hardcoded values** that don't match the actual credit calculation system. This creates confusion for users and potential balance check failures.

**Priority:** HIGH - Users may see incorrect pricing and may have balance validation issues.

