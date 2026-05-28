-- Notifications v1: tables, RLS, indexes, RPCs

-- Table: notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low','normal','high')),
  channel_hint TEXT,
  source_type TEXT,
  source_id TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  in_app BOOLEAN DEFAULT TRUE,
  email BOOLEAN DEFAULT TRUE,
  push BOOLEAN DEFAULT FALSE,
  sms BOOLEAN DEFAULT FALSE,
  quiet_hours JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created_at
  ON public.notifications(recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON public.notifications(recipient_id, read_at)
  WHERE read_at IS NULL;

-- RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users read own notifications" ON public.notifications;
CREATE POLICY "Users read own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Users update read_at on own notifications" ON public.notifications;
CREATE POLICY "Users update read_at on own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

-- Insert reserved for SECURITY DEFINER RPCs; no general INSERT policy

DROP POLICY IF EXISTS "Users manage own preferences" ON public.notification_preferences;
CREATE POLICY "Users manage own preferences"
  ON public.notification_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RPC: create_notification with idempotency on (source_type, source_id)
DROP FUNCTION IF EXISTS public.create_notification(UUID, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.create_notification(
  p_recipient_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT,
  p_payload JSONB DEFAULT '{}'::jsonb,
  p_source_type TEXT DEFAULT NULL,
  p_source_id TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing UUID;
  v_id UUID;
BEGIN
  IF p_source_type IS NOT NULL AND p_source_id IS NOT NULL THEN
    SELECT id INTO v_existing
    FROM public.notifications
    WHERE recipient_id = p_recipient_id
      AND source_type = p_source_type
      AND source_id = p_source_id
    LIMIT 1;
    IF v_existing IS NOT NULL THEN
      RETURN v_existing;
    END IF;
  END IF;

  INSERT INTO public.notifications (
    recipient_id, type, title, body, payload, priority, channel_hint, source_type, source_id
  ) VALUES (
    p_recipient_id, p_type, p_title, p_body, COALESCE(p_payload, '{}'::jsonb), 'normal', NULL, p_source_type, p_source_id
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_notification(UUID, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT) TO anon, authenticated, service_role;

-- RPC: mark_notifications_read
DROP FUNCTION IF EXISTS public.mark_notifications_read(UUID[]);
CREATE OR REPLACE FUNCTION public.mark_notifications_read(p_ids UUID[])
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.notifications
  SET read_at = NOW()
  WHERE id = ANY(p_ids)
    AND recipient_id = auth.uid()
    AND read_at IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_notifications_read(UUID[]) TO authenticated;

-- Ensure default preferences rows exist on first query (optional separate job)
COMMENT ON TABLE public.notifications IS 'In-app notifications for users';
COMMENT ON TABLE public.notification_preferences IS 'Notification channel preferences per user';


