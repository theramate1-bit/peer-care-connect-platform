# Hybrid Product Update Stripe Payment Fix

## Summary

Hybrid practitioners were hitting a `500` from `POST /functions/v1/stripe-payment` when updating a product to support both clinic and mobile delivery.

The user-facing browser error looked like:

```text
POST https://aikqnvltuwwgifuocvto.supabase.co/functions/v1/stripe-payment 500 (Internal Server Error)
```

## Root Cause

The failure was not caused by `service_type = 'both'` itself.

Production investigation showed:

- `public.practitioner_products` allows `service_type` values `clinic`, `mobile`, and `both`
- the edge function call was failing during the product update path
- the `stripe-payment` function attempted a `PATCH` to `public.practitioner_products`
- that `PATCH` returned `400`
- the edge function wrapped that as a `500`

The fixed implementation in `supabase/functions/stripe-payment/index.ts` whitelists allowed update keys and strips request-only fields like `action` before updating the database:

```ts
const PRACTITIONER_PRODUCTS_UPDATE_KEYS = [
  "name",
  "description",
  "price_amount",
  "currency",
  "duration_minutes",
  "service_category",
  "service_type",
  "category",
  "is_active",
];

const { product_id, action: _action, ...rest } = body;
```

## Production Actions Completed

- Verified live data and constraints through Supabase
- Verified the fixed `handleUpdateProduct` logic exists in `supabase/functions/stripe-payment/index.ts`
- Redeployed `stripe-payment` to the live Supabase project `aikqnvltuwwgifuocvto`
- Confirmed the live function version advanced to `127`

## Production Verification

Confirmed after deployment:

- live function slug: `stripe-payment`
- live function version: `127`
- previous failing logs were from version `126`
- no new post-deploy `stripe-payment` `500` entries appeared in the retrieved edge-function log window

## Notes

- The local legacy CLI deploy path was blocked by Docker Desktop not being available on this machine.
- Deployment succeeded using the API-based Supabase CLI path against the same production project.
- If practitioners still report product-edit issues after this deployment, capture the exact timestamp and re-check:
  - edge-function logs for `stripe-payment`
  - API logs for `PATCH /rest/v1/practitioner_products`
  - the exact request body sent by the product edit form
