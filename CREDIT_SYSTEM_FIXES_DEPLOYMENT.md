# Credit System Fixes - Deployment Guide

## Overview
This guide covers deploying the critical and high-priority fixes identified in the CTO audit.

## Migrations Created

### 🔴 CRITICAL
1. **20250201_create_process_peer_booking_credits.sql** - Creates the missing RPC function for peer bookings
   - Status: ✅ Created
   - Priority: CRITICAL
   - Impact: Unblocks all peer treatment bookings

### 🔴 HIGH PRIORITY
2. **20250201_add_credit_allocations_rls.sql** - Adds RLS policies to credit_allocations
   - Status: ✅ Created
   - Priority: HIGH
   - Impact: Security - prevents unauthorized access

3. **20250201_add_allocation_unique_constraint.sql** - Prevents duplicate allocations
   - Status: ✅ Created
   - Priority: HIGH
   - Impact: Data integrity - prevents race conditions

4. **20250201_add_peer_booking_refund.sql** - Handles session cancellation refunds
   - Status: ✅ Created
   - Priority: HIGH
   - Impact: Business logic - enables cancellation handling

### ⚠️ MEDIUM PRIORITY
5. **20250201_add_performance_indexes.sql** - Optimizes query performance
   - Status: ✅ Created
   - Priority: MEDIUM
   - Impact: Performance - faster queries as data grows

6. **20250201_add_balance_reconciliation.sql** - Diagnostic tool for balance verification
   - Status: ✅ Created
   - Priority: MEDIUM
   - Impact: Maintenance - helps debug balance issues

---

## Deployment Steps

### Step 1: Verify Current Database State
```bash
cd peer-care-connect
npx supabase db pull
```

### Step 2: Apply Migrations to Remote Database
```bash
# Apply all new migrations
npx supabase db push

# Or apply individually in order:
npx supabase db push --file supabase/migrations/20250201_create_process_peer_booking_credits.sql
npx supabase db push --file supabase/migrations/20250201_add_credit_allocations_rls.sql
npx supabase db push --file supabase/migrations/20250201_add_allocation_unique_constraint.sql
npx supabase db push --file supabase/migrations/20250201_add_peer_booking_refund.sql
npx supabase db push --file supabase/migrations/20250201_add_performance_indexes.sql
npx supabase db push --file supabase/migrations/20250201_add_balance_reconciliation.sql
```

### Step 3: Verify Deployment
```sql
-- Check if process_peer_booking_credits exists
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name = 'process_peer_booking_credits';

-- Check if RLS is enabled on credit_allocations
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'credit_allocations';

-- Check if unique constraint exists
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'credit_allocations' 
AND constraint_name = 'unique_subscription_period';

-- Check if refund function exists
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'process_peer_booking_refund';

-- Check indexes
SELECT indexname 
FROM pg_indexes 
WHERE tablename IN ('credit_transactions', 'credit_allocations', 'client_sessions')
AND indexname LIKE 'idx_credit%' OR indexname LIKE 'idx_client_sessions_peer%';
```

### Step 4: Test Critical Function
```sql
-- Test process_peer_booking_credits (use real user IDs from your database)
SELECT process_peer_booking_credits(
    'client-uuid-here'::UUID,
    'practitioner-uuid-here'::UUID,
    'session-uuid-here'::UUID,
    60
);
```

---

## Rollback Plan

If any migration fails or causes issues:

