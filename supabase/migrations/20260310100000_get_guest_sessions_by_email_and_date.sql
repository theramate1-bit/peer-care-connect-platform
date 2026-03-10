-- Find my booking: Guests can look up sessions by email + date when they never received confirmation
-- Returns minimal session info for identification; full details via /booking/view/:id?email=...
CREATE OR REPLACE FUNCTION public.get_guest_sessions_by_email_and_date(
  p_email TEXT,
  p_date DATE
)
RETURNS TABLE (
  session_id UUID,
  session_date DATE,
  start_time TIME,
  session_type TEXT,
  practitioner_name TEXT,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cs.id AS session_id,
    cs.session_date,
    cs.start_time,
    cs.session_type,
    TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) AS practitioner_name,
    cs.status::TEXT
  FROM public.client_sessions cs
  LEFT JOIN public.users u ON u.id = cs.therapist_id
  WHERE LOWER(TRIM(cs.client_email)) = LOWER(TRIM(p_email))
    AND cs.session_date = p_date
    AND cs.status IN ('scheduled', 'confirmed', 'pending_payment', 'in_progress')
    AND (cs.status != 'pending_payment' OR cs.expires_at IS NULL OR cs.expires_at > NOW())
  ORDER BY cs.session_date, cs.start_time;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_guest_sessions_by_email_and_date(TEXT, DATE) TO anon;
GRANT EXECUTE ON FUNCTION public.get_guest_sessions_by_email_and_date(TEXT, DATE) TO authenticated;

COMMENT ON FUNCTION public.get_guest_sessions_by_email_and_date(TEXT, DATE) IS 
'Allows guests to find their bookings by email and date when confirmation email was not received. Returns minimal session info.';
