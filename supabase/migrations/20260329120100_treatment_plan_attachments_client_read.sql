-- When `treatment_plans` exists: clients can read attachment objects for their own plans.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'treatment_plans'
  ) THEN
    DROP POLICY IF EXISTS "tpa_client_select" ON storage.objects;
    CREATE POLICY "tpa_client_select"
    ON storage.objects FOR SELECT TO authenticated
    USING (
      bucket_id = 'treatment-plan-attachments'
      AND EXISTS (
        SELECT 1 FROM public.treatment_plans tp
        WHERE tp.id::text = (storage.foldername(name))[2]
          AND tp.client_id = auth.uid()
      )
    );
  END IF;
END $$;