```bash
# Rollback process_peer_booking_credits
DROP FUNCTION IF EXISTS process_peer_booking_credits(UUID, UUID, UUID, INTEGER);

# Rollback credit_allocations RLS
ALTER TABLE credit_allocations DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own credit allocations" ON credit_allocations;
DROP POLICY IF EXISTS "Service role can manage credit allocations" ON credit_allocations;

# Rollback unique constraint
ALTER TABLE credit_allocations DROP CONSTRAINT IF EXISTS unique_subscription_period;

# Rollback refund function
DROP FUNCTION IF EXISTS process_peer_booking_refund(UUID, TEXT);

# Rollback indexes (optional - indexes don't break functionality)
DROP INDEX IF EXISTS idx_credit_transactions_user_type;
DROP INDEX IF EXISTS idx_credit_transactions_session;
DROP INDEX IF EXISTS idx_credit_allocations_user_period;
DROP INDEX IF EXISTS idx_credit_allocations_subscription;
DROP INDEX IF EXISTS idx_client_sessions_peer_booking;
DROP INDEX IF EXISTS idx_client_sessions_peer_client;
DROP INDEX IF EXISTS idx_credit_transactions_user_date;

# Rollback reconciliation function
DROP FUNCTION IF EXISTS reconcile_credit_balance(UUID);
```

---

## Testing Checklist

After deployment, test the following:

### Critical Tests
- [ ] Peer treatment booking with sufficient credits (should succeed)
- [ ] Peer treatment booking with insufficient credits (should fail gracefully)
- [ ] Concurrent booking attempts (test race condition prevention)
- [ ] Credit balance updates in real-time after booking
- [ ] Transaction history shows correct entries

### High Priority Tests
- [ ] Monthly credit allocation (test idempotency - run twice, should allocate once)
- [ ] Session cancellation and refund flow
- [ ] Verify RLS policies (users can only see their own allocations)

### Medium Priority Tests
- [ ] Query performance (check execution time for large transaction history)
- [ ] Balance reconciliation (run for test users, verify accuracy)

---

## Monitoring

After deployment, monitor for:

1. **Error Rate**: Check Supabase logs for RPC function errors
2. **Performance**: Monitor query execution times
3. **Balance Discrepancies**: Run reconciliation function for active users
4. **Allocation Duplicates**: Query for duplicate allocations (should be 0)

```sql
-- Check for allocation duplicates (should return 0 rows)
SELECT subscription_id, period_start, period_end, COUNT(*) 
FROM credit_allocations 
GROUP BY subscription_id, period_start, period_end 
HAVING COUNT(*) > 1;

-- Check for balance discrepancies
SELECT user_id, 
       balance, 
       (SELECT SUM(CASE 
           WHEN transaction_type IN ('session_earning', 'bonus', 'refund') THEN amount 
           ELSE -amount 
       END) 
       FROM credit_transactions ct 
       WHERE ct.user_id = c.user_id) as calculated_balance
FROM credits c
WHERE balance != (SELECT COALESCE(SUM(CASE 
                      WHEN transaction_type IN ('session_earning', 'bonus', 'refund') THEN amount 
                      ELSE -amount 
                  END), 0)
                  FROM credit_transactions ct 
                  WHERE ct.user_id = c.user_id);
```

---

## Post-Deployment Actions

1. ✅ Update frontend error handling (already handles JSON response from RPC)
2. ✅ Add cancellation UI for peer treatment sessions
3. ✅ Add balance reconciliation to admin panel (future)
4. ✅ Set up monitoring alerts for credit discrepancies (future)
5. ✅ Document refund policy for users (future)

---

## Support

If issues arise:

1. Check Supabase logs in Dashboard → Database → Logs
2. Review audit report: `CREDIT_SYSTEM_AUDIT_REPORT.md`
3. Run balance reconciliation for affected users
4. Check for error patterns in `credit_transactions` table

---

## Estimated Deployment Time

- Migration deployment: **5-10 minutes**
- Testing: **20-30 minutes**
- Monitoring setup: **10 minutes**

**Total: ~45 minutes**

---

## Success Criteria

✅ All migrations applied successfully  
✅ `process_peer_booking_credits` function works  
✅ Peer treatment bookings complete end-to-end  
✅ No duplicate credit allocations  
✅ RLS policies prevent unauthorized access  
✅ Performance indexes improve query speed  
✅ Balance reconciliation shows no discrepancies

