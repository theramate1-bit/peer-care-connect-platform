-- Cash bookings v1 gap closure
-- 1) Guest user resolution RPC (anon-callable)
-- 2) guest_view_token + get_session_by_guest_token support for in_person sessions
-- 3) BEFORE UPDATE trigger blocking clients from self-updating payment fields

-- ============================================================
-- 1) ensure_guest_user_for_booking: find-or-create guest user by email
-- ============================================================
CREATE OR REPLACE FUNCTION public.ensure_guest_user_for_booking(
  p_email text,
  p_name text DEFAULT 'Guest'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_guest_id uuid;
  v_first text;
  v_last text;
  v_parts text[];
BEGIN
  IF p_email IS NULL OR trim(p_email) = '' THEN
    RAISE EXCEPTION 'Email is required';
  END IF;

  SELECT id INTO v_guest_id
  FROM public.users
  WHERE lower(trim(email)) = lower(trim(p_email))
  LIMIT 1;

  IF v_guest_id IS NOT NULL THEN
    RETURN v_guest_id;
  END IF;

  v_parts := string_to_array(trim(COALESCE(NULLIF(trim(p_name), ''), 'Guest')), ' ');
  v_first := v_parts[1];
  v_last := CASE WHEN array_length(v_parts, 1) > 1
    THEN array_to_string(v_parts[2:array_length(v_parts, 1)], ' ')
    ELSE '' END;

  INSERT INTO public.users (
    id, email, user_role, first_name, last_name,
    onboarding_status, profile_completed, created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    lower(trim(p_email)),
    'guest',
    v_first,
    v_last,
    'completed',
    false,
    now(),
    now()
  )
  RETURNING id INTO v_guest_id;

  RETURN v_guest_id;
END;
$$;

COMMENT ON FUNCTION public.ensure_guest_user_for_booking(text, text)
  IS 'Find or create a guest user by email for unauthenticated booking. Returns users.id.';

GRANT EXECUTE ON FUNCTION public.ensure_guest_user_for_booking(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.ensure_guest_user_for_booking(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_guest_user_for_booking(text, text) TO service_role;

-- ============================================================
-- 2) Update get_session_by_guest_token to also show in_person sessions
--    (previously required payment_status = 'completed' which excludes awaiting_in_person)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_session_by_guest_token(
  p_session_id UUID,
  p_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session RECORD;
  v_practitioner RECORD;
  v_result JSONB;
BEGIN
  IF p_session_id IS NULL OR p_token IS NULL OR trim(p_token) = '' THEN
    RETURN NULL;
  END IF;

  SELECT id, client_email, client_name, therapist_id, session_date, start_time,
         duration_minutes, session_type, price, status, payment_status,
         payment_collection, appointment_type
  INTO v_session
  FROM public.client_sessions
  WHERE id = p_session_id
    AND guest_view_token = p_token
    AND (payment_status = 'completed' OR payment_collection = 'in_person')
  LIMIT 1;

  IF v_session.id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT id, first_name, last_name, location
  INTO v_practitioner
  FROM public.users
  WHERE id = v_session.therapist_id
  LIMIT 1;

  v_result := jsonb_build_object(
    'id', v_session.id,
    'client_email', v_session.client_email,
    'client_name', v_session.client_name,
    'session_date', v_session.session_date,
    'start_time', v_session.start_time,
    'duration_minutes', v_session.duration_minutes,
    'session_type', v_session.session_type,
    'price', v_session.price,
    'status', v_session.status,
    'payment_status', v_session.payment_status,
    'payment_collection', v_session.payment_collection,
    'practitioner', CASE WHEN v_practitioner.id IS NOT NULL THEN jsonb_build_object(
      'first_name', v_practitioner.first_name,
      'last_name', v_practitioner.last_name,
      'location', v_practitioner.location
    ) ELSE NULL END
  );
  RETURN v_result;
END;
$$;

-- ============================================================
-- 3) Grant anon access to create_booking_with_validation overloads
--    so guest flow can call it without auth.
-- ============================================================
GRANT EXECUTE ON FUNCTION public.create_booking_with_validation(
  uuid, uuid, text, text, date, time, integer, text, numeric,
  text, text, text, text, boolean, integer, text, text, numeric,
  numeric, timestamptz, text, boolean, text, text, text
) TO anon;

GRANT EXECUTE ON FUNCTION public.create_booking_with_validation(
  uuid, uuid, text, text, date, time, integer, text, numeric,
  text, text, text, text, boolean, integer, text, text, numeric,
  numeric, timestamptz, text, boolean
) TO anon;

GRANT EXECUTE ON FUNCTION public.get_session_by_guest_token(uuid, text) TO anon;

-- ============================================================
-- 4) BEFORE UPDATE trigger: block clients from self-updating payment fields
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_block_client_payment_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND auth.uid() = OLD.client_id
     AND auth.uid() != OLD.therapist_id
  THEN
    IF NEW.payment_status IS DISTINCT FROM OLD.payment_status
       OR NEW.payment_method IS DISTINCT FROM OLD.payment_method
       OR NEW.payment_date IS DISTINCT FROM OLD.payment_date
    THEN
      RAISE EXCEPTION 'Clients cannot update payment fields directly';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS block_client_payment_update ON public.client_sessions;
CREATE TRIGGER block_client_payment_update
  BEFORE UPDATE ON public.client_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_block_client_payment_update();

COMMENT ON FUNCTION public.trg_block_client_payment_update()
  IS 'Prevents clients (auth.uid() = client_id) from updating payment_status, payment_method, or payment_date directly. Practitioners use mark_session_paid_in_person RPC instead.';

-- ============================================================
-- 5) Auto-set guest_view_token on INSERT for in_person bookings
--    (Online bookings get theirs from the Stripe webhook.)
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_set_guest_view_token_for_in_person()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.payment_collection = 'in_person' AND NEW.guest_view_token IS NULL THEN
    NEW.guest_view_token := encode(gen_random_bytes(32), 'hex');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_guest_view_token_for_in_person ON public.client_sessions;
CREATE TRIGGER set_guest_view_token_for_in_person
  BEFORE INSERT ON public.client_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_set_guest_view_token_for_in_person();
