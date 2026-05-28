-- P1: Queue Resend email when practitioner declines a mobile booking request.

CREATE OR REPLACE FUNCTION public.queue_mobile_request_client_email(
  p_request_id uuid,
  p_email_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_edge_function_url text;
  v_service_role_key text;
  v_email_type text;
BEGIN
  IF p_request_id IS NULL OR p_email_type IS NULL OR trim(p_email_type) = '' THEN
    RETURN;
  END IF;

  v_email_type := trim(p_email_type);
  IF v_email_type NOT IN ('mobile_decline', 'mobile_expired') THEN
    RETURN;
  END IF;

  SELECT value INTO v_edge_function_url
  FROM public.app_config
  WHERE key = 'edge_function_url'
  LIMIT 1;

  v_edge_function_url := COALESCE(
    NULLIF(trim(v_edge_function_url), ''),
    current_setting('app.settings.edge_function_url', true),
    'https://aikqnvltuwwgifuocvto.supabase.co/functions/v1'
  );

  v_service_role_key := COALESCE(
    current_setting('app.settings.service_role_key', true),
    current_setting('app.settings.supabase_service_role_key', true)
  );

  IF v_service_role_key IS NULL OR trim(v_service_role_key) = '' THEN
    RAISE WARNING 'queue_mobile_request_client_email: service_role_key not configured';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := rtrim(v_edge_function_url, '/') || '/send-booking-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_role_key
    ),
    body := jsonb_build_object(
      'requestId', p_request_id,
      'emailType', v_email_type
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'queue_mobile_request_client_email failed for %: %', p_request_id, SQLERRM;
END;
$function$;

-- Patch decline: queue client email after in-app notification (non-blocking).
CREATE OR REPLACE FUNCTION public.decline_mobile_booking_request(
  p_request_id uuid,
  p_decline_reason text DEFAULT NULL,
  p_alternate_date date DEFAULT NULL,
  p_alternate_start_time time without time zone DEFAULT NULL,
  p_alternate_suggestions jsonb DEFAULT NULL,
  p_practitioner_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_request RECORD;
  v_practitioner_name TEXT;
  v_product_name TEXT;
  v_notification_body TEXT;
BEGIN
  SELECT
    mbr.*,
    u.first_name as practitioner_first_name,
    u.last_name as practitioner_last_name,
    pp.name as product_name
  INTO v_request
  FROM mobile_booking_requests mbr
  JOIN users u ON u.id = mbr.practitioner_id
  LEFT JOIN practitioner_products pp ON pp.id = mbr.product_id
  WHERE mbr.id = p_request_id
    AND mbr.status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found or not pending');
  END IF;

  v_practitioner_name := COALESCE(
    TRIM(COALESCE(v_request.practitioner_first_name, '') || ' ' || COALESCE(v_request.practitioner_last_name, '')),
    'Your practitioner'
  );
  v_product_name := COALESCE(v_request.product_name, 'Service');

  UPDATE mobile_booking_requests
  SET
    status = 'declined',
    payment_status = 'released',
    decline_reason = p_decline_reason,
    alternate_date = p_alternate_date,
    alternate_start_time = p_alternate_start_time,
    alternate_suggestions = COALESCE(p_alternate_suggestions, '[]'::jsonb),
    practitioner_notes = p_practitioner_notes,
    declined_at = NOW(),
    updated_at = NOW()
  WHERE id = p_request_id;

  v_notification_body := format('%s has declined your mobile session request for %s on %s at %s',
    v_practitioner_name, v_product_name,
    v_request.requested_date, v_request.requested_start_time);

  IF p_decline_reason IS NOT NULL THEN
    v_notification_body := v_notification_body || format('. Reason: %s', p_decline_reason);
  END IF;

  IF p_alternate_date IS NOT NULL AND p_alternate_start_time IS NOT NULL THEN
    v_notification_body := v_notification_body || format(' Suggested alternate time: %s at %s',
      p_alternate_date, p_alternate_start_time);
  END IF;

  PERFORM create_notification(
    v_request.client_id, 'booking_request', 'Mobile Session Request Declined',
    v_notification_body,
    jsonb_build_object(
      'request_id', p_request_id,
      'practitioner_id', v_request.practitioner_id,
      'practitioner_name', v_practitioner_name,
      'product_id', v_request.product_id,
      'product_name', v_product_name,
      'requested_date', v_request.requested_date,
      'requested_start_time', v_request.requested_start_time,
      'decline_reason', p_decline_reason,
      'alternate_date', p_alternate_date,
      'alternate_start_time', p_alternate_start_time,
      'alternate_suggestions', COALESCE(p_alternate_suggestions, '[]'::jsonb),
      'practitioner_notes', p_practitioner_notes
    ),
    'mobile_booking_request', p_request_id::text
  );

  PERFORM public.queue_mobile_request_client_email(p_request_id, 'mobile_decline');

  RETURN jsonb_build_object('success', true, 'request_id', p_request_id);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;
