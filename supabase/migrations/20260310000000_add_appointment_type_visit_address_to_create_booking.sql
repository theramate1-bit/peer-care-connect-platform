-- Add p_appointment_type and p_visit_address to create_booking_with_validation.
-- Session location rule: booking record first (appointment_type, visit_address). See docs/features/session-location-rule.md.
-- client_sessions already has appointment_type and visit_address (20260309_add_appointment_type_and_visit_address.sql).

DO $$
DECLARE
  fn_def text;
  new_def text;
  arg_names text[];
  v_cap text;
BEGIN
  SELECT pg_get_functiondef(oid), proargnames INTO fn_def, arg_names
  FROM pg_proc
  WHERE proname = 'create_booking_with_validation'
  LIMIT 1;

  IF fn_def IS NULL OR fn_def = '' THEN
    RAISE NOTICE 'create_booking_with_validation not found; skip adding p_appointment_type/p_visit_address.';
    RETURN;
  END IF;

  IF arg_names @> ARRAY['p_appointment_type']::text[] THEN
    RAISE NOTICE 'create_booking_with_validation already has p_appointment_type; skip.';
    RETURN;
  END IF;

  -- Add two parameters after p_is_guest_booking (use capture variable to avoid backreference in string).
  SELECT (regexp_matches(fn_def, '(\s+p_is_guest_booking\s+boolean\s+DEFAULT\s+false)\s*\)'))[1] INTO v_cap;
  IF v_cap IS NOT NULL THEN
    new_def := regexp_replace(
      fn_def,
      '(\s+p_is_guest_booking\s+boolean\s+DEFAULT\s+false)\s*\)',
      v_cap || ', p_appointment_type text DEFAULT ''clinic'', p_visit_address text DEFAULT null)',
      1,
      1
    );
  ELSE
    new_def := fn_def;
  END IF;

  IF new_def = fn_def THEN
    RAISE NOTICE 'create_booking_with_validation: signature pattern not matched; skip.';
    RETURN;
  END IF;

  -- Add appointment_type, visit_address to INSERT column list (after is_guest_booking).
  SELECT (regexp_matches(new_def, '(\s+is_guest_booking)\s*\)\s*VALUES'))[1] INTO v_cap;
  IF v_cap IS NOT NULL THEN
    new_def := regexp_replace(
      new_def,
      '(\s+is_guest_booking)\s*\)\s*VALUES',
      v_cap || ', appointment_type, visit_address) VALUES',
      1,
      1
    );
  END IF;

  -- Add values in VALUES list (after COALESCE(p_is_guest_booking, false)).
  SELECT (regexp_matches(new_def, '(COALESCE\s*\(\s*p_is_guest_booking\s*,\s*false\s*\))\s*\)'))[1] INTO v_cap;
  IF v_cap IS NOT NULL THEN
    new_def := regexp_replace(
      new_def,
      '(COALESCE\s*\(\s*p_is_guest_booking\s*,\s*false\s*\))\s*\)',
      v_cap || ', COALESCE(p_appointment_type, ''clinic''), p_visit_address)',
      1,
      1
    );
  END IF;

  EXECUTE new_def;
  RAISE NOTICE 'create_booking_with_validation: added p_appointment_type and p_visit_address.';
END $$;
