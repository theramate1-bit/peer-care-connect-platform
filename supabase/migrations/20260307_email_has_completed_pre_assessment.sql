-- RPC: Check if an email has already completed at least one pre-assessment form.
-- Used to treat "recognised" emails as returning users (form not required).
-- SECURITY DEFINER so the check works regardless of RLS on pre_assessment_forms.
CREATE OR REPLACE FUNCTION public.email_has_completed_pre_assessment(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_email IS NULL OR trim(p_email) = '' THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.pre_assessment_forms
    WHERE lower(trim(client_email)) = lower(trim(p_email))
      AND completed_at IS NOT NULL
    LIMIT 1
  );
END;
$$;

COMMENT ON FUNCTION public.email_has_completed_pre_assessment(TEXT) IS
  'Returns true if the given email has at least one completed pre-assessment form; used to skip form for returning users.';

-- Optional index to speed up the lookup (expression index for normalised email, partial for completed only).
CREATE INDEX IF NOT EXISTS idx_pre_assessment_forms_email_completed
  ON public.pre_assessment_forms (lower(trim(client_email)))
  WHERE completed_at IS NOT NULL;
