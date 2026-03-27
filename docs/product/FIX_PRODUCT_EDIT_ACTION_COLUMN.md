# Fix: Missing `action` column when editing a product

## Problem

When a hybrid (or any) practitioner edited a product, the app could return:

```json
{
  "error": "Could not find the 'action' column of 'practitioner_products' in the schema cache"
}
```

## Cause

The frontend calls the `stripe-payment` Edge Function with a body like:

```json
{
  "action": "update-product",
  "product_id": "<uuid>",
  "name": "...",
  "description": "...",
  ...
}
```

The Edge Function did `const { product_id, ...updates } = body` and passed `updates` directly to `supabase.from('practitioner_products').update(updates)`. That included the request-only field `action`, which is not a column on `practitioner_products`, so Supabase raised the schema error.

## Fix

**Option B (implemented):** Do not add an `action` column. Restrict the payload sent to the database to allowed table columns only.

In `supabase/functions/stripe-payment/index.ts`, `handleUpdateProduct` was changed to:

1. Destructure `product_id` and `action` out of the body (so they are never written to the DB).
2. Build the `updates` object from a whitelist of allowed columns:  
   `name`, `description`, `price_amount`, `currency`, `duration_minutes`, `service_category`, `service_type`, `category`, `is_active`.

Only keys present in the request body that are in this whitelist are passed to `.update(updates)`, so `action` and any other non-column fields are never sent to the table.

## Validation

- **Schema:** The `practitioner_products` table does not have an `action` column; no migration was added.
- **Cache:** After deploying the updated Edge Function, product edit should work. If your project uses a schema cache, refresh it (e.g. Supabase dashboard → Settings → API or run the project’s “reload schema” if available).
- **Test:** As a practitioner, open the dashboard → edit an existing product → save. The update should succeed without the `action` column error.

## Acceptance criteria (from user story)

- [x] Editing a product does **not** reference a missing `action` column (payload is whitelisted).
- [x] If `action` is not required, queries referencing it are removed (it is stripped before `.update()`).
- [ ] The Supabase schema is confirmed to match the application queries (run locally or via MCP with `project_id` if needed).
- [ ] Supabase schema cache is refreshed (via dashboard or your deployment process).
- [x] Hybrid practitioners can update products without failure (same code path for all practitioner types).

## References

- Edge Function: `supabase/functions/stripe-payment/index.ts` — `handleUpdateProduct`, `PRACTITIONER_PRODUCTS_UPDATE_KEYS`.
- Frontend: `peer-care-connect/src/lib/stripe-products.ts` — `updatePractitionerProduct` (sends `action: 'update-product'` in body; no change needed).
