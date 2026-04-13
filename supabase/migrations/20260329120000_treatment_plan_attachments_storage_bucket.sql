-- Private bucket for treatment plan file uploads (practitioner-owned paths).
-- Path convention: {practitioner_user_id}/{plan_id}/{filename}

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('treatment-plan-attachments', 'treatment-plan-attachments', false, 52428800)
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = EXCLUDED.file_size_limit;

DROP POLICY IF EXISTS "tpa_practitioner_insert" ON storage.objects;
DROP POLICY IF EXISTS "tpa_practitioner_select" ON storage.objects;
DROP POLICY IF EXISTS "tpa_practitioner_delete" ON storage.objects;

CREATE POLICY "tpa_practitioner_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'treatment-plan-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "tpa_practitioner_select"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'treatment-plan-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "tpa_practitioner_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'treatment-plan-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
