-- AI processing accountability log (UK GDPR Art. 5(2) / ICO audit trail)
-- Stores metadata + SHA-256 fingerprint only — never transcript/audio content.

CREATE TABLE IF NOT EXISTS public.ai_processing_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id UUID,
  recording_id UUID,
  function_name TEXT NOT NULL,
  sub_processor TEXT NOT NULL,
  model_id TEXT NOT NULL,
  input_type TEXT NOT NULL CHECK (input_type IN ('transcript', 'audio_url', 'storage_path')),
  input_byte_length INTEGER,
  input_sha256 TEXT NOT NULL,
  lawful_basis TEXT NOT NULL DEFAULT 'practitioner_instruction',
  outcome TEXT NOT NULL DEFAULT 'success' CHECK (outcome IN ('success', 'error')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_processing_log_user_id
  ON public.ai_processing_log(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_processing_log_session_id
  ON public.ai_processing_log(session_id)
  WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_processing_log_created_at
  ON public.ai_processing_log(created_at);

COMMENT ON TABLE public.ai_processing_log IS
  'Accountability log for AI inference edge functions. No clinical content stored.';

ALTER TABLE public.ai_processing_log ENABLE ROW LEVEL SECURITY;

-- Practitioners may view their own AI processing history (transparency / DSAR aid).
DO $$ BEGIN
  CREATE POLICY ai_processing_log_select_own ON public.ai_processing_log
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Edge functions (service role) insert audit rows.
DO $$ BEGIN
  CREATE POLICY ai_processing_log_insert_service ON public.ai_processing_log
    FOR INSERT WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Service role reads all rows for DSAR / admin.
DO $$ BEGIN
  CREATE POLICY ai_processing_log_select_service ON public.ai_processing_log
    FOR SELECT USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
