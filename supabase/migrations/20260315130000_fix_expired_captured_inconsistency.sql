-- Fix data inconsistency: expired requests should not have payment_status = 'captured'.
-- One row (d37ebc04) was expired but payment_status stayed captured; no session was created.
-- Set to 'released' for DB consistency. Stripe reconciliation may be needed separately.
UPDATE public.mobile_booking_requests
SET payment_status = 'released', updated_at = NOW()
WHERE status = 'expired' AND payment_status = 'captured';
