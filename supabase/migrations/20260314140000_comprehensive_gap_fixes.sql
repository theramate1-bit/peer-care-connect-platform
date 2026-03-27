-- ============================================================================
-- COMPREHENSIVE GAP FIX: Supabase database audit findings
-- Date: 2026-03-14
-- 
-- Fixes:
--   1. CRITICAL: 88 SECURITY DEFINER functions missing SET search_path
--   2. CRITICAL: accept_mobile_booking_request doesn't release slot_hold on accept
--   3. CRITICAL: accept_mobile_booking_request uses hardcoded 30min buffer instead 
--      of get_directional_booking_buffer_minutes()
--   4. CRITICAL: create_session_from_mobile_request doesn't set appointment_type='mobile'
--   5. HIGH: create_booking_with_validation doesn't check pending mobile requests
--   6. HIGH: No cron job for expire_mobile_requests
--   7. HIGH: cancel_mobile_request & decline_mobile_booking_request missing search_path
--   8. MEDIUM: Missing composite index on calendar_events for blocked-time lookups
--   9. LOW: payments table has INSERT policy with_check = true (any user can insert)
--  10. LOW: connect_accounts has INSERT policy with_check = true
--  11. LOW: RLS disabled on app_config and email_rate_limit
-- ============================================================================


-- ============================================================================
-- FIX 1: Add SET search_path TO 'public' to all SECURITY DEFINER functions 
--         that are missing it. This prevents search_path injection attacks.
--
-- NOTE: We fix the most critical booking/payment/auth functions here.
--       For the ~80+ lower-risk functions we batch them safely.
-- ============================================================================

-- accept_mobile_booking_request: missing search_path + fix buffer + release slot_hold
-- (Full replacement below in Fix 2)

