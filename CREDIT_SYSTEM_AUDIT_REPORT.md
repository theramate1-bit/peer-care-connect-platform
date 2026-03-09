# Credit System - CTO Audit Report
**Date:** October 31, 2025  
**Auditor:** Technical Review  
**Scope:** Comprehensive audit of peer treatment credit system

---

## Executive Summary

### Overall Assessment: ⚠️ **CRITICAL ISSUES FOUND**

The credit system shows good architectural design with row-level locking and proper transaction handling in several areas. However, **critical missing functionality** and security gaps require immediate attention before production use.

### Risk Level: 🔴 **HIGH**
- **1 Critical Issue** (System Breaking)
- **3 High Priority Issues** (Security/Data Integrity)
- **4 Medium Priority Issues** (UX/Performance)
- **2 Low Priority Improvements** (Nice-to-have)

---

## 🚨 CRITICAL ISSUES (Must Fix Immediately)

### 1. **MISSING `process_peer_booking_credits` RPC Function**
**Severity:** 🔴 CRITICAL - SYSTEM BREAKING  
**Impact:** All peer treatment bookings will fail

**Issue:**
The frontend code calls `process_peer_booking_credits` RPC function in multiple locations:
- `Credits.tsx` line 590
- `PeerTreatmentBooking.tsx` line 324
- `PeerTreatmentBooking.tsx` (component) line 231

**But this function does not exist in any migration file.**

**Evidence:**
```typescript
// Called in Credits.tsx:590
const { data: creditResult, error: creditError } = await supabase
  .rpc('process_peer_booking_credits', {
    p_client_id: userProfile?.id,
    p_practitioner_id: selectedPractitioner.user_id,
    p_session_id: sessionData.id,
    p_duration_minutes: bookingData.duration_minutes
  });
```

**Expected Behavior:**
This function should:
1. Use `FOR UPDATE` to lock both client and practitioner credit records
2. Validate client has sufficient credits
3. Calculate credit cost using `get_practitioner_credit_cost`
4. Deduct credits from client
5. Award credits to practitioner
6. Create transaction records for both parties
7. Update session with credit_cost
8. Return `{ success: boolean, credit_cost: number, error?: string }`
9. Handle ALL logic in a single atomic transaction

