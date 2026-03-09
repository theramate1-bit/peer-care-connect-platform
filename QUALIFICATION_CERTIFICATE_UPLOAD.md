# Qualification Certificate Upload - Complete Implementation

## ✅ **Issue: Qualification Certificates Not Being Uploaded or Displayed**

### **Problem Identified**
1. ❌ Onboarding had file upload UI, but file upload was **REQUIRED**, blocking users who didn't upload
2. ❌ If file wasn't uploaded, `qualification_file_url` remained `null`
3. ❌ Profile page showed certificate ONLY if it existed, but no way to upload it later
4. ❌ Certificate URL wasn't being passed to the `qualifications` table entry

## ✅ **Solution Implemented**

### **1. Made Certificate Upload OPTIONAL** ✅

**File**: `peer-care-connect/src/lib/onboarding-utils.ts`

**Changes**:
- Line 81-85: Changed from throwing error to just warning if no file
- Line 734-743: Made validation non-blocking (console.warn instead of errors.push)

**Result**: Users can complete onboarding WITHOUT uploading a certificate

### **2. Pass Certificate URL to Qualifications Table** ✅

**File**: `peer-care-connect/src/lib/onboarding-utils.ts`

**Changes**:
- Line 394: Now uses `qualificationFileUrl` (the uploaded file) when creating qualification entry
- Line 397-399: Added logging to track certificate_url being saved

**Result**: If a certificate IS uploaded during onboarding, it's linked to the qualification entry

### **3. Added Certificate Upload to Profile Page** ✅

**File**: `peer-care-connect/src/pages/Profile.tsx`

**Changes** (lines 1615-1686):
- Added file upload input for users WITHOUT a certificate
- Handles file upload to Supabase Storage `qualifications/` bucket
- Updates `users.qualification_file_url` after successful upload
- Shows "View Certificate" link for users WITH a certificate
- Displays upload status indicator

**Result**: Users can upload their certificate AFTER onboarding from their profile page

---

## 📋 **Complete User Flow**

### **Scenario 1: User Uploads Certificate During Onboarding**
1. User selects `qualification_type` (e.g., "ITMMIF")
2. User uploads certificate file (PDF/JPG/PNG)
3. `completePractitionerOnboarding()` runs:
   - ✅ Uploads file to `qualifications/{userId}/qualification_{timestamp}.{ext}`
   - ✅ Saves `qualification_file_url` to `users` table
   - ✅ Creates entry in `qualifications` table with `certificate_url`
4. Profile page shows "View Certificate" link

### **Scenario 2: User Skips Certificate Upload During Onboarding**
1. User selects `qualification_type` (e.g., "ITMMIF")
2. User doesn't upload certificate file
3. `completePractitionerOnboarding()` runs:
   - ⚠️ Warns about missing file (doesn't block)
   - ✅ Saves `qualification_type` to `users` table
   - ✅ Creates entry in `qualifications` table (certificate_url: null)
   - ✅ Onboarding completes successfully
4. Profile page shows file upload input
5. User uploads certificate from profile:
   - ✅ File uploaded to Supabase Storage
   - ✅ `users.qualification_file_url` updated
   - ✅ Profile refreshes, shows "View Certificate" link

### **Scenario 3: User Has No Qualification**
1. User selects `qualification_type: 'none'`
2. No file upload required
3. No entry created in `qualifications` table
4. Profile page doesn't show primary qualification section

---

## 🗂️ **Database Structure**

### **`users` Table**
```sql
qualification_type varchar          -- e.g., 'itmmif', 'atmmif', 'none'
qualification_file_url text         -- URL to uploaded certificate
qualification_expiry date           -- Expiry date of qualification
```

### **`qualifications` Table**
```sql
id uuid PRIMARY KEY
practitioner_id uuid REFERENCES users(id)
name varchar                        -- e.g., "ITMMIF (Institute of...)"
institution varchar                 -- Not collected during onboarding
year_obtained integer               -- Extracted from expiry date
certificate_url text                -- URL to uploaded certificate
verified boolean                    -- Admin verification flag
```

### **Supabase Storage**
- **Bucket**: `qualifications`
- **Path**: `qualifications/{userId}/qualification_{timestamp}.{ext}`
- **Public URL**: Generated automatically

---

## 🎯 **Profile Page Display**

### **Primary Qualification Certificate Section**
```
Primary Qualification (from onboarding)
├── Qualification Type: ITMMIF (read-only)
├── Expiry Date: 10/31/2025 (read-only)
└── Certificate File:
    ├── IF EXISTS: [View Certificate] • Uploaded
    └── IF MISSING: [File Upload Input] + Help text
```

### **Additional Qualifications Section**
```
Additional Qualifications
├── [Add Qualification] button
└── List of qualifications:
    └── ITMMIF (Institute of Team & Musculoskeletal Medicine)
        ├── Year: 2025
        ├── Status: Pending Verification
        └── [Edit] [Delete]
```

---

## ✅ **Testing Checklist**

### **Onboarding**
- [ ] User can complete onboarding WITH certificate upload
- [ ] User can complete onboarding WITHOUT certificate upload (no errors)
- [ ] Certificate file is uploaded to Storage
- [ ] `qualification_file_url` is saved to `users` table
- [ ] Qualification entry is created with correct `certificate_url`

### **Profile Page**
- [ ] Users WITH certificate see "View Certificate" link
- [ ] Link opens certificate in new tab
- [ ] Users WITHOUT certificate see file upload input
- [ ] Upload works and updates database
- [ ] Page refreshes to show the uploaded certificate

### **Qualifications Table**
- [ ] Primary qualification entry is auto-created
- [ ] `certificate_url` matches `users.qualification_file_url`
- [ ] Can add additional qualifications manually
- [ ] Additional qualifications can have their own certificates

---

## 📊 **Current Status**

### **Test Account: theramate1@gmail.com**
- ✅ `qualification_type`: "itmmif" 
- ✅ `qualification_expiry`: "2025-10-31"
- ❌ `qualification_file_url`: **null** (not uploaded during onboarding)
- ✅ Qualification entry created: "ITMMIF (Institute of Team & Musculoskeletal Medicine)"
- ✅ Can now upload certificate from profile page

---

## 🔄 **Future Enhancements**

1. **Certificate Verification Workflow**
   - Admin dashboard to review uploaded certificates
   - Toggle `verified` flag after manual review
   - Show verification badge on profile

2. **Certificate Expiry Notifications**
   - Email alerts 30/60/90 days before expiry
   - Dashboard warning for expired certificates
   - Prompt to upload renewed certificate

3. **Multiple Certificates per Qualification**
   - Allow uploading renewal certificates
   - Show history of previous certificates
   - Track renewal dates

4. **Certificate Preview**
   - Show PDF preview in modal instead of new tab
   - Support for image certificates (JPG/PNG)
   - OCR to extract expiry dates automatically