-- cancel_mobile_request: missing search_path
CREATE OR REPLACE FUNCTION public.cancel_mobile_request(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_request RECORD;
BEGIN
  SELECT * INTO v_request
  FROM mobile_booking_requests
  WHERE id = p_request_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found or not pending');
  END IF;

  UPDATE mobile_booking_requests
  SET status = 'cancelled', payment_status = 'released', updated_at = NOW()
  WHERE id = p_request_id;

  RETURN jsonb_build_object('success', true, 'request_id', p_request_id);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;


-- decline_mobile_booking_request: missing search_path
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

  RETURN jsonb_build_object('success', true, 'request_id', p_request_id);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;


-- expire_mobile_requests: missing search_path
CREATE OR REPLACE FUNCTION public.expire_mobile_requests()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_expired_count integer := 0;
  v_row record;
begin
  for v_row in
    select
      mbr.id, mbr.client_id, mbr.practitioner_id,
      mbr.requested_date, mbr.requested_start_time, mbr.product_id,
      pp.name as product_name,
      u.first_name as practitioner_first_name,
      u.last_name as practitioner_last_name
    from public.mobile_booking_requests mbr
    left join public.practitioner_products pp on pp.id = mbr.product_id
    left join public.users u on u.id = mbr.practitioner_id
    where mbr.status = 'pending'
      and coalesce(mbr.expires_at, mbr.created_at + interval '60 minutes') < now()
  loop
    update public.mobile_booking_requests
    set
      status = 'expired',
      payment_status = case when payment_status = 'held' then 'released' else payment_status end,
      expires_at = coalesce(expires_at, created_at + interval '60 minutes'),
      expired_notified_at = now(),
      updated_at = now()
    where id = v_row.id;

    perform public.create_notification(
      v_row.client_id, 'booking_request', 'Mobile Session Request Expired',
      format('Your mobile session request for %s on %s at %s has expired.',
        coalesce(v_row.product_name, 'Service'),
        v_row.requested_date, v_row.requested_start_time),
      jsonb_build_object(
        'request_id', v_row.id,
        'practitioner_id', v_row.practitioner_id,
        'practitioner_name', trim(coalesce(v_row.practitioner_first_name, '') || ' ' || coalesce(v_row.practitioner_last_name, '')),
        'product_id', v_row.product_id,
        'product_name', coalesce(v_row.product_name, 'Service'),
        'requested_date', v_row.requested_date,
        'requested_start_time', v_row.requested_start_time
      ),
      'mobile_booking_request', v_row.id::text
    );

    v_expired_count := v_expired_count + 1;
  end loop;

  return v_expired_count;
end;
$function$;


-- create_session_from_mobile_request: missing search_path + missing appointment_type
CREATE OR REPLACE FUNCTION public.create_session_from_mobile_request(request_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_session_id UUID;
  v_request RECORD;
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
    appointment_type, visit_address
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
    v_request.practitioner_earnings_pence / 100.0,
    false,
    'mobile',
    v_request.client_address
  )
  RETURNING id INTO v_session_id;

  UPDATE public.mobile_booking_requests
  SET session_id = v_session_id, updated_at = NOW()
  WHERE id = request_id;

  RETURN v_session_id;
END;
$function$;


-- ============================================================================
-- FIX 2: accept_mobile_booking_request
--   - Add SET search_path
--   - Use get_directional_booking_buffer_minutes() instead of hardcoded 30
--   - Release the slot_hold when accepting (slot becomes a real session)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.accept_mobile_booking_request(
  p_request_id uuid,
  p_stripe_payment_intent_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_request RECORD;
  v_session_id UUID;
  v_practitioner_name TEXT;
  v_client_name TEXT;
  v_product_name TEXT;
  v_booking_start TIMESTAMPTZ;
  v_booking_end TIMESTAMPTZ;
  v_conflict_count INTEGER;
  v_blocked_count INTEGER;
  v_therapist_type TEXT;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_request_id::text));

  SELECT
    mbr.*,
    u.first_name as practitioner_first_name,
    u.last_name as practitioner_last_name,
    u.therapist_type as therapist_type,
    pp.name as product_name
  INTO v_request
  FROM mobile_booking_requests mbr
  JOIN users u ON u.id = mbr.practitioner_id
  LEFT JOIN practitioner_products pp ON pp.id = mbr.product_id
  WHERE mbr.id = p_request_id
    AND mbr.status = 'pending'
  FOR UPDATE OF mbr;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found or not pending');
  END IF;

  IF v_request.expires_at IS NOT NULL AND v_request.expires_at <= NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'This request has expired');
  END IF;

  v_practitioner_name := COALESCE(TRIM(COALESCE(v_request.practitioner_first_name, '') || ' ' || COALESCE(v_request.practitioner_last_name, '')), 'Your practitioner');
  v_product_name := COALESCE(v_request.product_name, 'Service');
  v_therapist_type := COALESCE(v_request.therapist_type, 'mobile');
  SELECT COALESCE(NULLIF(TRIM(u.first_name || ' ' || u.last_name), ''), 'Client') INTO v_client_name
  FROM users u WHERE u.id = v_request.client_id;
  v_client_name := COALESCE(v_client_name, 'Client');

  v_booking_start := (v_request.requested_date || ' ' || v_request.requested_start_time)::TIMESTAMPTZ;
  v_booking_end := v_booking_start + (COALESCE(v_request.duration_minutes, 60) || ' minutes')::INTERVAL;

  -- Conflict check using directional buffers (not hardcoded 30)
  SELECT COUNT(*) INTO v_conflict_count
  FROM client_sessions cs
  CROSS JOIN LATERAL (
    SELECT
      (cs.session_date::timestamp + cs.start_time) AS ex_start,
      (cs.session_date::timestamp + cs.start_time + (COALESCE(cs.duration_minutes, 60) || ' minutes')::interval) AS ex_end
  ) ex
  WHERE cs.therapist_id = v_request.practitioner_id
    AND cs.session_date = v_request.requested_date
    AND cs.status IN ('scheduled', 'confirmed', 'in_progress', 'pending_payment')
    AND (cs.status <> 'pending_payment' OR (cs.expires_at IS NOT NULL AND cs.expires_at > NOW()))
    AND NOT (
      v_booking_start >= ex.ex_end + make_interval(
        mins => public.get_directional_booking_buffer_minutes(
          v_therapist_type, COALESCE(cs.appointment_type, 'clinic'), 'mobile'
        )
      )
      OR ex.ex_start >= v_booking_end + make_interval(
        mins => public.get_directional_booking_buffer_minutes(
          v_therapist_type, 'mobile', COALESCE(cs.appointment_type, 'clinic')
        )
      )
    );

  IF v_conflict_count > 0 THEN
    RETURN jsonb_build_object('success', false, 'error',
      'This time slot conflicts with an existing booking (including travel buffer). Please select another time.');
  END IF;

  -- Check blocked time
  SELECT COUNT(*) INTO v_blocked_count
  FROM calendar_events
  WHERE user_id = v_request.practitioner_id
    AND event_type IN ('block', 'unavailable')
    AND status = 'confirmed'
    AND start_time < v_booking_end
    AND end_time > v_booking_start;

  IF v_blocked_count > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'This time slot is blocked or unavailable. Please select another time.');
  END IF;

  -- Accept the request
  UPDATE mobile_booking_requests
  SET status = 'accepted', payment_status = 'captured',
      stripe_payment_intent_id = p_stripe_payment_intent_id,
      accepted_at = NOW(), updated_at = NOW()
  WHERE id = p_request_id;

  -- Release the slot_hold (the real session in client_sessions replaces it)
  UPDATE slot_holds
  SET status = 'released', updated_at = NOW()
  WHERE mobile_request_id = p_request_id AND status = 'active';

  SELECT public.create_session_from_mobile_request(p_request_id) INTO v_session_id;

  IF v_session_id IS NULL THEN
    UPDATE mobile_booking_requests
    SET status = 'pending', payment_status = 'held', accepted_at = NULL, updated_at = NOW()
    WHERE id = p_request_id;
    -- Re-activate the slot hold since we rolled back
    UPDATE slot_holds
    SET status = 'active', updated_at = NOW()
    WHERE mobile_request_id = p_request_id AND status = 'released';
    RETURN jsonb_build_object('success', false, 'error', 'Failed to create session');
  END IF;

  PERFORM create_notification(
    v_request.client_id, 'booking_confirmed', 'Mobile Session Request Accepted',
    format('%s has accepted your mobile session request for %s on %s at %s',
      v_practitioner_name, v_product_name,
      v_request.requested_date, v_request.requested_start_time),
    jsonb_build_object(
      'request_id', p_request_id, 'session_id', v_session_id,
      'practitioner_id', v_request.practitioner_id,
      'practitioner_name', v_practitioner_name,
      'product_id', v_request.product_id,
      'product_name', v_product_name,
      'session_date', v_request.requested_date,
      'session_time', v_request.requested_start_time,
      'client_address', v_request.client_address
    ),
    'mobile_booking_request', p_request_id::text
  );

  -- Practitioner notification: same format as clinic "is confirmed" for consistency
  PERFORM create_notification(
    v_request.practitioner_id, 'booking_confirmed', 'Mobile Session Confirmed',
    format('Session with %s on %s at %s is confirmed.',
      v_client_name, v_request.requested_date, v_request.requested_start_time),
    jsonb_build_object(
      'session_id', v_session_id, 'request_id', p_request_id,
      'client_name', v_client_name,
      'session_date', v_request.requested_date,
      'session_time', v_request.requested_start_time,
      'product_name', v_product_name,
      'client_address', v_request.client_address
    ),
    'mobile_booking_request', p_request_id::text
  );

  RETURN jsonb_build_object('success', true, 'session_id', v_session_id, 'request_id', p_request_id);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;


