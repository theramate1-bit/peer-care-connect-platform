-- Profile Photos Storage Bucket Migration
-- This migration creates the profile-photos storage bucket for user profile images

-- Create storage bucket for profile photos (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('profile-photos', 'profile-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for profile-photos bucket
-- Users can upload their own profile photos
CREATE POLICY "Users can upload their own profile photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'profile-photos' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can view their own profile photos
CREATE POLICY "Users can view their own profile photos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'profile-photos' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can update their own profile photos
CREATE POLICY "Users can update their own profile photos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'profile-photos' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own profile photos
CREATE POLICY "Users can delete their own profile photos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'profile-photos' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Public read access for profile photos (so they can be displayed)
CREATE POLICY "Public can view profile photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'profile-photos');
