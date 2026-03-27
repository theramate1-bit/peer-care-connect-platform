-- Add appointment_type and visit_address to client_sessions for clinic/mobile/hybrid location logic.
-- Source of truth for emails and booking views: booking record first, then practitioner default.
ALTER TABLE public.client_sessions
  ADD COLUMN IF NOT EXISTS appointment_type text NOT NULL DEFAULT 'clinic',
  ADD COLUMN IF NOT EXISTS visit_address text;

COMMENT ON COLUMN public.client_sessions.appointment_type IS 'Where the session takes place: clinic (client travels to practitioner) or mobile (practitioner travels to client). Default clinic for backward compatibility.';
COMMENT ON COLUMN public.client_sessions.visit_address IS 'For mobile appointments: client/visit address. Null for clinic.';

-- Constrain allowed values (optional; keeps data clean)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'client_sessions_appointment_type_check'
  ) THEN
    ALTER TABLE public.client_sessions
      ADD CONSTRAINT client_sessions_appointment_type_check
      CHECK (appointment_type IN ('clinic', 'mobile'));
  END IF;
END $$;
