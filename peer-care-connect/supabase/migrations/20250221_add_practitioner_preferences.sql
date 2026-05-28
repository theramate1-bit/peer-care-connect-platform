-- Add practitioner preferences to practitioner_availability table
-- This makes default session time, duration, and other preferences real-time synced

ALTER TABLE public.practitioner_availability
ADD COLUMN IF NOT EXISTS default_session_time TIME DEFAULT '10:00',
ADD COLUMN IF NOT EXISTS default_duration_minutes INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS default_session_type TEXT DEFAULT 'Treatment Session';

-- Add comment explaining the fields
COMMENT ON COLUMN public.practitioner_availability.default_session_time IS 'Default start time for new sessions (e.g., "10:00")';
COMMENT ON COLUMN public.practitioner_availability.default_duration_minutes IS 'Default session duration in minutes (e.g., 60)';
COMMENT ON COLUMN public.practitioner_availability.default_session_type IS 'Default session type for new bookings';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_practitioner_availability_user_id ON public.practitioner_availability(user_id);
