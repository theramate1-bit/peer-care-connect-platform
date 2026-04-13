-- Analytics report exports: private bucket + per-user read access
-- Convention: report files stored under `users/{user_id}/reports/{report_id}/{delivery_id}/...`
-- `report_deliveries.file_path` should store the object path under this bucket.

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('report-exports', 'report-exports', false, 52428800)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "re_user_select" ON storage.objects;
DROP POLICY IF EXISTS "re_service_insert" ON storage.objects;
DROP POLICY IF EXISTS "re_service_delete" ON storage.objects;

-- Users can read only their own exported files.
CREATE POLICY "re_user_select"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'report-exports'
  AND (storage.foldername(name))[1] = 'users'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Only backend jobs should write/delete exports.
CREATE POLICY "re_service_insert"
ON storage.objects FOR INSERT TO service_role
WITH CHECK (bucket_id = 'report-exports');

CREATE POLICY "re_service_delete"
ON storage.objects FOR DELETE TO service_role
USING (bucket_id = 'report-exports');

