# Stripe / Database Reconciliation

**Date:** March 2025  
**Status:** 📋 Operational Runbook  
**Scope:** Payment succeeded in Stripe but DB update failed (guest charged, no confirmed session)

---

## Overview

When a guest completes Stripe checkout, the webhook (`stripe-webhook`) receives `checkout.session.completed` and:

1. Updates `payments` (if applicable)
2. Updates `client_sessions` → `status: 'confirmed'`, `payment_status: 'completed'`
3. Sends confirmation emails

If step 2 or 3 fails (DB error, timeout, etc.), the guest has paid but sees no confirmed booking.

---

## Identifying Orphaned Charges

### 1. Stripe Dashboard

- **Payments**: Look for successful payments with `metadata.session_id` but no matching confirmed session.
- **Webhook logs**: Check `stripe-webhook` for failed/retried events (Supabase Edge Functions logs).

### 2. SQL Queries (Supabase)

**Sessions paid in Stripe but not confirmed in DB:**

```sql
-- Payments with checkout_session_id that have no confirmed client_session
-- (Run in Supabase SQL editor with access to stripe/payments data)
SELECT p.id, p.checkout_session_id, p.client_email, p.amount, p.created_at
FROM payments p
WHERE p.status = 'succeeded'
  AND p.checkout_session_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM client_sessions cs
    WHERE cs.stripe_session_id = p.checkout_session_id
      AND cs.status = 'confirmed'
  );
```

**Sessions with `pending_payment` and a Stripe PaymentIntent that succeeded:**

```sql
-- Client sessions still pending_payment but Stripe shows paid
SELECT cs.id, cs.client_email, cs.session_date, cs.start_time, cs.stripe_payment_intent_id, cs.status
FROM client_sessions cs
WHERE cs.status IN ('pending_payment', 'scheduled')
  AND cs.stripe_payment_intent_id IS NOT NULL
  AND cs.expires_at IS NULL;  -- Or expired but payment may have completed
```

---

## Manual Reconciliation Steps

1. **Verify in Stripe**: Confirm the PaymentIntent/Checkout Session shows `succeeded`.
2. **Update session**:
   ```sql
   UPDATE client_sessions
   SET status = 'confirmed', payment_status = 'completed', expires_at = NULL
   WHERE id = '<session_id>';
   ```
3. **Send confirmation email** (if missed): Use NotificationSystem or send-email edge function with `booking_confirmed` template.
4. **Refund (if appropriate)**: If session is past or cannot be honoured, process refund via Stripe Dashboard or `stripe.refunds.create`.

---

## Monitoring Recommendations

1. **Webhook failure alerts**: Monitor Supabase Edge Function logs for `stripe-webhook` 5xx or unhandled errors. Set up alerts (e.g. PagerDuty, Slack) on repeated failures.
2. **Daily reconciliation job** (optional): Cron that compares Stripe successful payments with `client_sessions` and flags mismatches. Store results in a `reconciliation_alerts` table or send to ops email.
3. **Idempotent retries**: Stripe retries webhooks. Ensure webhook handler is idempotent (updating `status = 'confirmed'` twice is safe).

---

## Related

- [EDGE_CASES_OPEN.md](./EDGE_CASES_OPEN.md) – Stripe success / DB fail edge case
- Stripe webhook: `supabase/functions/stripe-webhook/index.ts`
- Session confirmation: `checkout.session.completed` case, lines ~476–513
