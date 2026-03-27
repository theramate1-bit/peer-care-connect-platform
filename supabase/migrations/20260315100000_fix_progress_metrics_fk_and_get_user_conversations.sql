-- Fix 1: progress_metrics FK references auth.users but PostgREST needs public.users for relationship hints.
-- Recreate FKs to reference public.users so progress_metrics_client_id_fkey works with users! hint.
-- Fix 2: get_user_conversations returns character varying(255) for other_participant_role (column 4)
-- but callers expect text. Change RETURNS TABLE to use text and cast the expression.

-- =============================================================================
-- FIX 1: progress_metrics foreign keys -> public.users
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public' AND t.relname = 'progress_metrics'
    AND c.conname = 'progress_metrics_client_id_fkey'
  ) THEN
    ALTER TABLE public.progress_metrics DROP CONSTRAINT progress_metrics_client_id_fkey;
    ALTER TABLE public.progress_metrics
      ADD CONSTRAINT progress_metrics_client_id_fkey
      FOREIGN KEY (client_id) REFERENCES public.users(id);
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'progress_metrics_client_id_fkey: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public' AND t.relname = 'progress_metrics'
    AND c.conname = 'progress_metrics_practitioner_id_fkey'
  ) THEN
    ALTER TABLE public.progress_metrics DROP CONSTRAINT progress_metrics_practitioner_id_fkey;
    ALTER TABLE public.progress_metrics
      ADD CONSTRAINT progress_metrics_practitioner_id_fkey
      FOREIGN KEY (practitioner_id) REFERENCES public.users(id);
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'progress_metrics_practitioner_id_fkey: %', SQLERRM;
END $$;

-- =============================================================================
-- FIX 2: get_user_conversations - other_participant_role varchar -> text
-- =============================================================================
DROP FUNCTION IF EXISTS public.get_user_conversations(uuid, integer, integer);
CREATE OR REPLACE FUNCTION public.get_user_conversations(
  p_user_id uuid,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  conversation_id uuid,
  other_participant_id uuid,
  other_participant_name text,
  other_participant_role text,
  last_message_content text,
  last_message_at timestamp with time zone,
  unread_count integer,
  guest_email text,
  pending_account_creation boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    c.id as conversation_id,
    CASE
      WHEN c.participant1_id = p_user_id THEN c.participant2_id
      ELSE c.participant1_id
    END as other_participant_id,
    CASE
      WHEN c.participant1_id = p_user_id THEN
        CASE
          WHEN c.participant2_id IS NOT NULL THEN CONCAT(p2.first_name, ' ', p2.last_name)
          ELSE COALESCE(c.guest_email, 'Guest')
        END
      ELSE
        CASE
          WHEN c.participant1_id IS NOT NULL THEN CONCAT(p1.first_name, ' ', p1.last_name)
          ELSE COALESCE(c.guest_email, 'Guest')
        END
    END as other_participant_name,
    (CASE
      WHEN c.participant1_id = p_user_id THEN COALESCE(p2.user_role::text, 'guest')
      ELSE COALESCE(p1.user_role::text, 'guest')
    END)::text as other_participant_role,
    m.encrypted_content as last_message_content,
    c.last_message_at,
    COALESCE(unread.unread_count, 0)::INTEGER as unread_count,
    CASE
      WHEN c.participant1_id = p_user_id THEN c.guest_email
      ELSE NULL
    END as guest_email,
    c.pending_account_creation
  FROM conversations c
  LEFT JOIN users p1 ON c.participant1_id = p1.id
  LEFT JOIN users p2 ON c.participant2_id = p2.id
  LEFT JOIN messages m ON c.id = m.conversation_id
    AND m.id = (
      SELECT m2.id FROM messages m2
      WHERE m2.conversation_id = c.id
      ORDER BY m2.created_at DESC NULLS LAST
      LIMIT 1
    )
  LEFT JOIN (
    SELECT
      m3.conversation_id,
      COUNT(*) as unread_count
    FROM messages m3
    LEFT JOIN message_status_tracking mst ON m3.id = mst.message_id AND mst.recipient_id = p_user_id
    WHERE m3.sender_id != p_user_id
      AND (mst.message_status IS NULL OR mst.message_status != 'read')
    GROUP BY m3.conversation_id
  ) unread ON c.id = unread.conversation_id
  WHERE (c.participant1_id = p_user_id OR c.participant2_id = p_user_id)
  ORDER BY c.last_message_at DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_user_conversations(uuid, integer, integer) TO authenticated, service_role;
