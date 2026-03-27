-- Grant EXECUTE on accept_mobile_booking_request and decline_mobile_booking_request.
-- These RPCs were added after GRANT ON ALL FUNCTIONS, so authenticated lacked permission.
-- Without these grants, practitioners get permission denied when Accept/Decline from the dashboard.

GRANT EXECUTE ON FUNCTION public.accept_mobile_booking_request(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_mobile_booking_request(uuid, text) TO service_role;

GRANT EXECUTE ON FUNCTION public.decline_mobile_booking_request(uuid, text, date, time without time zone, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decline_mobile_booking_request(uuid, text, date, time without time zone, jsonb, text) TO service_role;
