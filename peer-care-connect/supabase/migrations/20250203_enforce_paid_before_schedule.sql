-- Enforce that sessions cannot be scheduled unless payment succeeded
-- Also add an expires_at hold window for pending payments

-- Add expires_at column to client_sessions to support temporary holds
ALTER TABLE public.client_sessions
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

COMMENT ON COLUMN public.client_sessions.expires_at IS 'When a pending_payment hold expires; used to release slots if payment abandoned.';

-- Trigger function to enforce payment before scheduling and to auto-fill expires_at
CREATE OR REPLACE FUNCTION public.enforce_paid_before_schedule()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Auto-populate expires_at for pending_payment holds (default 60 minutes)
  IF NEW.status = 'pending_payment' AND NEW.expires_at IS NULL THEN
    NEW.expires_at := NOW() + INTERVAL '60 minutes';
  END IF;

  -- Prevent moving to scheduled unless there is a succeeded/completed payment
  IF NEW.status = 'scheduled' THEN
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
$$ LANGUAGE plpgsql;

-- Create trigger to run before insert/update
DROP TRIGGER IF EXISTS trg_enforce_paid_before_schedule ON public.client_sessions;
CREATE TRIGGER trg_enforce_paid_before_schedule
BEFORE INSERT OR UPDATE ON public.client_sessions
FOR EACH ROW
EXECUTE FUNCTION public.enforce_paid_before_schedule();


