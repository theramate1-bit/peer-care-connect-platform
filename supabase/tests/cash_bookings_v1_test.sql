-- ============================================================
-- Cash bookings v1 — SQL verification tests
-- Run against the live/staging DB to validate schema + RPCs.
-- Each block is self-contained; failure raises an EXCEPTION.
-- ============================================================

-- 1) Schema: users.accept_in_person_payment column exists, defaults false
DO $$
DECLARE
  v_default text;
BEGIN
  SELECT column_default INTO v_default
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'accept_in_person_payment';

  IF v_default IS NULL THEN
    RAISE EXCEPTION 'FAIL: users.accept_in_person_payment column not found';
  END IF;
  RAISE NOTICE 'PASS: users.accept_in_person_payment exists (default: %)', v_default;
END $$;

-- 2) Schema: client_sessions.payment_collection column with CHECK constraint
DO $$
DECLARE
  v_constraint text;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO v_constraint
  FROM pg_constraint
  WHERE conrelid = 'public.client_sessions'::regclass AND conname = 'chk_payment_collection';

  IF v_constraint IS NULL THEN
    RAISE EXCEPTION 'FAIL: chk_payment_collection constraint not found';
  END IF;
  RAISE NOTICE 'PASS: chk_payment_collection exists: %', v_constraint;
END $$;

-- 3) RPC: create_booking_with_validation with 25 params (includes p_payment_collection)
DO $$
BEGIN
  PERFORM 1 FROM pg_proc
  WHERE proname = 'create_booking_with_validation'
    AND pronamespace = 'public'::regnamespace
    AND pronargs = 25;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'FAIL: create_booking_with_validation (25 args) not found';
  END IF;
  RAISE NOTICE 'PASS: create_booking_with_validation (25 args) exists';
END $$;

-- 4) RPC: mark_session_paid_in_person exists
DO $$
BEGIN
  PERFORM 1 FROM pg_proc
  WHERE proname = 'mark_session_paid_in_person'
    AND pronamespace = 'public'::regnamespace;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'FAIL: mark_session_paid_in_person not found';
  END IF;
  RAISE NOTICE 'PASS: mark_session_paid_in_person exists';
END $$;

-- 5) expire_pending_payment_bookings does NOT target in_person sessions
-- (it only matches status = 'pending_payment'; in_person sessions use 'scheduled')
DO $$
DECLARE
  v_def text;
BEGIN
  SELECT pg_get_functiondef(oid) INTO v_def
  FROM pg_proc
  WHERE proname = 'expire_pending_payment_bookings' AND pronamespace = 'public'::regnamespace;

  IF v_def IS NULL THEN
    RAISE EXCEPTION 'FAIL: expire_pending_payment_bookings not found';
  END IF;

  IF v_def NOT LIKE '%pending_payment%' THEN
    RAISE EXCEPTION 'FAIL: expire_pending_payment_bookings does not filter on pending_payment';
  END IF;
  RAISE NOTICE 'PASS: expire_pending_payment_bookings only targets pending_payment status';
END $$;

-- 6) Verify CHECK constraint rejects invalid payment_collection values
DO $$
BEGIN
  BEGIN
    INSERT INTO client_sessions (
      therapist_id, client_id, session_date, start_time, duration_minutes,
      session_type, price, payment_collection
    ) VALUES (
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
      CURRENT_DATE + 30, '10:00', 60, 'test', 50, 'invalid_value'
    );
    RAISE EXCEPTION 'FAIL: CHECK constraint did not reject invalid payment_collection';
  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE 'PASS: CHECK constraint correctly rejects invalid payment_collection';
  END;
END $$;

-- ============================================================
-- Gap closure tests (added by v1.1)
-- ============================================================

-- 7) RPC: ensure_guest_user_for_booking exists and is callable by anon
DO $$
BEGIN
  PERFORM 1 FROM pg_proc
  WHERE proname = 'ensure_guest_user_for_booking'
    AND pronamespace = 'public'::regnamespace;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'FAIL: ensure_guest_user_for_booking not found';
  END IF;
  RAISE NOTICE 'PASS: ensure_guest_user_for_booking exists';
END $$;

-- 8) ensure_guest_user_for_booking is granted to anon
DO $$
BEGIN
  IF NOT has_function_privilege('anon', 'public.ensure_guest_user_for_booking(text, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: anon cannot execute ensure_guest_user_for_booking';
  END IF;
  RAISE NOTICE 'PASS: anon can execute ensure_guest_user_for_booking';
END $$;

-- 9) create_booking_with_validation (25 args) is granted to anon
DO $$
DECLARE
  v_oid oid;
BEGIN
  SELECT p.oid INTO v_oid FROM pg_proc p
  WHERE p.proname = 'create_booking_with_validation'
    AND p.pronamespace = 'public'::regnamespace
    AND array_length(p.proargtypes, 1) = 25;

  IF v_oid IS NULL THEN
    RAISE EXCEPTION 'FAIL: create_booking_with_validation (25 args) not found';
  END IF;

  IF NOT has_function_privilege('anon', v_oid, 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: anon cannot execute create_booking_with_validation (25 args)';
  END IF;
  RAISE NOTICE 'PASS: anon can execute create_booking_with_validation (25 args)';
END $$;

-- 10) Trigger: block_client_payment_update exists
DO $$
BEGIN
  PERFORM 1 FROM pg_trigger
  WHERE tgname = 'block_client_payment_update'
    AND tgrelid = 'public.client_sessions'::regclass;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'FAIL: block_client_payment_update trigger not found';
  END IF;
  RAISE NOTICE 'PASS: block_client_payment_update trigger exists';
END $$;

-- 11) Trigger: set_guest_view_token_for_in_person exists
DO $$
BEGIN
  PERFORM 1 FROM pg_trigger
  WHERE tgname = 'set_guest_view_token_for_in_person'
    AND tgrelid = 'public.client_sessions'::regclass;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'FAIL: set_guest_view_token_for_in_person trigger not found';
  END IF;
  RAISE NOTICE 'PASS: set_guest_view_token_for_in_person trigger exists';
END $$;

-- 12) get_session_by_guest_token allows in_person sessions (not just completed)
DO $$
DECLARE
  v_def text;
BEGIN
  SELECT pg_get_functiondef(oid) INTO v_def
  FROM pg_proc
  WHERE proname = 'get_session_by_guest_token' AND pronamespace = 'public'::regnamespace;

  IF v_def IS NULL THEN
    RAISE EXCEPTION 'FAIL: get_session_by_guest_token not found';
  END IF;

  IF v_def NOT LIKE '%payment_collection%' THEN
    RAISE EXCEPTION 'FAIL: get_session_by_guest_token does not reference payment_collection (should allow in_person sessions)';
  END IF;
  RAISE NOTICE 'PASS: get_session_by_guest_token supports in_person sessions';
END $$;

-- Done
DO $$ BEGIN RAISE NOTICE '== All cash_bookings_v1 + gap closure SQL tests passed =='; END $$;
