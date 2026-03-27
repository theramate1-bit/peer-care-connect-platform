-- Allow public profile pages to read practitioner qualifications and qualification documents.
-- Scope is limited to active, completed practitioner profiles used in marketplace/public profile views.

DROP POLICY IF EXISTS "Public can view marketplace practitioner qualifications" ON public.qualifications;
CREATE POLICY "Public can view marketplace practitioner qualifications"
ON public.qualifications
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = qualifications.practitioner_id
      AND u.user_role IN ('sports_therapist', 'osteopath', 'massage_therapist')
      AND u.is_active = true
      AND u.profile_completed = true
      AND u.onboarding_status = 'completed'
  )
);

DROP POLICY IF EXISTS "Public can view marketplace practitioner qualification documents" ON public.practitioner_qualification_documents;
CREATE POLICY "Public can view marketplace practitioner qualification documents"
ON public.practitioner_qualification_documents
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = practitioner_qualification_documents.practitioner_id
      AND u.user_role IN ('sports_therapist', 'osteopath', 'massage_therapist')
      AND u.is_active = true
      AND u.profile_completed = true
      AND u.onboarding_status = 'completed'
  )
);
