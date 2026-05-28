-- Allow public (anon + authenticated) to read practitioner availability and
-- session times needed for the marketplace booking calendar.
-- Required for CalendarTimeSelector and guest booking flows.

-- 1) practitioner_availability: allow anyone to read working_hours for any practitioner
--    so the calendar can show available days/times.
DROP POLICY IF EXISTS "Allow public read of practitioner availability for booking" ON public.practitioner_availability;
CREATE POLICY "Allow public read of practitioner availability for booking"
ON public.practitioner_availability
FOR SELECT
TO anon, authenticated
USING (true);

-- 2) client_sessions: allow anyone to read session time slots for availability.
--    Restrict to active booking statuses so we don't expose cancelled/completed details.
DROP POLICY IF EXISTS "Allow public read of session times for availability" ON public.client_sessions;
CREATE POLICY "Allow public read of session times for availability"
ON public.client_sessions
FOR SELECT
TO anon, authenticated
USING (
  status IN ('scheduled', 'confirmed', 'in_progress', 'pending_payment')
);
