-- Allow practitioners to start conversations with guests (by email).
-- Creates or finds a guest user and returns conversation id for use in messaging.
CREATE OR REPLACE FUNCTION public.get_or_create_guest_conversation(
  p_practitioner_id UUID,
  p_guest_email TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guest_id UUID;
  v_conversation_id UUID;
BEGIN
  IF p_practitioner_id IS NULL OR trim(p_guest_email) = '' THEN
    RAISE EXCEPTION 'p_practitioner_id and p_guest_email are required';
  END IF;

  -- Find user by email (any role) or create guest user
  SELECT id INTO v_guest_id
  FROM public.users
  WHERE lower(trim(email)) = lower(trim(p_guest_email))
  LIMIT 1;

  IF v_guest_id IS NULL THEN
    INSERT INTO public.users (id, email, user_role, first_name, last_name, onboarding_status, profile_completed, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      trim(p_guest_email),
      'guest',
      'Guest',
      '',
      'completed',
      false,
      now(),
      now()
    )
    RETURNING id INTO v_guest_id;
  END IF;

  -- Get or create conversation
  SELECT id INTO v_conversation_id
  FROM public.conversations
  WHERE (participant1_id = p_practitioner_id AND participant2_id = v_guest_id)
     OR (participant1_id = v_guest_id AND participant2_id = p_practitioner_id)
  LIMIT 1;

  IF v_conversation_id IS NULL THEN
    v_conversation_id := public.create_conversation(p_practitioner_id, v_guest_id);
  END IF;

  RETURN v_conversation_id;
END;
$$;

COMMENT ON FUNCTION public.get_or_create_guest_conversation(UUID, TEXT) IS 'Gets or creates a guest user by email and returns conversation id for practitioner-guest messaging. Used when practitioner messages a client who booked as guest.';

GRANT EXECUTE ON FUNCTION public.get_or_create_guest_conversation(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_guest_conversation(UUID, TEXT) TO service_role;
