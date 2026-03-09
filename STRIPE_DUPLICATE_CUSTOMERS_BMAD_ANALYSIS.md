# Stripe Duplicate Customers Analysis - BMAD-METHOD

**Date**: 2025-02-03  
**Method**: BMAD-METHOD Systematic Analysis  
**Issue**: Multiple duplicate Stripe customers for the same therapists/users  
**Status**: 🔍 **ROOT CAUSE IDENTIFIED**

---

## Executive Summary

Using BMAD-METHOD analysis, I've identified **3 critical issues** causing duplicate Stripe customer creation:

1. **`create-session-payment` function** doesn't create customers in database
2. **Guest booking flow** may create customers without proper deduplication
3. **No centralized customer lookup/creation logic** across multiple functions

---

## Root Cause Analysis

### 🔴 **CRITICAL ISSUE #1: `create-session-payment` Function**

**Location**: `supabase/functions/create-session-payment/index.ts` lines 57-72

**Problem**:
```typescript
// Check if customer exists
const customers = await stripe.customers.list({ email: user.email, limit: 1 });
let customerId;
if (customers.data.length > 0) {
  customerId = customers.data[0].id;
  logStep("Found existing customer", { customerId });
}
// ❌ NO ELSE CLAUSE - If customer not found, doesn't create one!

// Later in checkout session:
customer: customerId,  // May be undefined
customer_email: customerId ? undefined : user.email,  // ❌ Stripe auto-creates customer
```

**Impact**: 
- When `customerId` is undefined, Stripe automatically creates a new customer
- This new customer is **NOT saved** to the `customers` table in Supabase
- Next booking: Still no customer in DB → Stripe creates another → **DUPLICATE**

**Evidence from Image**:
- Multiple rows with same email (e.g., `nra.sportstherapy@gmail.com` appears 4 times)
- Same user appears multiple times with different customer IDs
- All have £0.00 spend (newly created, not used)

---

### 🔴 **CRITICAL ISSUE #2: Inconsistent Customer Creation Logic**

**Location**: Multiple functions create customers differently:

1. **`create-checkout/index.ts`** (✅ CORRECT):
   - Checks `customers` table first
   - Creates customer if not found
   - Saves to `customers` table
   - Updates metadata

2. **`create-session-payment/index.ts`** (❌ INCORRECT):
   - Only searches Stripe by email
   - Doesn't check `customers` table
   - Doesn't create customer in DB if missing
   - Relies on Stripe auto-creation

3. **`stripeService.ts`** (⚠️ INCOMPLETE):
   - Creates customer in Stripe
   - Doesn't save to `customers` table
   - No deduplication check

**Impact**: Different code paths create customers differently, leading to duplicates

---

### 🟡 **HIGH PRIORITY ISSUE #3: Guest Booking Flow**

**Location**: Guest booking flow may create customers without proper checks

**Problem**: 
- Guest users may create Stripe customers during checkout
- These customers may not be properly linked to user accounts
- When guest converts to registered user, may create another customer

**Impact**: Guest bookings create orphaned customers that become duplicates

---

## Detailed Code Analysis

### Issue #1: `create-session-payment/index.ts`

**Current Code (Lines 57-72)**:
```typescript
// Check if customer exists
const customers = await stripe.customers.list({ email: user.email, limit: 1 });
let customerId;
if (customers.data.length > 0) {
  customerId = customers.data[0].id;
  logStep("Found existing customer", { customerId });
}
// ❌ MISSING: else clause to create customer and save to DB

// Create payment session
const session = await stripe.checkout.sessions.create({
  customer: customerId,  // May be undefined
  customer_email: customerId ? undefined : user.email,  // ❌ Auto-creates customer
  // ...
});
```

**What Should Happen**:
```typescript
// 1. Check customers table first (source of truth)
const { data: existingCustomer } = await supabaseClient
  .from("customers")
  .select("stripe_customer_id")
  .eq("user_id", user.id)
  .single();

let customerId: string;

if (existingCustomer) {
  customerId = existingCustomer.stripe_customer_id;
} else {
  // 2. Check Stripe for existing customer by email
  const customers = await stripe.customers.list({ email: user.email, limit: 1 });
  
  if (customers.data.length > 0) {
    // 3. Found in Stripe but not in DB - save it
    customerId = customers.data[0].id;
    await supabaseClient.from("customers").insert({
      user_id: user.id,
      stripe_customer_id: customerId,
      email: user.email,
    });
  } else {
    // 4. Create new customer
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { 
        supabase_user_id: user.id,
        user_id: user.id
      },
    });
    customerId = customer.id;
    await supabaseClient.from("customers").insert({
      user_id: user.id,
      stripe_customer_id: customer.id,
      email: user.email,
    });
  }
}
```

