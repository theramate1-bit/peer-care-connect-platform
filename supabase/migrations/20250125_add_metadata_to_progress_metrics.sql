ALTER TABLE public.progress_metrics ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;