**Fix Required:**
```sql
CREATE OR REPLACE FUNCTION process_peer_booking_credits(
    p_client_id UUID,
    p_practitioner_id UUID,
    p_session_id UUID,
    p_duration_minutes INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_credit_cost INTEGER;
    v_client_balance INTEGER;
    v_practitioner_balance INTEGER;
    v_client_spent INTEGER;
    v_practitioner_earned INTEGER;
BEGIN
    -- Get credit cost
    v_credit_cost := get_practitioner_credit_cost(p_practitioner_id, p_duration_minutes);
    
    -- Lock credit records (FOR UPDATE prevents race conditions)
    SELECT balance, total_spent 
    INTO v_client_balance, v_client_spent
    FROM public.credits
    WHERE user_id = p_client_id
    FOR UPDATE;
    
    SELECT balance, total_earned
    INTO v_practitioner_balance, v_practitioner_earned
    FROM public.credits
    WHERE user_id = p_practitioner_id
    FOR UPDATE;
    
    -- Validate sufficient credits
    IF v_client_balance IS NULL OR v_client_balance < v_credit_cost THEN
        RETURN json_build_object(
            'success', false,
            'error', format('Insufficient credits. Required: %s, Available: %s', 
                           v_credit_cost, COALESCE(v_client_balance, 0)),
            'credit_cost', v_credit_cost
        );
    END IF;
    
    -- Deduct from client
    UPDATE public.credits
    SET 
        balance = balance - v_credit_cost,
        current_balance = current_balance - v_credit_cost,
        total_spent = COALESCE(total_spent, 0) + v_credit_cost,
        updated_at = NOW()
    WHERE user_id = p_client_id;
    
    -- Award to practitioner
    UPDATE public.credits
    SET 
        balance = balance + v_credit_cost,
        current_balance = current_balance + v_credit_cost,
        total_earned = COALESCE(total_earned, 0) + v_credit_cost,
        updated_at = NOW()
    WHERE user_id = p_practitioner_id;
    
    -- Create transaction record for client (deduction)
    INSERT INTO public.credit_transactions (
        user_id, transaction_type, amount, 
        balance_before, balance_after,
        description, session_id
    ) VALUES (
        p_client_id, 'session_payment', v_credit_cost,
        v_client_balance, v_client_balance - v_credit_cost,
        'Peer treatment session booking',
        p_session_id
    );
    
    -- Create transaction record for practitioner (earning)
    INSERT INTO public.credit_transactions (
        user_id, transaction_type, amount,
        balance_before, balance_after,
        description, session_id
    ) VALUES (
        p_practitioner_id, 'session_earning', v_credit_cost,
        v_practitioner_balance, v_practitioner_balance + v_credit_cost,
        'Peer treatment session earning',
        p_session_id
    );
    
    -- Update session with credit cost
    UPDATE public.client_sessions
    SET credit_cost = v_credit_cost
    WHERE id = p_session_id;
    
    -- Return success
    RETURN json_build_object(
        'success', true,
        'credit_cost', v_credit_cost
    );
    
EXCEPTION WHEN OTHERS THEN
    -- Return error details
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'credit_cost', v_credit_cost
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION process_peer_booking_credits TO authenticated;
GRANT EXECUTE ON FUNCTION process_peer_booking_credits TO service_role;

COMMENT ON FUNCTION process_peer_booking_credits IS 
'Atomically processes credit transaction for peer treatment bookings. Validates balance, deducts from client, awards to practitioner. Uses row-level locking to prevent race conditions.';
```

---

## 🔴 HIGH PRIORITY ISSUES (Should Fix Before Production)

### 2. **No RLS Policies for `credit_allocations` Table**
**Severity:** 🔴 HIGH - SECURITY  
**Impact:** Unauthorized access to credit allocation history

**Issue:**
The `credit_allocations` table is created in migrations but has no Row Level Security policies defined.

**Fix Required:**
```sql
ALTER TABLE public.credit_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own credit allocations" 
ON public.credit_allocations
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage credit allocations"
ON public.credit_allocations
FOR ALL
USING (auth.role() = 'service_role');
```

### 3. **Race Condition in Monthly Credit Allocation**
**Severity:** 🔴 HIGH - DATA INTEGRITY  
**Impact:** Duplicate credit allocations possible

**Issue:**
In `stripe-webhook/index.ts` lines 766-810, there are multiple checks for existing allocations, but no database-level unique constraint to prevent duplicates.

**Current Code:**
```typescript
const { data: existingAllocation } = await supabase
  .from('credit_allocations')
  .select('id')
  .eq('subscription_id', updatedSub.id)
  .gte('allocated_at', periodStart)
  .lte('allocated_at', periodEnd)
  .maybeSingle();
```

**Problem:** Time gap between check and insert allows race condition.

**Fix Required:**
```sql
-- Add unique constraint to prevent duplicate allocations
ALTER TABLE public.credit_allocations
ADD CONSTRAINT unique_subscription_period 
UNIQUE (subscription_id, period_start, period_end);

-- Update allocate_monthly_credits to handle conflicts
CREATE OR REPLACE FUNCTION public.allocate_monthly_credits(...)
...
INSERT INTO public.credit_allocations (...)
VALUES (...)
ON CONFLICT (subscription_id, period_start, period_end) 
DO NOTHING
RETURNING id INTO v_allocation_id;

-- If allocation already exists, return existing allocation_id
IF v_allocation_id IS NULL THEN
    SELECT id INTO v_allocation_id
    FROM public.credit_allocations
    WHERE subscription_id = p_subscription_id
      AND period_start = p_period_start
      AND period_end = p_period_end;
END IF;
...
```

