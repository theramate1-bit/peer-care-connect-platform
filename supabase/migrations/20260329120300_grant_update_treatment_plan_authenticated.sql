-- Original migration had a typo: GRANT referenced `update_treatment_pls` instead of `update_treatment_plan`.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'update_treatment_plan'
  ) THEN
    GRANT EXECUTE ON FUNCTION public.update_treatment_plan(uuid, jsonb) TO authenticated;
  END IF;
END $$;
