-- Allow guest booking flow to detect when email is already registered.
-- Returns true if a user exists with this email and a non-guest role (client, practitioner, etc.).
CREATE OR REPLACE FUNCTION public.check_email_registered(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE LOWER(TRIM(email)) = LOWER(TRIM(p_email))
      AND (user_role IS NULL OR user_role != 'guest')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_email_registered(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.check_email_registered(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_email_registered(TEXT) TO service_role;

COMMENT ON FUNCTION public.check_email_registered(TEXT) IS 
'Returns true if email belongs to a registered (non-guest) user. Used by guest booking flow to suggest sign-in.';
