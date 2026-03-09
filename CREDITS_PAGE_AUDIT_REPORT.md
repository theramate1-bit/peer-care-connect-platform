# Credits Page Audit Report - Osteopath User

**Date**: December 26, 2025  
**User**: Johnny Osteo (osteo.user.test@gmail.com)  
**User Role**: Osteopath  
**Status**: 🔴 **CRITICAL ISSUES FOUND**

---

## Executive Summary

The credits page displays **inaccurate information** for the osteopath user. The displayed values are technically correct based on database records, but they reflect a **systematic error** in how peer booking credits were processed.

---

## Current Display vs Reality

### What the UI Shows:
- **Current Balance**: 0 credits
- **Total Earned**: +60 credits
- **Total Spent**: -60 credits
- **Cancelled Session**: Shows "60 credits"

### What the Database Shows:
- **Balance**: 0 credits ✅ (matches UI)
- **Total Earned**: 60 credits ✅ (matches UI)
- **Total Spent**: 60 credits ✅ (matches UI)

**However, these values are WRONG due to missing transaction history.**

---

## 🔴 Critical Issue #1: Missing Session Earning Transaction

### Problem
When the peer booking session was created on **December 23, 2025**, the osteopath should have **EARNED 60 credits** as the therapist. However, **NO `session_earning` transaction exists** for this session.

### Expected Flow:
1. ✅ Dec 20: Osteopath receives 60 bonus credits (initial allocation)
2. ❌ **Dec 23: Session created → MISSING: Osteopath should earn 60 credits**
3. ✅ Dec 25: Session cancelled → Osteopath loses 60 credits (refund deduction)

### Actual Flow:
1. ✅ Dec 20: Osteopath receives 60 bonus credits
2. ❌ **Dec 23: Session created → NO credit transaction occurred**
3. ✅ Dec 25: Session cancelled → Osteopath loses 60 credits (but never earned them!)

### Transaction History Analysis

**Osteopath's Transactions:**
```
1. Dec 20: +60 credits (bonus) → Balance: 60
2. Dec 25: -60 credits (session_payment - refund deduction) → Balance: 0
```

**Missing Transaction:**
```
Dec 23: +60 credits (session_earning) → Should have been: Balance: 120
```

### Root Cause
The `process_peer_booking_credits` RPC function was likely:
- **Not called** when the session was created, OR
- **Called but failed silently** without creating the earning transaction

---

## 🔴 Critical Issue #2: Incorrect Refund Logic

### Problem
The refund function (`process_peer_booking_refund`) assumes the practitioner **earned credits** when the session was created. However, since no earning transaction exists, the refund deduction is **incorrect**.

### Current Refund Logic (Line 86-103):
```sql
-- Deduct credits from practitioner
UPDATE public.credits
SET 
    balance = v_practitioner_new_balance,
    current_balance = v_practitioner_new_balance,
    total_spent = COALESCE(total_spent, 0) + v_session.credit_cost,  -- ❌ WRONG
    updated_at = NOW()
WHERE user_id = v_session.therapist_id;
```

### Issues:
1. **`total_spent` is incremented** - This is incorrect! The practitioner didn't "spend" credits, they should lose "earned" credits
2. **No validation** that the practitioner actually earned credits for this session
3. **Transaction type is `session_payment`** - Should be `session_earning_reversal` or similar

### What Should Happen:
- If practitioner earned credits → Reverse the earning (deduct from balance, decrease `total_earned`)
- If practitioner never earned credits → Do nothing (or log error)

---

## 🔴 Critical Issue #3: Misleading Display Labels

### Problem
The UI labels are misleading for practitioners:

**"Total Earned: +60"**
- ✅ Technically correct (60 bonus credits)
- ❌ Misleading - suggests they earned from sessions, but they didn't

**"Total Spent: -60"**
- ✅ Technically correct (60 credits deducted)
- ❌ Misleading - suggests they spent credits, but they actually lost earned credits (that they never received)

**"On peer treatments"**
- ❌ Incorrect label - The -60 is from a refund deduction, not spending on treatments

---

## Data Integrity Issues

