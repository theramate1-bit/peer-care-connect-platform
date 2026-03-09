-- Enable Realtime for critical availability tables
BEGIN;
  -- client_sessions (for new bookings)
  ALTER PUBLICATION supabase_realtime ADD TABLE client_sessions;

  -- calendar_events (for blocked time/unavailable slots)
  ALTER PUBLICATION supabase_realtime ADD TABLE calendar_events;

  -- practitioner_availability (for working hours changes)
  ALTER PUBLICATION supabase_realtime ADD TABLE practitioner_availability;
COMMIT;

