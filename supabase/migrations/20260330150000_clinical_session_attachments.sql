-- Session clinical file vault: metadata table + private storage bucket.
-- Path: `{therapist_user_id}/{session_id}/{uuid}_{filename}`

CREATE TABLE IF NOT EXISTS public.clinical_session_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.client_sessions(id) ON DELETE CASCADE,
  practitioner_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_type text,
  file_size bigint,
  storage_path text NOT NULL,
  file_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clinical_session_attachments_session
  ON public.clinical_session_attachments(session_id);

CREATE INDEX IF NOT EXISTS idx_clinical_session_attachments_practitioner
  ON public.clinical_session_attachments(practitioner_id);

ALTER TABLE public.clinical_session_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "csa_therapist_manage" ON public.clinical_session_attachments;
DROP POLICY IF EXISTS "csa_client_read" ON public.clinical_session_attachments;

CREATE POLICY "csa_therapist_manage"
ON public.clinical_session_attachments
FOR ALL
TO authenticated
USING (
  practitioner_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.client_sessions cs
    WHERE cs.id = clinical_session_attachments.session_id
      AND cs.therapist_id = auth.uid()
  )
)
WITH CHECK (
  practitioner_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.client_sessions cs
    WHERE cs.id = clinical_session_attachments.session_id
      AND cs.therapist_id = auth.uid()
  )
);

CREATE POLICY "csa_client_read"
ON public.clinical_session_attachments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.client_sessions cs
    WHERE cs.id = clinical_session_attachments.session_id
      AND cs.client_id = auth.uid()
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinical_session_attachments TO authenticated;

-- Storage bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('clinical-session-attachments', 'clinical-session-attachments', false, 52428800)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "csa_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "csa_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "csa_storage_delete" ON storage.objects;

CREATE POLICY "csa_storage_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'clinical-session-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND EXISTS (
    SELECT 1 FROM public.client_sessions cs
    WHERE cs.id::text = (storage.foldername(name))[2]
      AND cs.therapist_id = auth.uid()
  )
);

CREATE POLICY "csa_storage_select"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'clinical-session-attachments'
  AND EXISTS (
    SELECT 1 FROM public.client_sessions cs
    WHERE cs.id::text = (storage.foldername(name))[2]
      AND (
        cs.therapist_id = auth.uid()
        OR cs.client_id = auth.uid()
      )
  )
);

CREATE POLICY "csa_storage_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'clinical-session-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND EXISTS (
    SELECT 1 FROM public.client_sessions cs
    WHERE cs.id::text = (storage.foldername(name))[2]
      AND cs.therapist_id = auth.uid()
  )
);
