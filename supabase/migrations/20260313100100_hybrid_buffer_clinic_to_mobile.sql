-- Extend directional buffer: clinic→mobile and mobile→mobile get 30 min for hybrid/mobile.
-- Aligns with frontend slot-generation-utils (clinic→mobile, mobile→mobile).

CREATE OR REPLACE FUNCTION public.get_directional_booking_buffer_minutes(
  p_therapist_type text,
  p_earlier_appointment_type text,
  p_later_appointment_type text
)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    -- Hybrid: mobile→clinic = 30 min return to clinic
    WHEN p_therapist_type = 'hybrid'
      AND COALESCE(p_earlier_appointment_type, 'clinic') = 'mobile'
      AND COALESCE(p_later_appointment_type, 'clinic') = 'clinic'
    THEN 30
    -- Hybrid: clinic→mobile = 30 min travel to client
    WHEN p_therapist_type = 'hybrid'
      AND COALESCE(p_earlier_appointment_type, 'clinic') = 'clinic'
      AND COALESCE(p_later_appointment_type, 'clinic') = 'mobile'
    THEN 30
    -- Mobile/hybrid: mobile→mobile = 30 min travel between clients
    WHEN p_therapist_type IN ('mobile', 'hybrid')
      AND COALESCE(p_earlier_appointment_type, 'clinic') = 'mobile'
      AND COALESCE(p_later_appointment_type, 'clinic') = 'mobile'
    THEN 30
    ELSE 15
  END;
$$;

comment on function public.get_directional_booking_buffer_minutes(text, text, text) is
  'Returns buffer minutes between appointments: 30 for mobile↔clinic and mobile↔mobile for hybrid/mobile; 15 otherwise.';
