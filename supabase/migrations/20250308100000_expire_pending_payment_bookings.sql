-- Mark pending_payment bookings as expired when expires_at has passed.
-- Call from app (lazy expiry) or schedule with pg_cron so practitioner views never show them as confirmed.

CREATE OR REPLACE FUNCTION public.expire_pending_payment_bookings()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated integer;
BEGIN
  WITH updated AS (
    UPDATE public.client_sessions
    SET
      status = 'expired',
      payment_status = 'released',
      updated_at = NOW()
    WHERE status = 'pending_payment'
      AND expires_at IS NOT NULL
      AND expires_at < NOW()
    RETURNING id
  )
  SELECT COUNT(*)::integer INTO v_updated FROM updated;
  RETURN v_updated;
END;
$$;

COMMENT ON FUNCTION public.expire_pending_payment_bookings() IS
  'Marks client_sessions as expired when pending_payment and expires_at has passed. Call from app or cron so unconfirmed bookings do not appear in practitioner views.';

GRANT EXECUTE ON FUNCTION public.expire_pending_payment_bookings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.expire_pending_payment_bookings() TO service_role;
