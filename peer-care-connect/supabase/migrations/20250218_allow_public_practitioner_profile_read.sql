-- Allow anonymous users to read individual practitioner profiles for public profile pages
-- This policy allows reading practitioner profiles that meet marketplace criteria
-- Used for /therapist/:id/public routes

CREATE POLICY "Allow public read of practitioner profiles"
ON public.users
FOR SELECT
TO anon, authenticated
USING (
  -- Must be a practitioner role
  user_role IN ('sports_therapist', 'osteopath', 'massage_therapist')
  -- Must meet marketplace criteria
  AND is_active = true
  AND profile_completed = true
  AND onboarding_status = 'completed'
);

