-- Align legacy create_booking_with_validation overload with the appointment-type-aware implementation.
-- This preserves backward compatibility for old callers while enforcing the new directional buffer logic.

CREATE OR REPLACE FUNCTION public.create_booking_with_validation(
  p_therapist_id uuid,
  p_client_id uuid,
  p_client_name text,
  p_client_email text,
  p_session_date date,
  p_start_time time without time zone,
  p_duration_minutes integer,
  p_session_type text,
  p_price numeric,
  p_client_phone text DEFAULT NULL::text,
  p_notes text DEFAULT NULL::text,
  p_payment_status text DEFAULT 'pending'::text,
  p_status text DEFAULT 'pending_payment'::text,
  p_is_peer_booking boolean DEFAULT false,
  p_credit_cost integer DEFAULT 0,
  p_stripe_session_id text DEFAULT NULL::text,
  p_stripe_payment_intent_id text DEFAULT NULL::text,
  p_platform_fee_amount numeric DEFAULT NULL::numeric,
  p_practitioner_amount numeric DEFAULT NULL::numeric,
  p_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_idempotency_key text DEFAULT NULL::text,
  p_is_guest_booking boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN public.create_booking_with_validation(
    p_therapist_id => p_therapist_id,
    p_client_id => p_client_id,
    p_client_name => p_client_name,
    p_client_email => p_client_email,
    p_session_date => p_session_date,
    p_start_time => p_start_time,
    p_duration_minutes => p_duration_minutes,
    p_session_type => p_session_type,
    p_price => p_price,
    p_client_phone => p_client_phone,
    p_notes => p_notes,
    p_payment_status => p_payment_status,
    p_status => p_status,
    p_is_peer_booking => p_is_peer_booking,
    p_credit_cost => p_credit_cost,
    p_stripe_session_id => p_stripe_session_id,
    p_stripe_payment_intent_id => p_stripe_payment_intent_id,
    p_platform_fee_amount => p_platform_fee_amount,
    p_practitioner_amount => p_practitioner_amount,
    p_expires_at => p_expires_at,
    p_idempotency_key => p_idempotency_key,
    p_is_guest_booking => p_is_guest_booking,
    p_appointment_type => 'clinic',
    p_visit_address => NULL
  );
END;
$function$;
