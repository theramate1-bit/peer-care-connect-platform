-- Align notification read + dismiss behavior across frontend and Supabase.
-- 1) Add soft-dismiss support instead of hard deletes.
-- 2) Keep legacy boolean "read" aligned with canonical "read_at".

ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS dismissed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_visible_created
ON public.notifications (recipient_id, created_at DESC)
WHERE dismissed_at IS NULL;

UPDATE public.notifications
SET read = true
WHERE read_at IS NOT NULL
  AND COALESCE(read, false) = false;

CREATE OR REPLACE FUNCTION public.mark_notifications_read(p_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.notifications
  SET read_at = NOW(),
      read = true
  WHERE id = ANY(p_ids)
    AND recipient_id = auth.uid()
    AND read_at IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$;
