# Qualification File Storage Setup

This document explains how to set up Supabase Storage for qualification file uploads in the practitioner onboarding flow.

---

## Prerequisites

- Supabase project access
- Admin permissions for Storage setup

---

## Step 1: Create Storage Bucket

1. Navigate to your Supabase Dashboard
2. Go to **Storage** in the left sidebar
3. Click **New bucket**
4. Configure as follows:
   - **Name:** `qualifications`
   - **Public:** Unchecked (keep private)
   - **File size limit:** 10 MB (recommended)
   - **Allowed MIME types:** `application/pdf, image/jpeg, image/png`

5. Click **Create bucket**

---

## Step 2: Configure Bucket Policies

### Policy 1: Allow Upload Own Files

**Name:** `Users can upload own qualification files`

**Policy Type:** INSERT

**Target roles:** `authenticated`

**Policy definition:**
```sql
(bucket_id = 'qualifications' AND auth.uid()::text = (storage.foldername(name))[1])
```

### Policy 2: Allow Read Own Files

**Name:** `Users can view own qualification files`

**Policy Type:** SELECT

**Target roles:** `authenticated`

**Policy definition:**
```sql
(bucket_id = 'qualifications' AND auth.uid()::text = (storage.foldername(name))[1])
```

### Policy 3: Allow Update Own Files

**Name:** `Users can update own qualification files`

**Policy Type:** UPDATE

**Target roles:** `authenticated`

**Policy definition:**
```sql
(bucket_id = 'qualifications' AND auth.uid()::text = (storage.foldername(name))[1])
```

### Policy 4: Allow Delete Own Files

**Name:** `Users can delete own qualification files`

**Policy Type:** DELETE

**Target roles:** `authenticated`

**Policy definition:**
```sql
(bucket_id = 'qualifications' AND auth.uid()::text = (storage.foldername(name))[1])
```

---

## Step 3: Admin View Policy (Optional)

If admins need to view all qualification files:

**Name:** `Admins can view all qualification files`

**Policy Type:** SELECT

**Target roles:** `authenticated`

**Policy definition:**
```sql
(bucket_id = 'qualifications' AND 
 EXISTS (
   SELECT 1 FROM users 
   WHERE id = auth.uid() 
   AND user_role = 'admin'
 ))
```

---

## Step 4: Verify Setup

### Test Upload from Code

The implementation will automatically:

1. Create folder structure: `qualifications/{userId}/`
2. Upload file with unique name: `{userId}/qualification_{timestamp}.{ext}`
3. Get public URL for the uploaded file
4. Store URL in `users.qualification_file_url`

### Example from Code:

```typescript
const fileExt = onboardingData.qualification_file.name.split('.').pop();
const fileName = `${userId}/qualification_${Date.now()}.${fileExt}`;
const filePath = `qualifications/${fileName}`;

const { error: uploadError } = await supabase.storage
  .from('qualifications')
  .upload(filePath, onboardingData.qualification_file);

if (!uploadError) {
  const { data: urlData } = supabase.storage
    .from('qualifications')
    .getPublicUrl(filePath);
  
  // Store urlData.publicUrl in database
}
```

---

## Troubleshooting

### Issue: "new row violates row-level security policy"

**Cause:** RLS policies not properly configured.

**Solution:** Ensure policies use correct syntax and user ID extraction.

### Issue: "The resource already exists"

**Cause:** Trying to upload file with same name.

**Solution:** Using timestamp in filename prevents this. Check implementation.

### Issue: "File size exceeds limit"

**Cause:** File is larger than 10MB bucket limit.

**Solution:** Validate file size client-side before upload.

### Issue: Files not visible in Supabase Dashboard

**Cause:** Files are in user-specific folders.

**Solution:** Navigate to: `qualifications` bucket > Search by user ID.

---

## Security Considerations

1. **File Type Validation:** Only PDF, JPG, PNG allowed
2. **File Size Limit:** 10MB maximum
3. **User Isolation:** Each user has their own folder
4. **Private Bucket:** Files not publicly accessible by default
5. **RLS Policies:** Only authenticated users can upload/view their own files

---

## Monitoring

### View Uploaded Files

1. Go to Supabase Dashboard > Storage
2. Select `qualifications` bucket
3. Browse folders by user ID
4. View individual files

### Storage Usage

Monitor storage usage in:
- **Dashboard** > **Storage** > **Total Size**
- Set up alerts for approaching limits

---

## Maintenance

### Cleanup Old Files

When users delete accounts or re-upload qualifications:

```typescript
// Delete old file when user re-uploads
const { error: deleteError } = await supabase.storage
  .from('qualifications')
  .remove([`${userId}/old-qualification.pdf`]);
```

### Backup Strategy

Qualification files contain sensitive data:
- Consider periodic backups
- Ensure GDPR/Health Data compliance
- Document retention policies

---

## Code Integration

The qualification upload is now integrated in:

**File:** `peer-care-connect/src/lib/onboarding-utils.ts`

**Function:** `completePractitionerOnboarding()`

**Lines:** 85-113

---

## Testing the Setup

### 1. Manual Test

1. Register as a practitioner
2. Upload a qualification file (PDF, JPG, or PNG)
3. Complete onboarding
4. Check Supabase Dashboard for uploaded file
5. Verify `qualification_file_url` in `users` table

### 2. Code Test

```bash
# Run practitioner onboarding tests
npm test -- --testPathPattern=practitioner-onboarding
```

---

## Success Criteria

- ✅ Bucket created with correct name
- ✅ RLS policies configured
- ✅ Files upload successfully
- ✅ File URLs stored in database
- ✅ Files viewable in Supabase Dashboard
- ✅ Error handling works

---

*Last updated: January 21, 2025*

