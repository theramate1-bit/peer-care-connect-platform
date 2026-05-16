-- Default session preferences for new bookings (aligned with web AvailabilitySettings upsert).
ALTER TABLE public.practitioner_availability
  ADD COLUMN IF NOT EXISTS default_session_time TEXT DEFAULT '10:00',
  ADD COLUMN IF NOT EXISTS default_duration_minutes INTEGER DEFAULT 60,
  ADD COLUMN IF NOT EXISTS default_session_type TEXT DEFAULT 'Treatment Session';

COMMENT ON COLUMN public.practitioner_availability.default_session_time IS 'Preferred default start time (HH:mm) for new sessions';
COMMENT ON COLUMN public.practitioner_availability.default_duration_minutes IS 'Preferred default duration in minutes';
COMMENT ON COLUMN public.practitioner_availability.default_session_type IS 'Label for default session type (e.g. Treatment Session)';