### 4. **Frontend Manual Rollback Not Atomic**
**Severity:** 🔴 HIGH - DATA INTEGRITY  
**Impact:** Orphaned sessions if rollback fails

**Issue:**
In `Credits.tsx` lines 597-602, manual session deletion for rollback:
```typescript
if (creditError) {
    await supabase
      .from('client_sessions')
      .delete()
      .eq('id', sessionData.id);
    throw new Error(creditError.message || 'Credit processing failed');
}
```

**Problem:** This creates a separate transaction. If the delete fails, you have a session without payment.

**Fix Required:**
Move ALL booking logic into the `process_peer_booking_credits` function, including session creation. The RPC function should handle the entire transaction atomically.

---

## ⚠️ MEDIUM PRIORITY ISSUES

### 5. **No Credit Expiration Logic**
**Severity:** ⚠️ MEDIUM - BUSINESS LOGIC  
**Impact:** Credits accumulate indefinitely

**Issue:** No expiration mechanism for unused credits. This could lead to:
- Users hoarding credits
- Unbalanced credit economy
- Practitioners leaving with large balances

**Recommendation:**
- Add expiration policy (e.g., credits expire after 12 months of inactivity)
- Add `expires_at` column to `credit_transactions`
- Create cron job to handle expiration
- Notify users before expiration

### 6. **Missing Refund/Cancellation Handling**
**Severity:** ⚠️ MEDIUM - BUSINESS LOGIC  
**Impact:** No way to return credits for cancelled sessions

**Issue:** No RPC function for processing refunds when sessions are cancelled.

**Fix Required:**
```sql
CREATE OR REPLACE FUNCTION process_peer_booking_refund(
    p_session_id UUID,
    p_cancellation_reason TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session RECORD;
    v_client_balance INTEGER;
    v_practitioner_balance INTEGER;
BEGIN
    -- Get session details with lock
    SELECT * INTO v_session
    FROM public.client_sessions
    WHERE id = p_session_id
    FOR UPDATE;
    
    -- Validate session is eligible for refund
    IF v_session.payment_status != 'paid' THEN
        RETURN json_build_object('success', false, 'error', 'Session not paid');
    END IF;
    
    IF v_session.credit_cost IS NULL OR v_session.credit_cost = 0 THEN
        RETURN json_build_object('success', false, 'error', 'No credits to refund');
    END IF;
    
    -- Lock credit records
    SELECT balance INTO v_client_balance
    FROM public.credits WHERE user_id = v_session.client_id FOR UPDATE;
    
    SELECT balance INTO v_practitioner_balance
    FROM public.credits WHERE user_id = v_session.therapist_id FOR UPDATE;
    
    -- Refund to client
    UPDATE public.credits
    SET balance = balance + v_session.credit_cost,
        current_balance = current_balance + v_session.credit_cost,
        updated_at = NOW()
    WHERE user_id = v_session.client_id;
    
    -- Deduct from practitioner
    UPDATE public.credits
    SET balance = balance - v_session.credit_cost,
        current_balance = current_balance - v_session.credit_cost,
        total_spent = COALESCE(total_spent, 0) + v_session.credit_cost,
        updated_at = NOW()
    WHERE user_id = v_session.therapist_id;
    
    -- Create transaction records
    INSERT INTO public.credit_transactions (user_id, transaction_type, amount, balance_before, balance_after, description, session_id)
    VALUES 
        (v_session.client_id, 'refund', v_session.credit_cost, v_client_balance, v_client_balance + v_session.credit_cost, p_cancellation_reason, p_session_id),
        (v_session.therapist_id, 'session_payment', v_session.credit_cost, v_practitioner_balance, v_practitioner_balance - v_session.credit_cost, 'Refund: ' || p_cancellation_reason, p_session_id);
    
    -- Update session status
    UPDATE public.client_sessions
    SET status = 'cancelled',
        payment_status = 'refunded',
        cancellation_reason = p_cancellation_reason
    WHERE id = p_session_id;
    
    RETURN json_build_object('success', true, 'refunded_credits', v_session.credit_cost);
END;
$$;
```

