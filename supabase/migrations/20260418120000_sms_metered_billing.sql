-- SMS metered billing foundation (outbound only)

ALTER TABLE public.sms_logs
  ADD COLUMN IF NOT EXISTS practitioner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS billable boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS stripe_meter_event_id text,
  ADD COLUMN IF NOT EXISTS meter_post_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS meter_post_last_error text,
  ADD COLUMN IF NOT EXISTS billed_at timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_invoice_id text;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS sms_reminders_enabled boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_sms_logs_practitioner_month
  ON public.sms_logs (practitioner_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_sms_logs_unposted
  ON public.sms_logs (sent_at)
  WHERE billable = true AND stripe_meter_event_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_sms_logs_invoice_ref
  ON public.sms_logs (stripe_invoice_id);

-- Backfill practitioner ownership from linked session when possible.
UPDATE public.sms_logs sl
SET practitioner_id = cs.therapist_id
FROM public.client_sessions cs
WHERE sl.session_id = cs.id
  AND sl.practitioner_id IS NULL;

-- Legacy rows with unknown owner should never be billed.
UPDATE public.sms_logs
SET billable = false
WHERE practitioner_id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'sms_logs'
      AND policyname = 'Practitioners can view own sms logs'
  ) THEN
    CREATE POLICY "Practitioners can view own sms logs"
      ON public.sms_logs
      FOR SELECT
      USING (practitioner_id = auth.uid());
  END IF;
END $$;

-- Track one-shot migration tasks such as backfills.
CREATE TABLE IF NOT EXISTS public.migration_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_key text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'completed',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.migration_runs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'migration_runs'
      AND policyname = 'Service role manage migration runs'
  ) THEN
    CREATE POLICY "Service role manage migration runs"
      ON public.migration_runs
      FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;
