-- Require visit_address when appointment_type is mobile (internal and public booking alignment).

DO $$
DECLARE
  fn_def text;
  new_def text;
  search_str text;
  insert_str text;
BEGIN
  SELECT pg_get_functiondef(p.oid)
  INTO fn_def
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'create_booking_with_validation'
    AND p.proargnames @> ARRAY['p_appointment_type']::text[]
  ORDER BY p.oid DESC
  LIMIT 1;

  IF fn_def IS NULL OR fn_def = '' THEN
    RAISE NOTICE 'create_booking_with_validation with p_appointment_type not found; skip mobile visit_address check.';
    RETURN;
  END IF;

  -- Already patched?
  IF position('MISSING_VISIT_ADDRESS' IN fn_def) > 0 THEN
    RAISE NOTICE 'create_booking_with_validation already has mobile visit_address validation.';
    RETURN;
  END IF;

  search_str := 'v_requested_appointment_type := COALESCE(NULLIF(TRIM(p_appointment_type), ''''), ''clinic'');';
  insert_str := search_str || E'\n\n  IF v_requested_appointment_type = ''mobile'' AND (p_visit_address IS NULL OR NULLIF(TRIM(COALESCE(p_visit_address, '''')), '''') IS NULL) THEN\n    RETURN jsonb_build_object(''success'', false, ''error_code'', ''MISSING_VISIT_ADDRESS'', ''error_message'', ''Visit address is required for mobile sessions.'');\n  END IF;';

  new_def := replace(fn_def, search_str, insert_str);

  IF new_def = fn_def THEN
    RAISE NOTICE 'create_booking_with_validation: could not find injection point for mobile visit_address check.';
    RETURN;
  END IF;

  EXECUTE new_def;
  RAISE NOTICE 'create_booking_with_validation: added mobile visit_address required validation.';
END $$;
