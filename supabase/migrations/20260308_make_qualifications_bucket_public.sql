-- Public profile pages for clients/guests need read-only access to qualification files.
-- Set the qualifications storage bucket to public so embedded previews can load.

UPDATE storage.buckets
SET public = true
WHERE id = 'qualifications';
