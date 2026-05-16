-- Cash bookings v1 — P1: sync payment_status when a cash session is cancelled
--
-- When an in-person (pay-at-clinic) session is cancelled, flip
-- payment_status from 'awaiting_in_person' -> 'cancelled' so the row
-- accurately reflects that no payment is owed. Also stamp cancelled_at
-- if the caller didn't set it.
--
-- Trigger name starts with 's' so it fires AFTER 'block_client_payment_update'
-- alphabetically. That ordering is important: the block trigger inspects
-- NEW.payment_status vs OLD.payment_status to reject direct client edits;
-- by then the client's UPDATE has only touched `status`, so the block
-- trigger passes, and THIS trigger then mutates NEW.payment_status.

CREATE OR REPLACE FUNCTION public.trg_sync_cash_cancel_payment_status()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Only act when status is transitioning TO 'cancelled'
  IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM NEW.status THEN
    -- Only for cash / pay-at-clinic bookings that were still awaiting payment
    IF COALESCE(NEW.payment_collection, OLD.payment_collection) = 'in_person'
       AND OLD.payment_status = 'awaiting_in_person' THEN
      -- Flip payment_status to 'cancelled' (varchar column, no enum)
      NEW.payment_status := 'cancelled';
      -- Ensure cancelled_at is populated for downstream reporting
      IF NEW.cancelled_at IS NULL THEN
        NEW.cancelled_at := NOW();
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.trg_sync_cash_cancel_payment_status()
  IS 'When an in_person session transitions to cancelled, flip payment_status from awaiting_in_person to cancelled so outstanding-cash queries remain accurate.';

DROP TRIGGER IF EXISTS sync_cash_cancel_payment_status ON public.client_sessions;
CREATE TRIGGER sync_cash_cancel_payment_status
  BEFORE UPDATE ON public.client_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sync_cash_cancel_payment_status();
