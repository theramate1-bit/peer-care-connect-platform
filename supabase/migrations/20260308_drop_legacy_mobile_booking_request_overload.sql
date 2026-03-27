-- Remove legacy overload to avoid PostgREST ambiguity (PGRST203).
-- Keep only the canonical signature with p_pre_assessment_payload jsonb.

DROP FUNCTION IF EXISTS public.create_mobile_booking_request(
  uuid,
  uuid,
  uuid,
  date,
  time,
  integer,
  text,
  numeric,
  numeric,
  text
);
