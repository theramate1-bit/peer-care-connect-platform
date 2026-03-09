# Root Cause Analysis - Missing Credit Transactions

## 🔴 CRITICAL ISSUE FOUND

### Problem Summary
When peer treatment exchange requests are accepted, credits are transferred but **NO `session_earning` transaction is created** for the practitioner. This causes incorrect refund logic and misleading credit displays.

---

## Root Cause Chain

### 1. **Session Creation Flow** ✅
**File**: `treatment-exchange.ts:735`
- `acceptExchangeRequest()` calls `create_accepted_exchange_session` RPC
- RPC creates `client_sessions` with `payment_status: 'paid'` and `credit_cost: 60`
- ✅ Session is created correctly

### 2. **Credit Processing Flow** ❌ **ROOT CAUSE**
**File**: `treatment-exchange.ts:766`
- Calls `processExchangeCreditsOnAcceptance()`
- **Problem**: Uses `credits_transfer` RPC instead of `process_peer_booking_credits`

**Current Code (WRONG)**:
```typescript
// Line 1226: Uses credits_transfer
const { error: transferError } = await supabase.rpc('credits_transfer', {
  p_from_user_id: requesterId,
  p_to_user_id: recipientId,
  p_amount: requiredCredits,
  p_reference_id: sessionId,
  p_reference_type: 'exchange',
  p_description: `Treatment exchange - ${durationMinutes} min session`
});
```

**What `credits_transfer` does**:
- Transfers credits from requester to recipient
- Creates generic transaction records
- ❌ Does NOT create `session_earning` transaction
- ❌ Does NOT update `total_earned` properly
- ❌ Does NOT link transaction to `client_sessions.id`

### 3. **Refund Logic** ❌ **SECONDARY ISSUE**
**File**: `20250201_add_peer_booking_refund.sql:86-103`
- Assumes practitioner earned credits (checks balance)
- Deducts credits using `session_payment` transaction type
- ❌ Wrong transaction type (should be `session_earning_reversal`)
- ❌ Increments `total_spent` instead of decrementing `total_earned`

---

## Likely Culprits

### 🔴 **PRIMARY CULPRIT**: `processExchangeCreditsOnAcceptance()`
**Location**: `treatment-exchange.ts:1195-1247`
**Issue**: Uses wrong RPC function (`credits_transfer` instead of `process_peer_booking_credits`)

**Why it's wrong**:
1. `credits_transfer` is a generic transfer function
2. Doesn't create proper `session_earning` transaction
3. Doesn't link to `client_sessions.id` properly
4. Doesn't update `total_earned` correctly

**Fix Required**: Replace `credits_transfer` call with `process_peer_booking_credits`

### 🟡 **SECONDARY CULPRIT**: `process_peer_booking_refund()`
**Location**: `20250201_add_peer_booking_refund.sql`
**Issue**: Doesn't validate that earning transaction exists before deducting

**Why it's wrong**:
1. Assumes credits were earned without checking
2. Uses wrong transaction type (`session_payment` instead of `session_earning_reversal`)
3. Updates wrong totals (`total_spent` instead of `total_earned`)

**Fix Required**: 
1. Validate earning transaction exists
2. Use correct transaction type
3. Update correct totals

---

## Impact on Daily Use

### Current Behavior (BROKEN):
```
1. User A sends request → No credits deducted ✅
2. User B accepts → Credits transferred via credits_transfer ❌
   - No session_earning transaction created ❌
   - Practitioner never "earned" credits ❌
3. Session cancelled → Refund deducts credits ❌
   - Practitioner loses credits they never earned ❌
   - Balance goes negative or incorrect ❌
```

### Expected Behavior (FIXED):
```
1. User A sends request → No credits deducted ✅
2. User B accepts → process_peer_booking_credits called ✅
   - Creates session_earning transaction ✅
   - Updates total_earned ✅
   - Links to client_sessions.id ✅
3. Session cancelled → Refund reverses earning ✅
   - Validates earning exists ✅
   - Reverses session_earning ✅
   - Updates total_earned correctly ✅
```

---

## Files That Need Fixing

1. ✅ **treatment-exchange.ts:1195** - Replace `credits_transfer` with `process_peer_booking_credits`
2. ✅ **20250201_add_peer_booking_refund.sql** - Fix refund logic to validate and reverse earnings

---

## Verification Steps

After fix:
1. Accept a new exchange request
2. Check `credit_transactions` table:
   - Should see `session_earning` transaction for practitioner ✅
   - Should see `session_payment` transaction for client ✅
   - Both should have `session_id` linking to `client_sessions.id` ✅
3. Cancel the session
4. Check refund transaction:
   - Should see `session_earning_reversal` for practitioner ✅
   - Should see `refund` for client ✅
   - Practitioner's `total_earned` should decrease ✅

