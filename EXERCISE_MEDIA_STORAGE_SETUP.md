# Exercise Media Storage Setup Guide

## Overview
This feature requires a Supabase Storage bucket named `exercise-media` with appropriate RLS policies.

## Storage Bucket Configuration

### Bucket Details
- **Bucket ID**: `exercise-media`
- **Public**: `true` (RLS policies control access)
- **File Size Limit**: 50MB (52,428,800 bytes)
- **Allowed MIME Types**:
  - Images: `image/jpeg`, `image/png`, `image/gif`, `image/webp`
  - Videos: `video/mp4`, `video/webm`, `video/quicktime`, `video/x-msvideo`

## Setup Instructions

### Option 1: Via Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **Storage** → **Buckets**
3. Click **New bucket**
4. Configure:
   - **Name**: `exercise-media`
   - **Public bucket**: ✅ Enabled
   - **File size limit**: `52428800` (50MB)
   - **Allowed MIME types**: 
     ```
     image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime,video/x-msvideo
     ```
5. Click **Create bucket**

### Option 2: Via SQL (Requires Service Role)

If you have service role access, you can run the migration file:
```sql
-- See: supabase/migrations/20250221_exercise_media_storage.sql
```

**Note**: Storage policies may need to be created via the dashboard or Supabase Management API due to permission restrictions.

## RLS Policies Required

The following policies need to be set up in the Supabase dashboard under **Storage** → **Policies** for the `exercise-media` bucket:

### 1. Practitioners can upload exercise media
- **Operation**: INSERT
- **Policy Name**: "Practitioners can upload exercise media"
- **Policy Definition**:
```sql
bucket_id = 'exercise-media' AND
auth.uid()::text = (storage.foldername(name))[1]
```

### 2. Practitioners can view their exercise media
- **Operation**: SELECT
- **Policy Name**: "Practitioners can view their exercise media"
- **Policy Definition**:
```sql
bucket_id = 'exercise-media' AND
auth.uid()::text = (storage.foldername(name))[1]
```

### 3. Clients can view their exercise media
- **Operation**: SELECT
- **Policy Name**: "Clients can view their exercise media"
- **Policy Definition**:
```sql
bucket_id = 'exercise-media' AND
EXISTS (
  SELECT 1 FROM home_exercise_programs
  WHERE home_exercise_programs.client_id = auth.uid()
  AND (storage.foldername(name))[2] = home_exercise_programs.client_id::text
)
```

### 4. Practitioners can delete their exercise media
- **Operation**: DELETE
- **Policy Name**: "Practitioners can delete their exercise media"
- **Policy Definition**:
```sql
bucket_id = 'exercise-media' AND
auth.uid()::text = (storage.foldername(name))[1]
```

### 5. Service role has full access
- **Operation**: ALL
- **Policy Name**: "Service role has full access to exercise-media"
- **Policy Definition**:
```sql
bucket_id = 'exercise-media'
```

## File Path Structure

Files are stored with the following path structure:
```
{practitioner_id}/{client_id}/{program_id or 'temp'}/{exercise_index}/{timestamp}-{filename}
```

Example:
```
abc123-def456/ghi789-jkl012/prog-xyz789/0/1737484800000-exercise_demo.mp4
```

## Verification

After setup, verify the bucket exists:
1. Go to **Storage** → **Buckets**
2. Confirm `exercise-media` bucket is listed
3. Check that policies are active under **Storage** → **Policies**

## Edge Functions

**No edge functions are required** for this feature. All file operations are handled client-side using the Supabase Storage JavaScript client.

## Troubleshooting

### Error: "Bucket does not exist"
- Verify bucket was created in Supabase dashboard
- Check bucket name matches exactly: `exercise-media`

### Error: "Permission denied"
- Verify RLS policies are created and active
- Check user has appropriate role (practitioner or client)
- Ensure policies reference correct bucket_id

### Error: "File size too large"
- Verify file is under 50MB
- Check bucket file_size_limit setting

### Error: "Invalid MIME type"
- Verify file type is in allowed list
- Check bucket allowed_mime_types configuration