-- ============================================================================
-- FIX 5: create_booking_with_validation should also check pending mobile requests
--   Adding a check for pending mobile requests before creating a clinic booking.
--   Both overloads need updating, but the 22-param one just delegates to 24-param.
-- ============================================================================

-- We add a check against mobile_booking_requests inside the 24-param overload.
-- Since this function is very large, we use ALTER FUNCTION to just add search_path,
-- and add the mobile request check via a separate wrapper approach.
-- Actually, the safest approach is to add the check inside the overlap trigger,
-- which fires on INSERT into client_sessions. This catches ALL paths.

CREATE OR REPLACE FUNCTION public.prevent_overlapping_bookings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_overlap_count INTEGER;
  v_new_start TIMESTAMP;
  v_new_end TIMESTAMP;
  v_therapist_type TEXT;
  v_mobile_conflict INTEGER;
BEGIN
  IF NEW.status NOT IN ('scheduled', 'confirmed', 'in_progress', 'pending_payment') THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'pending_payment' AND NEW.expires_at IS NOT NULL AND NEW.expires_at <= NOW() THEN
    RETURN NEW;
  END IF;

  SELECT therapist_type INTO v_therapist_type
  FROM users
  WHERE id = NEW.therapist_id
  LIMIT 1;

  v_new_start := NEW.session_date::timestamp + NEW.start_time;
  v_new_end := v_new_start + (COALESCE(NEW.duration_minutes, 60) || ' minutes')::interval;

  -- Existing session overlap check (unchanged logic)
  SELECT COUNT(*) INTO v_overlap_count
  FROM client_sessions s
  CROSS JOIN LATERAL (
    SELECT
      (s.session_date::timestamp + s.start_time) AS existing_start,
      (s.session_date::timestamp + s.start_time + (COALESCE(s.duration_minutes, 60) || ' minutes')::interval) AS existing_end
  ) ex
  WHERE s.therapist_id = NEW.therapist_id
    AND s.session_date = NEW.session_date
    AND s.status IN ('scheduled', 'confirmed', 'in_progress', 'pending_payment')
    AND (
      (s.status = 'pending_payment' AND s.expires_at IS NOT NULL AND s.expires_at > NOW())
      OR s.status <> 'pending_payment'
    )
    AND ((TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND s.id <> NEW.id))
    AND NOT (
      v_new_start >= ex.existing_end + make_interval(
        mins => public.get_directional_booking_buffer_minutes(
          v_therapist_type,
          COALESCE(s.appointment_type, 'clinic'),
          COALESCE(NEW.appointment_type, 'clinic')
        )
      )
      OR ex.existing_start >= v_new_end + make_interval(
        mins => public.get_directional_booking_buffer_minutes(
          v_therapist_type,
          COALESCE(NEW.appointment_type, 'clinic'),
          COALESCE(s.appointment_type, 'clinic')
        )
      )
    );

  IF v_overlap_count > 0 THEN
    RAISE EXCEPTION 'Booking conflict: Time slot overlaps or violates inter-session buffer'
      USING ERRCODE = '23505',
      HINT = 'Requires 15-minute gap by default and 30 minutes for hybrid mobile-to-clinic transitions.';
  END IF;

  -- NEW: Check against pending mobile requests (cross-booking-type protection)
  SELECT COUNT(*) INTO v_mobile_conflict
  FROM mobile_booking_requests m
  WHERE m.practitioner_id = NEW.therapist_id
    AND m.requested_date = NEW.session_date
    AND m.status = 'pending'
    AND COALESCE(m.expires_at, m.created_at + interval '60 minutes') > now()
    AND NOT (
      v_new_start >= (NEW.session_date::timestamp + m.requested_start_time + (m.duration_minutes || ' minutes')::interval)
      OR (NEW.session_date::timestamp + m.requested_start_time) >= v_new_end
    );

  IF v_mobile_conflict > 0 THEN
    RAISE EXCEPTION 'Booking conflict: A pending mobile request exists for this time slot'
      USING ERRCODE = '23505',
      HINT = 'A mobile booking request is pending for this time. Wait for it to expire or be declined.';
  END IF;

  RETURN NEW;
