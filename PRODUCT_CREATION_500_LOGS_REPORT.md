# Product creation 500 – Supabase logs and cause

**Date:** 2026-01-27  
**Error in UI:** "Edge Function returned a non-2xx status code" when creating a product (e.g. "60 Min sports massage", £1.00, 60 min).

---

## What the Supabase logs show

Edge Function logs for project **aikqnvltuwwgifuocvto** (last 24h):

| Time (recent) | Function         | Method | Status | URL |
|----------------|------------------|--------|--------|-----|
| Multiple       | **stripe-payment** | POST   | **500** | `.../functions/v1/stripe-payment` |

- **stripe-payment** is the function used for product creation.
- Recent calls are returning **500** (and have been for several attempts).
- Log entries do **not** include the response body or `console.error` output, so the exact error message is not in the log list you get from the API.

So: the failure is confirmed in Supabase as a **500 from stripe-payment** during product creation; the **root-cause text** is not in these high-level logs.

---

## How product creation works

1. **Client**  
   `ProductForm` → `createPractitionerProduct()` in `src/lib/stripe-products.ts` → `supabase.functions.invoke('stripe-payment', { body: { action: 'create-product', ... } })`.

2. **Edge Function**  
   `supabase/functions/stripe-payment/index.ts` → `handleCreateProduct()`:
   - Checks auth and that `practitioner_id` matches the user.
   - Loads practitioner’s `stripe_connect_account_id` from `users`.
   - If missing → returns **400** (“Practitioner not connected to Stripe”).
   - Calls Stripe:
     - `stripe.products.create(...)` on the Connect account
     - `stripe.prices.create(...)` with `unit_amount: price_amount` (pence), `currency: 'gbp'`
   - Inserts into `practitioner_products`.
   - On any thrown error or DB error → returns **500** with `{ error: error.message }`.

So a **500** means either a **Stripe API error** or a **DB error** (or an unexpected throw). It does **not** mean “no Connect account” (that would be 400).

---

## Most likely causes of the 500

1. **Stripe API error**
   - Connect account not fully onboarded or restricted.
   - Invalid or unsupported parameters for `products.create` / `prices.create` (e.g. account not allowed to create products yet).
   - Stripe API key or Connect account misconfiguration.

2. **Database error**
   - Insert into `practitioner_products` failing (RLS, constraint, missing column, or type mismatch).

3. **Environment**
   - Missing or wrong `STRIPE_SECRET_KEY` in the Edge Function env (would usually fail earlier with a clear “Missing Stripe key” style response, but worth confirming).

---

## How to get the actual error message

The Supabase log list does not include the body of the 500 response or the function’s `console.error`. To see the real error:

1. **Supabase Dashboard (best for Edge Function detail)**  
   - Project → **Edge Functions** → **stripe-payment** → **Logs**.  
   - Look for the **POST** request that returns 500 and open it.  
   - Check the log line for `[CREATE-PRODUCT] Error:` – that should show the thrown error or Stripe/DB message.

2. **Stripe Dashboard**  
   - **Developers** → **Logs**.  
   - Filter by time of the failed product creation.  
   - Look for failed `products.create` or `prices.create` on the Connect account; the error message there will tell you if the cause is Stripe (e.g. account capability, parameter validation).

3. **Optional: show backend error in the UI**  
   - When the Edge Function returns 500, it sends a JSON body like `{ error: "...", details?: "..." }`.  
   - In `src/lib/stripe-products.ts`, when `supabase.functions.invoke` returns with a non-2xx status, read the parsed body (e.g. `data?.error` or the fetch response body) and pass it to the UI (e.g. `result.error = data?.error || error.message`).  
   - Then the toast can show the real message instead of the generic “Edge Function returned a non-2xx status code”.

---

## Quick checks you can do

1. **Connect onboarding**  
   - In your app, confirm the practitioner has completed Stripe Connect onboarding and has a Connect account id stored in `users.stripe_connect_account_id`.  
   - If they haven’t, product creation will fail (often with a 400; if something else throws, it can still be 500).

2. **Stripe Dashboard – Connect account**  
   - **Connect** → **Accounts** → open the practitioner’s account.  
   - Confirm it’s fully onboarded and has no restrictions that would block creating products/prices.

3. **Price amount**  
   - Form sends **pence** (e.g. £1.00 → `price_amount: 100`).  
   - Stripe’s minimum for GBP is low (e.g. 30 pence); 100 pence is valid. So the 500 is unlikely to be “amount too low” unless something is sending the wrong unit.

---

## Summary

- **Supabase logs** confirm that **stripe-payment** is returning **500** on POST during product creation; they do **not** contain the exact error text.
- The failure happens inside **handleCreateProduct** (Stripe API and/or DB insert).
- To find the exact cause: use **Supabase Edge Function logs** for `stripe-payment` and **Stripe API logs**, and optionally surface the Edge Function’s `error` field in the UI so the next time it happens you see the real message instead of “Edge Function returned a non-2xx status code”.
