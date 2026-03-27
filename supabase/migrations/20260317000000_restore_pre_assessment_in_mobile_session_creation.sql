-- Restore pre-assessment handling in create_session_from_mobile_request.
-- Later migrations (comprehensive_gap_fixes, fix_create_session_from_mobile_request_no_location)
-- stripped out the pre-assessment logic. This restores it so mobile sessions show "Form Completed"
-- when the client submitted pre-assessment data with their request.
--
-- 1. Add client_sessions columns for pre-assessment (if missing)
-- 2. Restore pre_assessment_payload -> pre_assessment_forms logic
-- 3. Update client_sessions with pre_assessment_form_id and pre_assessment_completed

ALTER TABLE public.client_sessions
  ADD COLUMN IF NOT EXISTS pre_assessment_required boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS pre_assessment_completed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS pre_assessment_form_id uuid REFERENCES public.pre_assessment_forms(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.create_session_from_mobile_request(request_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_session_id UUID;
  v_request RECORD;
  v_client RECORD;
  v_payload jsonb;
  v_form_id UUID;
BEGIN
  SELECT
    mbr.*,
    COALESCE(NULLIF(TRIM(u.first_name || ' ' || u.last_name), ''), 'Client') AS client_name,
    COALESCE(u.email, '') AS client_email
  INTO v_request
  FROM public.mobile_booking_requests mbr
  LEFT JOIN public.users u ON u.id = mbr.client_id
  WHERE mbr.id = request_id
    AND mbr.status = 'accepted';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or not accepted';
  END IF;

  INSERT INTO public.client_sessions (
    therapist_id, client_id, client_name, client_email,
    session_date, start_time, duration_minutes, session_type,
    status, price, payment_status, stripe_payment_intent_id,
    platform_fee_amount, practitioner_amount,
    is_guest_booking,
    appointment_type, visit_address,
    pre_assessment_required, pre_assessment_completed, pre_assessment_form_id
  ) VALUES (
    v_request.practitioner_id,
    v_request.client_id,
    COALESCE(v_request.client_name, 'Client'),
    COALESCE(NULLIF(TRIM(v_request.client_email), ''), 'no-email@placeholder.local'),
    v_request.requested_date,
    v_request.requested_start_time,
    v_request.duration_minutes,
    (SELECT name FROM public.practitioner_products WHERE id = v_request.product_id),
    'confirmed',
    v_request.total_price_pence / 100.0,
    'completed',
    v_request.stripe_payment_intent_id,
    v_request.platform_fee_pence / 100.0,
    v_request.practitioner_earnings_pence,
    false,
    'mobile',
    v_request.client_address,
    false, false, NULL
  )
  RETURNING id INTO v_session_id;

  UPDATE public.mobile_booking_requests
  SET session_id = v_session_id, updated_at = NOW()
  WHERE id = request_id;

  v_payload := v_request.pre_assessment_payload;
  IF v_payload IS NOT NULL AND jsonb_typeof(v_payload) = 'object' THEN
    IF v_request.client_id IS NOT NULL THEN
      SELECT id, email, first_name, last_name INTO v_client
      FROM public.users WHERE id = v_request.client_id;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.pre_assessment_forms paf
      WHERE paf.session_id = v_session_id AND paf.completed_at IS NOT NULL
    ) THEN
      INSERT INTO public.pre_assessment_forms (
        session_id, client_id, client_email, client_name,
        name, date_of_birth, contact_email, contact_phone,
        gp_name, gp_address, current_medical_conditions, past_medical_history,
        area_of_body, time_scale, how_issue_began, activities_affected,
        body_map_markers, is_guest_booking, is_initial_session,
        completed_at, created_at, updated_at
      ) VALUES (
        v_session_id,
        v_request.client_id,
        COALESCE(v_client.email, v_request.client_email, ''),
        COALESCE(NULLIF(TRIM(COALESCE(v_client.first_name, '') || ' ' || COALESCE(v_client.last_name, '')), ''), v_request.client_name, 'Client'),
        NULLIF(v_payload->>'name', ''),
        NULLIF(v_payload->>'date_of_birth', '')::date,
        NULLIF(v_payload->>'contact_email', ''),
        NULLIF(v_payload->>'contact_phone', ''),
        NULLIF(v_payload->>'gp_name', ''),
        NULLIF(v_payload->>'gp_address', ''),
        NULLIF(v_payload->>'current_medical_conditions', ''),
        NULLIF(v_payload->>'past_medical_history', ''),
        NULLIF(v_payload->>'area_of_body', ''),
        NULLIF(v_payload->>'time_scale', ''),
        NULLIF(v_payload->>'how_issue_began', ''),
        NULLIF(v_payload->>'activities_affected', ''),
        COALESCE(v_payload->'body_map_markers', '[]'::jsonb),
        (v_request.client_id IS NULL),
        COALESCE((v_payload->>'required')::boolean, true),
        NOW(), NOW(), NOW()
      )
      RETURNING id INTO v_form_id;

      UPDATE public.client_sessions
      SET
        pre_assessment_form_id = v_form_id,
        pre_assessment_completed = true,
        pre_assessment_required = true
      WHERE id = v_session_id;
    END IF;
  END IF;

  RETURN v_session_id;
END;
$function$;

COMMENT ON FUNCTION public.create_session_from_mobile_request(uuid) IS
  'Creates a client_sessions row from an accepted mobile_booking_request. Copies pre_assessment_payload into pre_assessment_forms and links via pre_assessment_form_id.';