### 7. **No Fraud Prevention**
**Severity:** ⚠️ MEDIUM - SECURITY  
**Impact:** Potential credit manipulation

**Recommendations:**
- Add rate limiting on booking attempts
- Monitor for suspicious patterns (rapid booking/cancellation)
- Add audit trail table for sensitive operations
- Implement daily credit transaction limits
- Alert on large credit transfers

### 8. **No Balance Reconciliation**
**Severity:** ⚠️ MEDIUM - DATA INTEGRITY  
**Impact:** Balance discrepancies undetected

**Recommendation:**
Add a reconciliation function to verify balance accuracy:
```sql
CREATE OR REPLACE FUNCTION reconcile_credit_balance(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_stored_balance INTEGER;
    v_calculated_balance INTEGER;
    v_earned INTEGER;
    v_spent INTEGER;
BEGIN
    SELECT balance INTO v_stored_balance FROM credits WHERE user_id = p_user_id;
    
    SELECT 
        COALESCE(SUM(CASE WHEN transaction_type IN ('session_earning', 'bonus', 'refund') THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN transaction_type = 'session_payment' THEN amount ELSE 0 END), 0)
    INTO v_earned, v_spent
    FROM credit_transactions
    WHERE user_id = p_user_id;
    
    v_calculated_balance := v_earned - v_spent;
    
    RETURN json_build_object(
        'user_id', p_user_id,
        'stored_balance', v_stored_balance,
        'calculated_balance', v_calculated_balance,
        'discrepancy', v_stored_balance - v_calculated_balance,
        'total_earned', v_earned,
        'total_spent', v_spent
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## ℹ️ LOW PRIORITY IMPROVEMENTS

### 9. **Missing Indexes for Performance**
**Impact:** Slow queries as data grows

**Recommendation:**
```sql
-- Add composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_type ON credit_transactions(user_id, transaction_type);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_session ON credit_transactions(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_credit_allocations_user_period ON credit_allocations(user_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_client_sessions_peer_booking ON client_sessions(therapist_id, is_peer_booking, status) WHERE is_peer_booking = true;
```

### 10. **No Credit Transfer Between Users**
**Impact:** Limited flexibility

**Recommendation:**
Add ability for practitioners to gift/transfer credits to peers:
```sql
CREATE FUNCTION transfer_credits(
    p_from_user_id UUID,
    p_to_user_id UUID,
    p_amount INTEGER,
    p_note TEXT
) RETURNS JSON ...
```

---

## ✅ POSITIVE FINDINGS (What's Working Well)

1. **Row-Level Locking Implemented** ✅
   - `allocate_monthly_credits` uses `FOR UPDATE` (line 154-158)
   - `update_credit_balance` uses `FOR UPDATE` (line 63-67)
   - Prevents concurrent balance updates

2. **Balance Validation** ✅
   - CHECK constraints on `balance >= 0` (line 41)
   - Exception raised on insufficient funds (line 88-90)

3. **Comprehensive Transaction Logging** ✅
   - All credit movements recorded in `credit_transactions`
   - Includes `balance_before` and `balance_after` for audit trail

4. **Idempotency Checks** ✅
   - Webhook checks for existing allocations (stripe-webhook/index.ts:505-512)
   - Prevents duplicate credit allocation on retry

5. **RLS Policies on Core Tables** ✅
   - `credits` table has proper RLS
   - `credit_transactions` table has proper RLS
   - Users can only view their own data

6. **SECURITY DEFINER Functions** ✅
   - All RPC functions properly use `SECURITY DEFINER`
   - Appropriate permissions granted

7. **Real-Time Subscriptions** ✅
   - Frontend properly subscribes to credit updates (Credits.tsx:69-80, 83-106)
   - Immediate UI feedback on balance changes

---

## Implementation Priority

### Phase 1: CRITICAL (Do First - System Blocking)
1. ✅ Create `process_peer_booking_credits` function
2. ✅ Test peer booking flow end-to-end
3. ✅ Verify atomic transactions work correctly

### Phase 2: HIGH (Before Production)
4. ✅ Add RLS policies to `credit_allocations`
5. ✅ Add unique constraint for allocation deduplication
6. ✅ Implement credit refund function
7. ✅ Add fraud monitoring basics

### Phase 3: MEDIUM (Post-Launch Enhancement)
8. ✅ Implement credit expiration policy
9. ✅ Add balance reconciliation tool
10. ✅ Performance indexes

### Phase 4: LOW (Future Features)
11. ✅ Credit transfer between users
12. ✅ Advanced fraud detection
13. ✅ Credit purchase via Stripe

---

## Testing Recommendations

### Unit Tests Needed
- [ ] `process_peer_booking_credits` - insufficient credits
- [ ] `process_peer_booking_credits` - successful booking
- [ ] `process_peer_booking_credits` - concurrent bookings (race condition)
- [ ] `allocate_monthly_credits` - duplicate allocation prevention
- [ ] `get_practitioner_credit_cost` - edge cases (null rates, invalid practitioner)

### Integration Tests Needed
- [ ] Full peer booking flow (frontend → RPC → database)
- [ ] Monthly allocation via webhook
- [ ] Real-time balance updates in UI
- [ ] Concurrent booking attempts from same user
- [ ] Refund flow when session cancelled

### Load Tests Needed
- [ ] 100 concurrent credit allocations
- [ ] 50 concurrent peer bookings
- [ ] Query performance with 10K+ transactions

---

## Conclusion

The credit system has a **solid architectural foundation** with proper locking mechanisms and transaction handling in place. However, the **missing `process_peer_booking_credits` function is a critical blocker** that prevents the entire peer treatment feature from working.

**Once the critical and high-priority issues are addressed, the system will be production-ready.**

### Estimated Fix Time
- Critical Issues: **4-6 hours**
- High Priority: **6-8 hours**
- Medium Priority: **8-12 hours**
- Low Priority: **4-6 hours**

**Total: 1-2 days for production readiness**

---

## Appendix: Database Schema Review

### Tables Audit Status
| Table | Schema | Indexes | RLS | Constraints | Status |
|-------|--------|---------|-----|-------------|--------|
| `credits` | ✅ Good | ✅ Good | ✅ Good | ✅ Good | PASS |
| `credit_transactions` | ✅ Good | ⚠️ Missing composite | ✅ Good | ✅ Good | PARTIAL |
| `credit_allocations` | ✅ Good | ⚠️ Missing | 🔴 Missing | ⚠️ No unique constraint | FAIL |
| `credit_rates` | ✅ Good | ✅ Good | ✅ Good | ✅ Good | PASS |
| `client_sessions` (credit columns) | ✅ Good | ⚠️ Missing peer index | ✅ Good | ✅ Good | PARTIAL |

### RPC Functions Audit Status
| Function | Exists | Row Locking | Error Handling | Permissions | Status |
|----------|--------|-------------|----------------|-------------|--------|
| `get_credit_balance` | ✅ Yes | N/A (read-only) | ✅ Good | ✅ Good | PASS |
| `update_credit_balance` | ✅ Yes | ✅ FOR UPDATE | ✅ Good | ✅ Good | PASS |
| `allocate_monthly_credits` | ✅ Yes | ✅ FOR UPDATE | ✅ Good | ✅ Good | PASS |
| `get_practitioner_credit_cost` | ✅ Yes | N/A (read-only) | ✅ Good | ✅ Good | PASS |
| `process_peer_booking_credits` | 🔴 **MISSING** | N/A | N/A | N/A | **FAIL** |
| `process_peer_booking_refund` | 🔴 Missing | N/A | N/A | N/A | FAIL |
| `reconcile_credit_balance` | 🔴 Missing | N/A | N/A | N/A | FAIL |

---

**Report Generated:** October 31, 2025  
**Next Review:** After critical fixes implemented

