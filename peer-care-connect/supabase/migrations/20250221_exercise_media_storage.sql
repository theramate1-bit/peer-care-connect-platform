-- Exercise Media Storage Setup
-- Creates storage bucket and policies for exercise program media attachments

-- Create storage bucket for exercise media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'exercise-media',
  'exercise-media',
  true, -- Public bucket for easier access (RLS policies control access)
  52428800, -- 50MB file size limit
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-msvideo'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist (to allow re-running migration)
DROP POLICY IF EXISTS "Practitioners can upload exercise media" ON storage.objects;
DROP POLICY IF EXISTS "Practitioners can view their exercise media" ON storage.objects;
DROP POLICY IF EXISTS "Clients can view their exercise media" ON storage.objects;
DROP POLICY IF EXISTS "Practitioners can delete their exercise media" ON storage.objects;
DROP POLICY IF EXISTS "Service role has full access to exercise-media" ON storage.objects;

-- RLS Policies for exercise-media bucket

-- Practitioners can upload media for their programs
CREATE POLICY "Practitioners can upload exercise media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'exercise-media' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Practitioners can view media they uploaded
CREATE POLICY "Practitioners can view their exercise media"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'exercise-media' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Clients can view media for their programs
CREATE POLICY "Clients can view their exercise media"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'exercise-media' AND
  EXISTS (
    SELECT 1 FROM home_exercise_programs
    WHERE home_exercise_programs.client_id = auth.uid()
    AND (storage.foldername(name))[2] = home_exercise_programs.client_id::text
  )
);

-- Practitioners can delete their own media
CREATE POLICY "Practitioners can delete their exercise media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'exercise-media' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Service role has full access
CREATE POLICY "Service role has full access to exercise-media"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'exercise-media');

COMMENT ON POLICY "Practitioners can upload exercise media" ON storage.objects IS 
  'Allows practitioners to upload images/videos for exercises in their programs';

COMMENT ON POLICY "Clients can view their exercise media" ON storage.objects IS 
  'Allows clients to view media attached to their exercise programs';
