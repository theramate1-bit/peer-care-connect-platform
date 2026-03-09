# Credit System Fixes Applied

## Summary
Fixed all hardcoded credit values and aligned frontend calculations with backend logic.

## Changes Made

### 1. **Updated Credit Calculation Function** ✅
**File:** `peer-care-connect/src/pages/Credits.tsx`

**Before:**
```typescript
const calculateCreditCost = (durationMinutes: number): number => {
  return durationMinutes; // 1 credit per minute
};
```

**After:**
```typescript
// Matches backend logic: (hourly_rate / 10.0) * (duration_minutes / 60.0)
// Defaults to 60 hourly_rate if not provided
const calculateCreditCost = (
  durationMinutes: number, 
  hourlyRate?: number | null
): number => {
  if (!durationMinutes || durationMinutes <= 0) {
    return 10; // Default minimum
  }
  
  // Use provided hourly rate or default to 60
  const rate = hourlyRate && hourlyRate > 0 ? hourlyRate : 60;
  
  // Calculate: (hourly_rate / 10.0) * (duration_minutes / 60.0)
  const cost = Math.round((rate / 10.0) * (durationMinutes / 60.0));
  
  // Return at least 1 credit
  return Math.max(cost, 1);
};
```

**Added:** New helper function `getPractitionerCreditCost()` that calls the backend RPC function for accurate credit cost calculation.

### 2. **Removed Hardcoded Practitioner Credit Cost** ✅
**File:** `peer-care-connect/src/pages/Credits.tsx:450`

**Before:**
```typescript
const creditCost = 40; // Hardcoded
```

**After:**
```typescript
const hourlyRate = practitioner.hourly_rate || 60;
const creditCost = calculateCreditCost(60, hourlyRate); // Calculated dynamically
```

### 3. **Removed Hardcoded Fallback Credit Cost** ✅
**File:** `peer-care-connect/src/pages/Credits.tsx:482`

**Before:**
```typescript
credit_cost: 20 // Fixed: 20 credits per session
```

**After:**
```typescript
credit_cost: calculateCreditCost(60, practitioner.hourly_rate || 60) // Calculated based on hourly rate
```

### 4. **Fixed UI Dropdown Display** ✅
**File:** `peer-care-connect/src/pages/Credits.tsx:1605`

**Before:**
```typescript
<SelectItem value="60">60 minutes (40 credits)</SelectItem>
```

**After:**
```typescript
<SelectItem value="60">
  60 minutes ({calculateCreditCost(60, selectedPractitioner?.hourly_rate || 60)} credits)
</SelectItem>
```

All duration options now show dynamically calculated credit costs based on the selected practitioner's hourly rate.

### 5. **Fixed Balance Validation** ✅
**File:** `peer-care-connect/src/pages/Credits.tsx:656`

**Before:**
```typescript
const requiredCredits = calculateCreditCost(bookingData.duration_minutes);
```

**After:**
```typescript
// Get actual credit cost from backend for accurate validation
let requiredCredits: number;
try {
  requiredCredits = await getPractitionerCreditCost(
    selectedPractitioner.user_id,
    bookingData.duration_minutes
  );
} catch (error) {
  // Fallback to calculation using practitioner's hourly rate
  const hourlyRate = selectedPractitioner.hourly_rate || 60;
  requiredCredits = calculateCreditCost(bookingData.duration_minutes, hourlyRate);
}
```

### 6. **Added hourly_rate to Interface and Queries** ✅
- Added `hourly_rate?: number | null` to `NearbyPractitioner` interface
- Added `hourly_rate` to the SELECT query when fetching practitioners
- Included `hourly_rate` in practitioner return objects

### 7. **Fixed Total Cost Display** ✅
Updated the "Total Cost" display to use the selected practitioner's hourly rate for accurate calculation.

## Formula Alignment

**Backend Formula (from `get_practitioner_credit_cost`):**
```sql
v_credit_cost := GREATEST(
    ROUND((v_hourly_rate / 10.0) * (p_duration_minutes / 60.0)),
    1 -- Minimum 1 credit
);
```

**Frontend Formula (now matches):**
```typescript
const cost = Math.round((rate / 10.0) * (durationMinutes / 60.0));
return Math.max(cost, 1);
```

## Verification

✅ **Refund Function:** Already correct - uses `credit_cost` from database (no changes needed)
✅ **Credit Storage:** Already correct - uses `get_practitioner_credit_cost` RPC (no changes needed)
✅ **UI Display:** Fixed - now shows calculated values
✅ **Balance Checks:** Fixed - now uses actual credit cost from backend
✅ **Practitioner Display:** Fixed - calculates based on hourly rate

## Testing Recommendations

1. **Test with different hourly rates:**
   - Practitioner with hourly_rate=80: 60min session = 8 credits
   - Practitioner with hourly_rate=60 (default): 60min session = 6 credits
   - Practitioner with hourly_rate=NULL: 60min session = 6 credits (defaults to 60)

2. **Test UI consistency:**
   - Verify dropdown shows correct credits for each duration
   - Verify practitioner cards show correct credit costs
   - Verify balance validation uses correct amounts

3. **Test refund flow:**
   - Cancel a booking and verify refund amount matches original charge
   - Verify "60 credits refunded" message shows actual refunded amount

## Notes

- The refund system was already correctly implemented and uses database values
- All hardcoded values have been removed
- Frontend now matches backend calculation logic
- System gracefully falls back to calculation if RPC call fails

