# Guide: Change Monthly Credit Allocations

## Current Values
- **Practitioner Plan**: 60 credits/month → Change to **30 credits/month**
- **Pro Plan**: 120 credits/month → Change to **60 credits/month**

## Files to Update

### 1. ✅ Supabase Migration (Database)
**File**: `peer-care-connect/supabase/migrations/[timestamp]_update_monthly_credits.sql`

This migration will:
- Update existing active subscriptions
- Update the default values in the migration file

### 2. ✅ Stripe Webhook Function
**File**: `peer-care-connect/supabase/functions/stripe-webhook/index.ts`

Update the `getPlanAndCredits()` function to return new credit values.

### 3. ✅ Original Migration File (Reference)
**File**: `peer-care-connect/supabase/migrations/20250111000001_monthly_credit_allocation.sql`

Update comments and default values for future reference.

---

## Step-by-Step Instructions

### Step 1: Create New Migration

Create a new migration file to update existing subscriptions:

```sql
-- Update monthly credit allocations
-- Practitioner: 60 → 30 credits
-- Pro: 120 → 60 credits

-- Update existing active subscriptions
UPDATE public.subscriptions 
SET monthly_credits = CASE 
  WHEN plan = 'practitioner' THEN 30  -- Changed from 60
  WHEN plan = 'pro' THEN 60            -- Changed from 120
  ELSE monthly_credits
END
WHERE status IN ('active', 'trialing')
AND plan IN ('practitioner', 'pro');

-- Update comment
COMMENT ON COLUMN public.subscriptions.monthly_credits IS 'Number of credits allocated monthly: 30 for practitioner (£30), 60 for pro (£50)';
```

### Step 2: Update Stripe Webhook Function

In `peer-care-connect/supabase/functions/stripe-webhook/index.ts`, update the `getPlanAndCredits()` function:

**Change from:**
```typescript
function getPlanAndCredits(priceId: string | undefined): { plan: string; billing_cycle: string; monthly_credits: number } {
  if (!priceId) {
    return { plan: 'practitioner', billing_cycle: 'monthly', monthly_credits: 60 };
  }

  // Practitioner plans (monthly)
  if (priceId === 'price_1SGfP1Fk77knaVvan6m5IRRS' || priceId === 'price_1SGOrXFk77knaVvaCbVM0FZN') {
    return { plan: 'practitioner', billing_cycle: 'monthly', monthly_credits: 60 };
  }
  
  // Practitioner plans (yearly)
  if (priceId.includes('SL6QFFk77knaVvaRMyinzWv') && !priceId.includes('SGfPIFk77knaVvaeBxPlhJ9')) {
    return { plan: 'practitioner', billing_cycle: 'yearly', monthly_credits: 60 };
  }
  
  // Pro plans (monthly)
  if (priceId === 'price_1SGfPIFk77knaVvaeBxPlhJ9' || priceId === 'price_1SGOrgFk77knaVvatu5ksh5y') {
    return { plan: 'pro', billing_cycle: 'monthly', monthly_credits: 120 };
  }
  
  // Pro plans (yearly)
  if (priceId.includes('SL6QFFk77knaVvarSHwZKou')) {
    return { plan: 'pro', billing_cycle: 'yearly', monthly_credits: 120 };
  }

  // Default fallback
  return { plan: 'practitioner', billing_cycle: 'monthly', monthly_credits: 60 };
}
```

**Change to:**
```typescript
function getPlanAndCredits(priceId: string | undefined): { plan: string; billing_cycle: string; monthly_credits: number } {
  if (!priceId) {
    return { plan: 'practitioner', billing_cycle: 'monthly', monthly_credits: 30 }; // Changed from 60
  }

  // Practitioner plans (monthly)
  if (priceId === 'price_1SGfP1Fk77knaVvan6m5IRRS' || priceId === 'price_1SGOrXFk77knaVvaCbVM0FZN') {
    return { plan: 'practitioner', billing_cycle: 'monthly', monthly_credits: 30 }; // Changed from 60
  }
  
  // Practitioner plans (yearly)
  if (priceId.includes('SL6QFFk77knaVvaRMyinzWv') && !priceId.includes('SGfPIFk77knaVvaeBxPlhJ9')) {
    return { plan: 'practitioner', billing_cycle: 'yearly', monthly_credits: 30 }; // Changed from 60
  }
  
  // Pro plans (monthly)
  if (priceId === 'price_1SGfPIFk77knaVvaeBxPlhJ9' || priceId === 'price_1SGOrgFk77knaVvatu5ksh5y') {
    return { plan: 'pro', billing_cycle: 'monthly', monthly_credits: 60 }; // Changed from 120
  }
  
  // Pro plans (yearly)
  if (priceId.includes('SL6QFFk77knaVvarSHwZKou')) {
    return { plan: 'pro', billing_cycle: 'yearly', monthly_credits: 60 }; // Changed from 120
  }

  // Default fallback
  return { plan: 'practitioner', billing_cycle: 'monthly', monthly_credits: 30 }; // Changed from 60
}
```

### Step 3: Update Original Migration File (Optional - for reference)

In `peer-care-connect/supabase/migrations/20250111000001_monthly_credit_allocation.sql`, update lines 16-17:

**Change from:**
```sql
  WHEN plan = 'practitioner' THEN 60  -- £30/month = 60 credits (1 hour peer treatment)
  WHEN plan = 'pro' THEN 120          -- £50/month = 120 credits (2 hours peer treatment)
```

**Change to:**
```sql
  WHEN plan = 'practitioner' THEN 30  -- £30/month = 30 credits (30 min peer treatment)
  WHEN plan = 'pro' THEN 60           -- £50/month = 60 credits (1 hour peer treatment)
```

And update line 212:
```sql
COMMENT ON COLUMN public.subscriptions.monthly_credits IS 'Number of credits allocated monthly: 30 for practitioner (£30), 60 for pro (£50)';
```

---

## Impact

### Existing Subscriptions
- **Active subscriptions** will be updated immediately via migration
- **Future renewals** will use new credit amounts (from webhook function)
- **New subscriptions** will get new credit amounts

### Credit Allocation
- Practitioner plan users will receive **30 credits** instead of 60
- Pro plan users will receive **60 credits** instead of 120
- This takes effect on the **next billing cycle** for existing subscriptions
- New subscriptions get the new amounts immediately

---

## Testing Checklist

1. ✅ Run migration to update existing subscriptions
2. ✅ Deploy updated Stripe webhook function
3. ✅ Test new subscription creation (should get 30/60 credits)
4. ✅ Test subscription renewal (should get 30/60 credits)
5. ✅ Verify database values are correct
6. ✅ Check that credit allocation function works correctly

---

## Rollback Plan

If you need to rollback:

1. Revert the migration (change values back to 60/120)
2. Revert the webhook function changes
3. Run migration again to update subscriptions back

---

## Notes

- **Stripe metadata**: No changes needed in Stripe - credits are determined by code
- **Historical data**: Past credit allocations remain unchanged (in `credit_allocations` table)
- **Future allocations**: All new allocations will use the new amounts