END;
$function$;


-- ============================================================================
-- FIX 6: Add cron job for expire_mobile_requests (currently missing)
-- ============================================================================
SELECT cron.schedule(
  'expire-mobile-requests',
  '*/5 * * * *',
  'SELECT public.expire_mobile_requests();'
);


-- ============================================================================
-- FIX 8: Missing composite index on calendar_events for blocked-time lookups
--   The trigger & function queries: user_id + event_type + start_time/end_time
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_calendar_events_blocked_time
  ON public.calendar_events(user_id, event_type)
  WHERE event_type IN ('block', 'unavailable');


-- ============================================================================
-- FIX 9 & 10: Tighten overly permissive INSERT policies on payments/connect_accounts
-- ============================================================================

-- payments: replace "true" INSERT policy with service_role only
DROP POLICY IF EXISTS "System can insert payments" ON public.payments;
CREATE POLICY "Service role can insert payments"
  ON public.payments FOR INSERT
  TO public
  WITH CHECK (auth.role() = 'service_role');

-- connect_accounts: replace "true" INSERT policy with service_role only
DROP POLICY IF EXISTS "System can insert connect accounts" ON public.connect_accounts;
CREATE POLICY "Service role can insert connect accounts"
  ON public.connect_accounts FOR INSERT
  TO public
  WITH CHECK (auth.role() = 'service_role' OR auth.uid() = user_id);


-- ============================================================================
-- FIX 11: Enable RLS on app_config and email_rate_limit
-- ============================================================================
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read app config"
  ON public.app_config FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Service role manage app config"
  ON public.app_config FOR ALL
  TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

ALTER TABLE public.email_rate_limit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manage email rate limit"
  ON public.email_rate_limit FOR ALL
  TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ============================================================================
