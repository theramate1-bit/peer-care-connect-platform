-- Align notification idempotency and writer contract with actionable routing.
-- Deduplicate by recipient + type + source tuple, not just source tuple.

DO $$
DECLARE
  idx record;
BEGIN
  FOR idx IN
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'notifications'
      AND indexdef ILIKE 'CREATE UNIQUE INDEX%'
      AND indexdef ILIKE '%(recipient_id, source_type, source_id)%'
      AND indexname <> 'notifications_recipient_type_source_unique'
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS public.%I', idx.indexname);
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS notifications_recipient_type_source_unique
ON public.notifications (recipient_id, type, source_type, source_id)
WHERE source_type IS NOT NULL AND source_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.create_notification(
  p_recipient_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_source_type text DEFAULT NULL,
  p_source_id text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_id uuid;
BEGIN
  INSERT INTO public.notifications (
    recipient_id,
    type,
    title,
    body,
    payload,
    source_type,
    source_id,
    read_at
  )
  VALUES (
    p_recipient_id,
    p_type,
    p_title,
    p_body,
    COALESCE(p_payload, '{}'::jsonb),
    p_source_type,
    p_source_id,
    NULL
  )
  ON CONFLICT (recipient_id, type, source_type, source_id)
  DO UPDATE SET
    title = EXCLUDED.title,
    body = EXCLUDED.body,
    payload = EXCLUDED.payload,
    read_at = NULL,
    created_at = now()
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;
