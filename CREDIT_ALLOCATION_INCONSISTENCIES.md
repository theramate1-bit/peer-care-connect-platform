# Credit Allocation Inconsistencies: Giving vs Receiving Treatments

## 🔴 CRITICAL INCONSISTENCY IDENTIFIED

### Problem Summary
The credit allocation logic is **asymmetric and unfair** between giving and receiving treatments in peer bookings. This creates an unsustainable exchange economy.

---

## Current State Analysis

### Database Function: `process_peer_booking_credits`
**Current Implementation (from Supabase):**
- ✅ **RECEIVING treatment (Client)**: Credits are **deducted** from balance
- ❌ **GIVING treatment (Practitioner)**: Credits are **NOT transferred** - they are **BURNED** (removed from circulation)

**Code Evidence:**
```sql
-- From 20251229_burn_credits_on_peer_booking.sql
-- NO TRANSFER to practitioner
-- Credits are removed from circulation ("burned")
-- We do not update practitioner balance or create a transaction for them
```

### Migration History Conflict

1. **Migration `20251227000002_remove_session_earnings_from_treatment_exchange.sql`**:
   - States: "Credits should be transferred (but not counted as earnings)"
   - Implementation: Transfers credits to practitioner, but doesn't update `total_earned`
   - Transaction type: `'transfer'` (not `'session_earning'`)

2. **Migration `20251229_burn_credits_on_peer_booking.sql`** (CURRENT):
   - States: "Credits are removed from circulation (burned)"
   - Implementation: Only deducts from client, NO transfer to practitioner
   - Transaction type: `'session_payment'` only

**Result**: The latest migration (burn) overwrote the transfer logic, creating the inconsistency.

---

## The Inconsistency

### Scenario: Person A gives treatment to Person B

**Current Behavior:**
1. Person B (receiving) → Credits **deducted** from their balance ✅
2. Person A (giving) → Gets **NOTHING** ❌
3. Credits **disappear** from the system (burned) ❌

**Expected Behavior (for sustainable exchange):**
1. Person B (receiving) → Credits **deducted** from their balance ✅
2. Person A (giving) → Credits **transferred** to their balance ✅
3. Credits **circulate** in the system (not burned) ✅

---

## Impact Analysis

### 1. **Unfair to Practitioners Giving Treatments**
- Practitioners who give treatments receive no compensation
- Only practitioners receiving treatments pay
- Creates disincentive to offer treatments

### 2. **Unsustainable Credit Economy**
- Credits are removed from circulation (deflationary)
- Over time, total credits in system decreases
- Eventually, no credits available for exchanges

### 3. **Asymmetric Exchange**
- One-way flow: Credits only flow OUT, never IN
- Breaks the peer exchange model
- Should be: Credits flow FROM receiver TO giver

### 4. **Code Comments vs Implementation Mismatch**
```typescript
// From treatment-exchange.ts:1612
p_practitioner_id: recipientId, // Recipient earns
```
**Comment says "earns" but function doesn't transfer credits!**

---

## Root Cause

The migration `20251229_burn_credits_on_peer_booking.sql` was applied **after** `20251227000002_remove_session_earnings_from_treatment_exchange.sql`, overwriting the transfer logic with burn logic.

**Timeline:**
1. Original: Credits transferred (counted as earnings) ❌
2. Migration 1: Credits transferred (NOT counted as earnings) ✅
3. Migration 2: Credits burned (no transfer) ❌ **CURRENT STATE**

---

## Recommended Fix

### Option 1: Transfer Credits (Recommended)
**Restore transfer logic but keep earnings exclusion:**

```sql
-- Transfer credits to practitioner (balance only, NOT total_earned)
UPDATE public.credits
SET 
    balance = v_practitioner_new_balance,
    current_balance = v_practitioner_new_balance,
    -- DO NOT update total_earned - credits only come from subscriptions
    updated_at = NOW()
WHERE user_id = p_practitioner_id;

-- Create transaction record for practitioner (transfer, NOT earning)
INSERT INTO public.credit_transactions (
    user_id, 
    transaction_type, 
    amount,
    balance_before, 
    balance_after,
    description, 
    session_id,
    created_at
) VALUES (
    p_practitioner_id, 
    'transfer',  -- NOT 'session_earning'
    v_credit_cost,
    v_practitioner_balance, 
    v_practitioner_new_balance,
    'Peer treatment session - credit transfer (not an earning)',
    p_session_id,
    NOW()
);
```

**Benefits:**
- ✅ Fair: Practitioner giving treatment receives credits
- ✅ Sustainable: Credits circulate in the system
- ✅ Correct: Matches peer exchange model
- ✅ No earnings: `total_earned` not updated (credits only from subscriptions)

### Option 2: Keep Burn Logic (If Intentional)
**If credits should be burned (deflationary model):**
- Update all documentation to reflect this
- Remove misleading code comments
- Explain business rationale for burning credits

**This seems unlikely given the peer exchange design.**

---

## Additional Inconsistencies Found

### 1. **Treatment Exchange vs Direct Peer Booking**
- **Treatment Exchange** (`mutual_exchange_sessions`): Uses `process_peer_booking_credits` → Credits burned
- **Direct Peer Booking** (`client_sessions` with `is_peer_booking: true`): Uses `process_peer_booking_credits` → Credits burned

**Both paths use same function, so both have same issue.**

### 2. **Refund Logic Expects Transfer**
The refund function `process_peer_booking_refund` may expect credits to have been transferred to practitioner, but current burn logic means there's nothing to refund from practitioner side.

**Need to verify refund logic compatibility with burn model.**

---

## Files to Update

1. **Database Function**: `process_peer_booking_credits`
   - Restore transfer logic (from migration `20251227000002`)
   - Keep earnings exclusion (don't update `total_earned`)

2. **Code Comments**: `treatment-exchange.ts:1612`
   - Update comment to reflect actual behavior OR fix behavior to match comment

3. **Documentation**: 
   - Update design docs to clarify credit flow
   - Document that credits transfer but don't count as earnings

---

## Verification Steps

After fix, verify:
1. ✅ Client credits deducted when receiving treatment
2. ✅ Practitioner credits increased when giving treatment
3. ✅ `total_earned` NOT updated for practitioner (credits only from subscriptions)
4. ✅ Transaction type is `'transfer'` not `'session_earning'`
5. ✅ Refund logic works correctly (can refund from practitioner)

---

## Conclusion

The current implementation **burns credits** instead of **transferring them**, which:
- ❌ Unfair to practitioners giving treatments
- ❌ Unsustainable (deflationary credit economy)
- ❌ Breaks peer exchange model
- ❌ Contradicts code comments

**Recommendation**: Restore transfer logic while maintaining earnings exclusion (credits transfer but don't count as earnings, since they only come from subscriptions).



