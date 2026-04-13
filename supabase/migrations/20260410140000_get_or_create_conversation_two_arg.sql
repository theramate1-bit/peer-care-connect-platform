-- Mobile/web clients call get_or_create_conversation(p_user1_id, p_user2_id).
-- The original migration only defined the single-argument (p_other_user_id) form.
-- This overload keeps both: PostgREST resolves by parameter count.

CREATE OR REPLACE FUNCTION public.get_or_create_conversation(
  p_user1_id uuid,
  p_user2_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_conversation_id uuid;
BEGIN
  IF auth.uid() IS NULL
     OR (auth.uid() <> p_user1_id AND auth.uid() <> p_user2_id) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF p_user1_id = p_user2_id THEN
    RAISE EXCEPTION 'participants must differ';
  END IF;

  SELECT c.id INTO v_conversation_id
  FROM public.conversations c
  WHERE (c.participant1_id = p_user1_id AND c.participant2_id = p_user2_id)
     OR (c.participant1_id = p_user2_id AND c.participant2_id = p_user1_id)
  LIMIT 1;

  IF v_conversation_id IS NOT NULL THEN
    RETURN v_conversation_id;
  END IF;

  RETURN public.create_conversation(p_user1_id, p_user2_id);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_or_create_conversation(uuid, uuid) TO authenticated, service_role;