---

## Impact Assessment

### Current State (From Image):
- **16 visible customer rows**
- **Multiple duplicates**:
  - `nra.sportstherapy@gmail.com`: 4 duplicates
  - `admin@pinpointtherapyuk.com`: 4 duplicates
  - `hanrywall111@gmail.com`: 2 duplicates
- **All duplicates have £0.00 spend** (newly created, unused)
- **Inconsistent data**: Some rows show email in "Customer" column, some show name

### Business Impact:
1. **Data Quality**: Poor customer data integrity
2. **Reporting**: Inaccurate customer counts and analytics
3. **Billing**: Potential issues with subscription management
4. **User Experience**: Confusion when viewing customer list
5. **Cost**: Unnecessary Stripe API calls

---

## Recommended Fixes

### Phase 1: Critical Fixes (Immediate)

#### Fix #1: Update `create-session-payment/index.ts`
**Priority**: P0 - Critical  
**Effort**: 1 hour  
**Impact**: Prevents new duplicates

**Changes**:
1. Check `customers` table first (source of truth)
2. If not found in DB, check Stripe
3. If found in Stripe but not DB, save to DB
4. If not found anywhere, create new customer and save to DB
5. Always use `customer` parameter (never `customer_email`)

#### Fix #2: Add Customer Deduplication Script
**Priority**: P0 - Critical  
**Effort**: 2 hours  
**Impact**: Cleans up existing duplicates

**Script Logic**:
1. Query all customers from Stripe
2. Group by email address
3. For each email with duplicates:
   - Keep the oldest customer (first created)
   - Merge metadata from duplicates
   - Update all related records (payments, subscriptions) to use primary customer
   - Delete duplicate customers in Stripe
   - Update `customers` table to point to primary customer

#### Fix #3: Centralize Customer Creation Logic
**Priority**: P1 - High  
**Effort**: 3 hours  
**Impact**: Prevents future duplicates

**Create**: `supabase/functions/get-or-create-customer/index.ts`
- Single source of truth for customer creation
- Used by all payment functions
- Ensures consistency

### Phase 2: Prevention (Week 2)

#### Fix #4: Add Database Constraints
**Priority**: P1 - High  
**Effort**: 1 hour

**Add**:
- Unique constraint on `customers.user_id`
- Unique constraint on `customers.stripe_customer_id`
- Index on `customers.email` for faster lookups

#### Fix #5: Add Monitoring/Alerting
**Priority**: P2 - Medium  
**Effort**: 2 hours

**Add**:
- Webhook to detect duplicate customer creation
- Alert when same email creates multiple customers
- Dashboard to show duplicate customers

---

## Implementation Plan

### Step 1: Fix `create-session-payment` Function
1. Update function to check `customers` table first
2. Implement proper customer creation logic
3. Test with existing users
4. Test with new users

### Step 2: Create Deduplication Script
1. Write script to identify duplicates
2. Test on staging environment
3. Run on production (with backup)
4. Verify results

### Step 3: Update Other Functions
1. Update `stripeService.ts` to use centralized logic
2. Update guest booking flow
3. Update webhook handlers

### Step 4: Add Monitoring
1. Set up duplicate detection
2. Create alerts
3. Document process

---

## Testing Checklist

- [ ] `create-session-payment` creates customer in DB
- [ ] `create-session-payment` reuses existing customer
- [ ] Guest booking creates customer correctly
- [ ] Deduplication script merges customers correctly
- [ ] No new duplicates created after fix
- [ ] Existing duplicates cleaned up
- [ ] All payment flows work correctly

---

## Acceptance Criteria

1. ✅ No new duplicate customers created
2. ✅ Existing duplicates merged/cleaned up
3. ✅ All payment flows use consistent customer creation
4. ✅ Customer data integrity maintained
5. ✅ No data loss during deduplication

---

## Next Steps

1. **Immediate**: Fix `create-session-payment` function
2. **This Week**: Create and run deduplication script
3. **Next Week**: Centralize customer creation logic
4. **Ongoing**: Monitor for new duplicates

---

**Status**: Ready for implementation
