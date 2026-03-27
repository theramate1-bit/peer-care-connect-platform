-- Allows guest users to cancel only their own pending mobile requests by request ID + email.
CREATE OR REPLACE FUNCTION public.cancel_guest_mobile_request_by_email(
  p_request_id uuid,
  p_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_request_id uuid;
BEGIN
  SELECT mbr.id
  INTO v_request_id
  FROM public.mobile_booking_requests mbr
  INNER JOIN public.users u ON u.id = mbr.client_id
  WHERE mbr.id = p_request_id
    AND mbr.status = 'pending'
    AND lower(coalesce(u.email, '')) = lower(coalesce(p_email, ''))
  LIMIT 1;

  IF v_request_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Request not found or not pending'
    );
  END IF;

  UPDATE public.mobile_booking_requests
  SET
    status = 'cancelled',
    payment_status = CASE
      WHEN payment_status = 'held' THEN 'released'
      ELSE payment_status
    END,
    updated_at = now()
  WHERE id = v_request_id;

  RETURN jsonb_build_object(
    'success', true,
    'request_id', v_request_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.cancel_guest_mobile_request_by_email(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.cancel_guest_mobile_request_by_email(uuid, text) TO authenticated;
