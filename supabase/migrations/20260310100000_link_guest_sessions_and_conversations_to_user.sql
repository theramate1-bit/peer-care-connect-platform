-- Guest-to-client linking: reassign guest sessions and conversations to the new auth user.
-- Called from AuthCallback and Login after signup/login when email matches a former guest.
-- MessagingManager.linkGuestSessionsToUser / linkGuestConversationsToUser call these RPCs.

-- Reassign client_sessions (guest bookings) to the new user id by matching client_email.
CREATE OR REPLACE FUNCTION public.link_guest_sessions_to_user(
  p_email TEXT,
  p_user_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF p_user_id IS NULL OR trim(coalesce(p_email, '')) = '' THEN
    RETURN 0;
  END IF;

  UPDATE public.client_sessions
  SET client_id = p_user_id,
      updated_at = now()
  WHERE lower(trim(client_email)) = lower(trim(p_email))
    AND (is_guest_booking = true OR client_id IS NULL);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.link_guest_sessions_to_user(TEXT, UUID) IS 'Reassigns guest bookings (client_sessions) to the new auth user by email; used when guest creates account or logs in.';

GRANT EXECUTE ON FUNCTION public.link_guest_sessions_to_user(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.link_guest_sessions_to_user(TEXT, UUID) TO service_role;


-- Reassign conversations where the guest was a participant to the new user id.
CREATE OR REPLACE FUNCTION public.link_guest_conversations_to_user(
  p_email TEXT,
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guest_id UUID;
BEGIN
  IF p_user_id IS NULL OR trim(coalesce(p_email, '')) = '' THEN
    RETURN;
  END IF;

  -- Find a user row with this email that is not the new auth user (the "guest" row to reassign from)
  SELECT id INTO v_guest_id
  FROM public.users
  WHERE lower(trim(email)) = lower(trim(p_email))
    AND id <> p_user_id
  LIMIT 1;

  IF v_guest_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.conversations
  SET participant1_id = p_user_id,
      updated_at = now()
  WHERE participant1_id = v_guest_id;

  UPDATE public.conversations
  SET participant2_id = p_user_id,
      updated_at = now()
  WHERE participant2_id = v_guest_id;
END;
$$;

COMMENT ON FUNCTION public.link_guest_conversations_to_user(TEXT, UUID) IS 'Reassigns conversations involving the guest (by email) to the new auth user; used when guest creates account or logs in.';

GRANT EXECUTE ON FUNCTION public.link_guest_conversations_to_user(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.link_guest_conversations_to_user(TEXT, UUID) TO service_role;
