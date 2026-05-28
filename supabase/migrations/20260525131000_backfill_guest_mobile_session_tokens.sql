-- One-off: guest mobile sessions missing view token or is_guest_booking flag.

UPDATE public.client_sessions cs
SET
  is_guest_booking = true,
  guest_view_token = COALESCE(
    cs.guest_view_token,
    encode(gen_random_bytes(32), 'hex')
  )
FROM public.users u
WHERE cs.client_id = u.id
  AND u.user_role = 'guest'
  AND cs.appointment_type = 'mobile'
  AND (
    cs.is_guest_booking IS DISTINCT FROM true
    OR cs.guest_view_token IS NULL
  );
