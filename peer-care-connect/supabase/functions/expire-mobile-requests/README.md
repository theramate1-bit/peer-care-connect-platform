# expire-mobile-requests

Expires pending mobile booking requests past `expires_at`: cancels Stripe PaymentIntent when payment is held, updates DB to `status=expired` and `payment_status=released`, and creates an in-app notification for the client.

**Schedule:** Run every 15 minutes (e.g. Supabase Dashboard > Edge Functions > expire-mobile-requests > Schedule with cron `*/15 * * * *`, or use an external cron that POSTs to the function URL).

**Env:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (set automatically); `STRIPE_SECRET_KEY` (required to release holds).