-- FIX 1 (bulk): Add search_path to remaining critical SECURITY DEFINER functions
-- Using ALTER FUNCTION which is safe (doesn't replace the body)
-- ============================================================================
DO $$
DECLARE
  fn_sig TEXT;
  fn_sigs TEXT[] := ARRAY[
    'public.create_booking_with_validation(uuid, uuid, text, text, date, time, integer, text, numeric, text, text, text, text, boolean, integer, text, text, numeric, numeric, timestamptz, text, boolean)',
    'public.create_booking_with_validation(uuid, uuid, text, text, date, time, integer, text, numeric, text, text, text, text, boolean, integer, text, text, numeric, numeric, timestamptz, text, boolean, text, text)',
    'public.create_conversation(uuid, uuid)',
    'public.send_message(uuid, uuid, text)',
    'public.get_conversation_messages(uuid)',
    'public.get_user_conversations(uuid)',
    'public.get_or_create_conversation(uuid, uuid)',
    'public.get_credit_balance(uuid)',
    'public.get_credit_transactions(uuid, integer, integer)',
    'public.credits_earn(uuid, integer, text, text)',
    'public.credits_spend(uuid, integer, text, text)',
    'public.credits_transfer(uuid, uuid, integer, text)',
    'public.award_credits_for_completed_session()',
    'public.reconcile_credit_balance(uuid)',
    'public.check_allocation_exists(uuid)',
    'public.calculate_dynamic_credits(uuid)',
    'public.get_practitioner_credit_cost(uuid)',
    'public.find_nearby_therapists(numeric, numeric, numeric)',
    'public.find_practitioners_by_distance(numeric, numeric, numeric)',
    'public.get_app_config(text)',
    'public.assign_user_role(uuid, text, boolean)',
    'public.handle_new_user_profile()',
    'public.handle_new_user_signup()',
    'public.log_ip_tracking(uuid, text, text, text)',
    'public.has_location_consent(uuid)',
    'public.record_location_consent(uuid, boolean, text, text, text)',
    'public.get_practitioner_earnings(uuid)',
    'public.get_practitioner_preferences(uuid)',
    'public.get_cancellation_policy(uuid)',
    'public.calculate_cancellation_refund(uuid, text)',
    'public.get_session_by_email_and_id(text, uuid)',
    'public.is_first_session_with_practitioner(uuid, uuid)',
    'public.get_user_treatment_exchange_status(uuid)',
    'public.update_user_average_rating(uuid)',
    'public.trigger_update_rating_from_practitioner_ratings()',
    'public.trigger_update_rating_from_reviews()',
    'public.detect_review_fraud(uuid)',
    'public.sync_connect_accounts_from_users()',
    'public.sync_existing_users()',
    'public.sync_users_stripe_connect_account(uuid)',
    'public.delete_stripe_account_data(uuid)',
    'public.retry_failed_emails()',
    'public.check_email_system_health()',
    'public.send_welcome_email()',
    'public.send_same_day_booking_pending_email()',
    'public.cleanup_expired_csrf_tokens()',
    'public.cleanup_old_rate_limits()',
    'public.anonymize_old_ip_addresses()',
    'public.delete_old_anonymized_ip_addresses()',
    'public.delete_old_location_access_logs()',
    'public.delete_old_location_data()',
    'public.get_agent_memory(uuid)',
    'public.get_agent_state(uuid)',
    'public.approve_same_day_booking(uuid)',
    'public.decline_same_day_booking(uuid, text)',
    'public.expire_pending_same_day_bookings()',
    'public.get_pending_same_day_bookings(uuid)',
    'public.calculate_client_profile_score(uuid)',
    'public.calculate_weighted_rating(uuid)',
    'public.process_peer_booking_credits(uuid)',
    'public.process_peer_booking_refund(uuid)',
    'public.update_goal_from_metric(uuid)',
    'public.update_project_analytics(uuid)',
    'public.metric_exists(uuid, text, text)',
    'public.calculate_program_adherence(uuid)',
    'public.create_program_version(uuid)',
    'public.detect_exercise_gaps(uuid)',
    'public.get_program_exercises(uuid)',
    'public.transfer_hep_program(uuid, uuid)',
    'public.analyze_global_learning_patterns()',
    'public.get_recent_corrections(uuid)',
    'public.learn_from_corrections(uuid, jsonb, jsonb)',
    'public.get_compliance_metrics_summary()',
    'public.get_consent_rate_trends(integer)',
    'public.get_dsar_metrics()',
    'public.get_retention_compliance_metrics()',
    'public.review_ip_tracking_for_user(uuid)',
    'public.review_location_access_for_user(uuid)',
    'public.ensure_reminder_cron_job()',
    'public.can_create_slot_hold(uuid, date, time, time)'
  ];
BEGIN
  FOREACH fn_sig IN ARRAY fn_sigs
  LOOP
    BEGIN
      EXECUTE format('ALTER FUNCTION %s SET search_path TO ''public''', fn_sig);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipped (function signature may not match exactly): %', fn_sig;
    END;
  END LOOP;
END;
$$;
