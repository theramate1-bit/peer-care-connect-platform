# Story 16: Fix Service Editing Edge Function Error

## Status: ✅ FIXED (Local) - Needs Deployment

### Problem Identified
The `handleUpdateProduct` function in `stripe-payment` edge function was trying to update the database with all fields from the request body, including:
- Fields that don't exist in the database
- Read-only fields (like `id`, `created_at`, `stripe_product_id`)
- Invalid field names

### Solution Implemented

#### Changes Made to `handleUpdateProduct`:

1. **Field Filtering**: Only allow specific database fields to be updated
   ```typescript
   const allowedFields = ['name', 'description', 'price_amount', 'duration_minutes', 'service_category', 'category', 'service_type', 'is_active'];
   ```

2. **Better Validation**:
   - Check if `product_id` is provided
   - Verify product exists before updating
   - Check user permissions more explicitly

3. **Improved Error Handling**:
   - More descriptive error messages
   - Better error logging
   - Proper error responses with details

4. **Stripe Integration**:
   - Handle Stripe product updates separately
   - Continue with DB update even if Stripe update fails (with logging)
   - Note about price updates requiring new price creation

### Code Changes

**File**: `peer-care-connect/supabase/functions/stripe-payment/index.ts`

**Key Fix** (Line ~2171):
```typescript
// OLD (Problematic):
const { data: product, error: dbError } = await supabase
  .from('practitioner_products')
  .update(updates)  // ❌ Updates with ALL fields, including invalid ones
  .eq('id', product_id)
  .select()
  .single();

// NEW (Fixed):
// Filter and map updates to only include allowed database fields
const allowedFields = ['name', 'description', 'price_amount', 'duration_minutes', 'service_category', 'category', 'service_type', 'is_active'];
const dbUpdates: Record<string, any> = {
  updated_at: new Date().toISOString()
};

// Only include fields that are allowed and provided
for (const field of allowedFields) {
  if (updates[field] !== undefined) {
    dbUpdates[field] = updates[field];
  }
}

const { data: product, error: dbError } = await supabase
  .from('practitioner_products')
  .update(dbUpdates)  // ✅ Only updates allowed fields
  .eq('id', product_id)
  .select()
  .single();
```

### Testing Required

1. **Test Product Update**:
   - [ ] Update product name
   - [ ] Update product description
   - [ ] Update product price
   - [ ] Update product duration
   - [ ] Update service category
   - [ ] Update service type

2. **Test Error Cases**:
   - [ ] Invalid product_id
   - [ ] Unauthorized user
   - [ ] Missing Stripe Connect account
   - [ ] Invalid field values

3. **Test Edge Cases**:
   - [ ] Update with partial fields
   - [ ] Update with null values
   - [ ] Update with empty strings

### Deployment Steps

1. **Deploy Edge Function**:
   ```bash
   # Using Supabase CLI
   supabase functions deploy stripe-payment
   
   # Or using MCP (if file size allows)
   # The function needs to be deployed via Supabase dashboard or CLI
   ```

2. **Verify Deployment**:
   - Check edge function logs
   - Test product update via UI
   - Verify no errors in console

### Next Steps

1. ✅ Code fix completed locally
2. ⏳ Deploy edge function to Supabase
3. ⏳ Test in production environment
4. ⏳ Verify all product update scenarios work

### Related Files

- `peer-care-connect/supabase/functions/stripe-payment/index.ts` - Edge function
- `peer-care-connect/src/lib/stripe-products.ts` - Frontend service
- `peer-care-connect/src/components/practitioner/ProductForm.tsx` - UI component

---

**Note**: The edge function file is large (~2849 lines). Deployment may require using Supabase CLI or dashboard due to file size limitations in MCP.
