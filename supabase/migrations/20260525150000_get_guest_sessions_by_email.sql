-- Guest "find my booking": list sessions by email with guest_view_token for secure deep links.

CREATE OR REPLACE FUNCTION public.get_guest_sessions_by_email(p_email text)
RETURNS TABLE(
  session_id uuid,
  session_date date,
  start_time time without time zone,
  session_type text,
  practitioner_name text,
  status text,
  guest_view_token text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    cs.id AS session_id,
    cs.session_date,
    cs.start_time,
    cs.session_type,
    TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS practitioner_name,
    cs.status::text,
    cs.guest_view_token
  FROM public.client_sessions cs
  LEFT JOIN public.users u ON u.id = cs.therapist_id
  WHERE LOWER(TRIM(cs.client_email)) = LOWER(TRIM(p_email))
    AND cs.status IN (
      'scheduled',
      'confirmed',
      'pending_payment',
      'in_progress',
      'completed',
      'cancelled'
    )
    AND (
      cs.status <> 'pending_payment'
      OR cs.expires_at IS NULL
      OR cs.expires_at > NOW()
    )
  ORDER BY cs.session_date DESC, cs.start_time DESC
  LIMIT 30;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_guest_sessions_by_email(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_guest_sessions_by_email(text) TO authenticated;
