-- Enforce the 24h cancellation window server-side.
--
-- Problem: the `BOOKING_CONFIG.CANCELLATION_WINDOW_HOURS = 24` policy is
-- declared in app constants only. Clients with a valid RLS grant could run
-- `UPDATE client_sessions SET status='cancelled' ...` at 23:59 on the day of
-- the session and the platform would honour it, which undermines
-- late-cancellation charging and practitioner scheduling.
--
-- This migration:
--  1. Adds a BEFORE UPDATE trigger on public.client_sessions that rejects
--     transitions to `status = 'cancelled'` within 24h of the session start
--     when the caller is the CLIENT (auth.uid() = client_id). Practitioners
--     (auth.uid() = therapist_id) and the service role can always cancel.
--  2. Adds a SECURITY DEFINER RPC `cancel_client_session` that returns a
--     structured result so mobile/web can render a clean "too late to
--     cancel" message without parsing raw error strings.
--
-- The 24h threshold matches BOOKING_CONFIG.CANCELLATION_WINDOW_HOURS. If you
-- change the app constant, update the `v_cutoff_hours` value below so the
-- two stay aligned.

CREATE OR REPLACE FUNCTION public.trg_enforce_client_cancellation_window()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_cutoff_hours CONSTANT int := 24;
  v_session_start timestamptz;
  v_hours_until numeric;
  v_caller uuid;
BEGIN
  -- Only care about transitions TO 'cancelled' from an active state.
  IF NEW.status IS DISTINCT FROM 'cancelled' THEN
    RETURN NEW;
  END IF;
  IF OLD.status = 'cancelled' THEN
    RETURN NEW;
  END IF;
  -- Already in a terminal non-active state: let other triggers decide.
  IF OLD.status IN ('completed', 'no_show') THEN
    RETURN NEW;
  END IF;

  v_caller := auth.uid();

  -- Service role / admin paths have no auth.uid(); never block them. The
  -- practitioner who owns the session can always cancel (they are expected
  -- to cancel with notice and refund out-of-band).
  IF v_caller IS NULL OR v_caller = OLD.therapist_id THEN
    RETURN NEW;
  END IF;

  -- Only clients face the window. If some other row is updating (e.g. admin
  -- support tooling running as an authenticated non-client non-therapist),
  -- let existing RLS/authorization handle it; don't add a second check here.
  IF v_caller IS DISTINCT FROM OLD.client_id THEN
    RETURN NEW;
  END IF;

  -- Compose the session start as a timestamptz in the booking's timezone so
  -- clients crossing midnight in other zones still get the right window.
  v_session_start :=
    ((OLD.session_date::text || ' ' || COALESCE(OLD.start_time, '00:00:00')::text)::timestamp)
    AT TIME ZONE COALESCE(NULLIF(OLD.session_timezone, ''), 'Europe/London');

  v_hours_until := EXTRACT(EPOCH FROM (v_session_start - NOW())) / 3600.0;

  IF v_hours_until < v_cutoff_hours THEN
    RAISE EXCEPTION
      'Cancellation window closed: clients must cancel at least % hours before the session (session starts in % hours).',
      v_cutoff_hours,
      ROUND(v_hours_until, 1)
      USING ERRCODE = 'P0001',
            HINT = 'Contact the practitioner to request a late cancellation.';
  END IF;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.trg_enforce_client_cancellation_window()
  IS 'Rejects client-initiated transitions to status=cancelled when the session starts within 24 hours. Practitioners and service-role updates bypass this check.';

DROP TRIGGER IF EXISTS enforce_client_cancellation_window ON public.client_sessions;
CREATE TRIGGER enforce_client_cancellation_window
  BEFORE UPDATE ON public.client_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_enforce_client_cancellation_window();

-- Clean RPC so callers get a structured response instead of raw SQL errors.
-- SECURITY DEFINER + explicit ownership check so we don't bypass RLS in ways
-- the schema doesn't already allow: practitioner owns session OR caller is
-- the client who booked it. The trigger above still enforces the window when
-- p_cancelled_by='client' (because the UPDATE runs as the caller).
CREATE OR REPLACE FUNCTION public.cancel_client_session(
  p_session_id uuid,
  p_reason text DEFAULT NULL,
  p_cancelled_by text DEFAULT 'client'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_session record;
  v_is_practitioner boolean;
  v_is_client boolean;
  v_cutoff_hours CONSTANT int := 24;
  v_session_start timestamptz;
  v_hours_until numeric;
  v_now timestamptz := NOW();
  v_reason text := COALESCE(NULLIF(TRIM(p_reason), ''), 'Cancelled');
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'UNAUTHENTICATED', 'error_message', 'Sign in required.');
  END IF;

  SELECT id, therapist_id, client_id, status, session_date, start_time, session_timezone
    INTO v_session
    FROM public.client_sessions
    WHERE id = p_session_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'NOT_FOUND', 'error_message', 'Session not found.');
  END IF;

  v_is_practitioner := v_caller = v_session.therapist_id;
  v_is_client := v_caller = v_session.client_id;
  IF NOT (v_is_practitioner OR v_is_client) THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'FORBIDDEN', 'error_message', 'You do not have permission to cancel this session.');
  END IF;

  IF v_session.status IN ('cancelled', 'completed', 'no_show') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_STATE',
      'error_message', format('Session is already %s and cannot be cancelled.', v_session.status)
    );
  END IF;

  -- Client-initiated cancel: enforce the 24h window in the RPC so callers
  -- get a structured response. The trigger still protects against direct
  -- UPDATEs that bypass this RPC.
  IF p_cancelled_by = 'client' AND v_is_client AND NOT v_is_practitioner THEN
    v_session_start :=
      ((v_session.session_date::text || ' ' || COALESCE(v_session.start_time, '00:00:00')::text)::timestamp)
      AT TIME ZONE COALESCE(NULLIF(v_session.session_timezone, ''), 'Europe/London');
    v_hours_until := EXTRACT(EPOCH FROM (v_session_start - v_now)) / 3600.0;
    IF v_hours_until < v_cutoff_hours THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'CANCEL_WINDOW_CLOSED',
        'error_message', format(
          'Cancellations must be made at least %s hours in advance. This session starts in %s hours.',
          v_cutoff_hours,
          ROUND(v_hours_until, 1)
        ),
        'hours_until_session', ROUND(v_hours_until, 1),
        'cutoff_hours', v_cutoff_hours
      );
    END IF;
  END IF;

  UPDATE public.client_sessions
    SET status = 'cancelled',
        cancelled_at = v_now,
        cancellation_reason = v_reason,
        updated_at = v_now
    WHERE id = p_session_id;

  RETURN jsonb_build_object(
    'success', true,
    'session_id', p_session_id,
    'cancelled_by', CASE WHEN v_is_practitioner THEN 'practitioner' ELSE 'client' END
  );
END;
$function$;

COMMENT ON FUNCTION public.cancel_client_session(uuid, text, text)
  IS 'Structured cancellation RPC. Enforces 24h window for client-initiated cancels and returns a jsonb result with error_code for UI messaging.';

GRANT EXECUTE ON FUNCTION public.cancel_client_session(uuid, text, text) TO authenticated;