### Session Details:
- **Session ID**: `89e3cff3-82f8-4257-9dc7-7ae4645d9608`
- **Created**: Dec 23, 2025 15:21:11
- **Cancelled**: Dec 25, 2025 12:19:06
- **Credit Cost**: 60 credits
- **Status**: cancelled
- **Payment Status**: refunded

### Missing Data:
- ❌ No `session_earning` transaction for osteopath
- ❌ No `session_payment` transaction for client (Ray Dhillon) when session was created
- ✅ Refund transaction exists for client
- ✅ Refund deduction exists for osteopath

---

## Impact Assessment

### For Osteopath User:
1. **Lost 60 credits** they never actually earned
2. **Balance shows 0** instead of 60 (their original bonus)
3. **Confusing transaction history** - shows "spent" but they never spent anything
4. **Cannot book new sessions** - balance is 0

### For System:
1. **Data integrity compromised** - missing transactions
2. **Refund logic is flawed** - doesn't validate earning occurred
3. **User trust issues** - credits disappear incorrectly

---

## Recommendations

### 🔴 HIGH PRIORITY - Fix Refund Logic

**Update `process_peer_booking_refund` function:**

1. **Validate earning transaction exists** before deducting:
```sql
-- Check if practitioner earned credits for this session
SELECT COUNT(*) INTO v_earning_exists
FROM public.credit_transactions
WHERE user_id = v_session.therapist_id
  AND session_id = p_session_id
  AND transaction_type = 'session_earning';

IF v_earning_exists = 0 THEN
    -- Practitioner never earned credits, don't deduct
    -- Log warning but don't fail
    RAISE WARNING 'Practitioner never earned credits for session %', p_session_id;
ELSE
    -- Deduct earned credits (reverse the earning)
    UPDATE public.credits
    SET 
        balance = v_practitioner_new_balance,
        current_balance = v_practitioner_new_balance,
        total_earned = total_earned - v_session.credit_cost,  -- ✅ Decrease earned, not increase spent
        updated_at = NOW()
    WHERE user_id = v_session.therapist_id;
END IF;
```

2. **Change transaction type** from `session_payment` to `session_earning_reversal`

3. **Update description** to be clearer: "Earning reversal: Session cancelled"

### 🟡 MEDIUM PRIORITY - Fix Missing Transactions

**Investigate why `process_peer_booking_credits` wasn't called:**
- Check frontend code that creates peer bookings
- Add error handling/logging
- Ensure RPC is called atomically with session creation

### 🟢 LOW PRIORITY - Improve UI Labels

**Update Credits.tsx display:**
- For practitioners: Show "Total Earned from Sessions" vs "Total Earned from Bonuses"
- For refunds: Show "Earning Reversed" instead of "Spent"
- Add tooltips explaining transaction types

---

## Immediate Action Required

### For This User:
1. **Manually correct the balance**:
   - Add 60 credits back to osteopath (they lost credits they never earned)
   - Create a `bonus` transaction: "Correction: Refunded incorrectly deducted credits"

2. **Fix the transaction history**:
   - Create missing `session_earning` transaction (backdated to Dec 23)
   - Update refund transaction type to `session_earning_reversal`

### For System:
1. **Fix refund function** (see recommendations above)
2. **Add validation** to prevent future occurrences
3. **Add monitoring** to detect missing transactions

---

## Verification Queries

```sql
-- Check if earning transaction exists for this session
SELECT * FROM public.credit_transactions
WHERE session_id = '89e3cff3-82f8-4257-9dc7-7ae4645d9608'
  AND user_id = 'e0d30431-54ff-45cb-b35c-e569b31199ef'
  AND transaction_type = 'session_earning';
-- Result: 0 rows ❌

-- Check current balance
SELECT balance, total_earned, total_spent 
FROM public.credits 
WHERE user_id = 'e0d30431-54ff-45cb-b35c-e569b31199ef';
-- Result: balance=0, total_earned=60, total_spent=60
```

---

## Conclusion

The credits page is displaying **technically accurate** data from the database, but the underlying data is **incorrect** due to:
1. Missing earning transaction when session was created
2. Flawed refund logic that deducts credits without validating they were earned
3. Misleading transaction types and labels

**The user is correct** - the information is inaccurate and needs to be fixed.

