-- Update mobile booking request commission formula to 1.95% + 20p
DO $$
DECLARE
  fn_def text;
BEGIN
  SELECT pg_get_functiondef(p.oid)
  INTO fn_def
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'create_mobile_booking_request'
    AND p.prokind = 'f'
  LIMIT 1;

  IF fn_def IS NULL THEN
    RAISE EXCEPTION 'Function public.create_mobile_booking_request not found';
  END IF;

  fn_def := replace(
    fn_def,
    'v_platform_fee_pence := round(v_total_price_pence * 0.005);',
    'v_platform_fee_pence := round(v_total_price_pence * 0.0195) + 20;'
  );

  EXECUTE fn_def;
END $$;
