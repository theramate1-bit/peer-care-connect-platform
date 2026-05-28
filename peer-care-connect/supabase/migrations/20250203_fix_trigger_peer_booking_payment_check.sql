-- Fix trigger to skip payment check for peer bookings
-- Peer bookings use credits, not Stripe payments, so they don't have payment records
-- This allows process_peer_booking_credits to update credit_cost without triggering payment validation

CREATE OR REPLACE FUNCTION enforce_paid_before_schedule()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Auto-populate expires_at for pending_payment holds (default 60 minutes)
  IF NEW.status = 'pending_payment' AND NEW.expires_at IS NULL THEN
    NEW.expires_at := NOW() + INTERVAL '60 minutes';
  END IF;

  -- Prevent moving to scheduled unless there is a succeeded/completed payment
  -- EXCEPTION: Skip this check for peer bookings (is_peer_booking = true)
  -- Peer bookings use credits instead of Stripe payments
  IF NEW.status = 'scheduled' AND (NEW.is_peer_booking IS NULL OR NEW.is_peer_booking = false) THEN
    -- When inserting, NEW.id may not yet be visible; defer check on insert using NEW.session_date/start_time/therapist_id if needed
    -- Prefer session ID based check when available (on updates), otherwise allow insert and rely on webhook to update to scheduled
    -- To protect updates explicitly changing to scheduled:
    IF TG_OP = 'UPDATE' THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.payments p
        WHERE p.session_id = NEW.id
          AND p.payment_status IN ('succeeded','completed')
      ) THEN
        RAISE EXCEPTION 'Cannot set session to scheduled without a successful payment'
          USING ERRCODE = '23514';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Update comment
COMMENT ON FUNCTION enforce_paid_before_schedule IS 
'Trigger function that enforces payment validation before scheduling sessions. Skips payment check for peer bookings (is_peer_booking = true) since they use credits instead of Stripe payments.';

