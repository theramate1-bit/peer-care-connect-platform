-- ============================================================================
-- verify_payment_by_session: Look up payment and linked session by Stripe
-- checkout_session_id. Returns jsonb with payment and session data.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.verify_payment_by_session(p_checkout_session_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_payment jsonb := NULL;
  v_session jsonb := NULL;
BEGIN
  IF p_checkout_session_id IS NULL OR p_checkout_session_id = '' THEN
    RETURN jsonb_build_object(
      'payment', NULL,
      'session', NULL,
      'error', 'checkout_session_id is required'
    );
  END IF;

  -- Single query with JOIN; SECURITY DEFINER bypasses RLS (two-query approach hit RLS on client_sessions)
  SELECT
    to_jsonb(p.*),
    CASE WHEN cs.id IS NOT NULL THEN to_jsonb(cs.*) ELSE NULL END
  INTO v_payment, v_session
  FROM public.payments p
  LEFT JOIN public.client_sessions cs ON cs.id = p.session_id
  WHERE p.checkout_session_id = p_checkout_session_id
  LIMIT 1;

  IF v_payment IS NULL THEN
    RETURN jsonb_build_object(
      'payment', NULL,
      'session', NULL
    );
  END IF;

  RETURN jsonb_build_object(
    'payment', v_payment,
    'session', v_session
  );
END;
$function$;

COMMENT ON FUNCTION public.verify_payment_by_session(text) IS
  'Returns payment and linked client_session by Stripe checkout_session_id. Uses SECURITY DEFINER to bypass RLS.';

GRANT EXECUTE ON FUNCTION public.verify_payment_by_session(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_payment_by_session(text) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_payment_by_session(text) TO service_role;
