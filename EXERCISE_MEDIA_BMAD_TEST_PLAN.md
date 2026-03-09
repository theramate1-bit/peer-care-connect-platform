# Exercise Program Media Feature - BMAD Test Plan

**Date:** 2025-02-21  
**Feature:** Custom Exercise Creation & Media Attachments  
**Method:** BMAD-METHOD (Breakthrough Method for Agile AI Driven Development)  
**Status:** Test Execution Ready

---

## Test Objectives

### Primary Objectives
1. **Verify custom exercise creation** - Practitioners can create exercises with name, description, reps, sets
2. **Validate media upload** - Images/videos upload successfully to Supabase Storage
3. **Test media display** - Clients can view exercise media correctly
4. **Confirm data persistence** - Media attachments persist in program exercises JSONB
5. **Verify RLS policies** - Storage access controls work correctly

### Secondary Objectives
1. **File validation** - Invalid file types and sizes are rejected
2. **Error handling** - Graceful handling of upload failures
3. **Responsive design** - Media displays correctly on mobile/tablet
4. **Performance** - Upload progress indicators work
5. **Accessibility** - Tooltips and UI elements are accessible

---

## Test Scenarios

### Scenario 1: Custom Exercise Creation
**User Type**: Practitioner  
**Goal**: Verify practitioners can create custom exercises with all required fields

**Test Steps**:
1. Navigate to Patient Management → Select Client → Exercise Programs → Add Program
2. Click "Create Custom" button
3. Fill in exercise form:
   - Name: "Custom Shoulder Stretch"
   - Description: "Gentle stretch for shoulder mobility"
   - Category: "rehabilitation"
   - Difficulty: "beginner"
   - Instructions: "Stand with arm extended, slowly rotate shoulder"
4. Click "Add to Program"
5. Verify exercise appears in selected exercises list
6. Verify sets/reps default to 3/10
7. Verify exercise can be edited (sets/reps)

**Success Criteria**:
- ✅ Custom exercise form opens
- ✅ All fields are required/validated correctly
- ✅ Exercise appears in program list
- ✅ Sets/reps are configurable
- ✅ Exercise is program-specific (not in library)

**Expected Result**: Custom exercise created and added to program

---

### Scenario 2: Media Upload - Images
**User Type**: Practitioner  
**Goal**: Verify image upload works for exercises

**Test Steps**:
1. Create or select exercise in program
2. Click "Add Images/Videos" button
3. Verify tooltip appears: "Add images/videos of yourself or client performing this exercise to help guide them later on!"
4. Select image file (JPEG, < 50MB)
5. Verify upload progress indicator appears
6. Verify image preview appears in grid
7. Verify image can be removed
8. Verify image can be viewed fullscreen

**Success Criteria**:
- ✅ File input accepts images
- ✅ Upload progress shows
- ✅ Image preview displays
- ✅ Image stored in `exercise-media` bucket
- ✅ Image URL stored in exercise `media_attachments` array

**Expected Result**: Image uploaded and attached to exercise

---

### Scenario 3: Media Upload - Videos
**User Type**: Practitioner  
**Goal**: Verify video upload works for exercises

**Test Steps**:
1. Create or select exercise in program
2. Click "Add Images/Videos" button
3. Select video file (MP4, < 50MB)
4. Verify upload progress indicator appears
5. Verify video thumbnail appears in grid
6. Verify video can be played
7. Verify video can be removed

**Success Criteria**:
- ✅ File input accepts videos
- ✅ Upload progress shows
- ✅ Video thumbnail displays
- ✅ Video stored in `exercise-media` bucket
- ✅ Video URL stored in exercise `media_attachments` array

**Expected Result**: Video uploaded and attached to exercise

---

### Scenario 4: Media Upload - Multiple Files
**User Type**: Practitioner  
**Goal**: Verify multiple files can be uploaded per exercise

**Test Steps**:
1. Create or select exercise in program
2. Click "Add Images/Videos" button
3. Select multiple files (2 images, 1 video)
4. Verify all files upload
5. Verify all previews appear in grid
6. Verify each file can be removed individually

**Success Criteria**:
- ✅ Multiple files upload successfully
- ✅ All previews display in grid
- ✅ Individual file removal works
- ✅ Remaining files persist

**Expected Result**: Multiple media files attached to exercise

---

### Scenario 5: File Validation
**User Type**: Practitioner  
**Goal**: Verify invalid files are rejected

**Test Steps**:
1. Create or select exercise in program
2. Click "Add Images/Videos" button
3. Attempt to upload:
   - Invalid file type (e.g., .pdf)
   - File > 50MB
   - Valid file (should succeed)
4. Verify error messages appear for invalid files
5. Verify valid file uploads successfully

**Success Criteria**:
- ✅ Invalid file types rejected with error message
- ✅ Files > 50MB rejected with error message
- ✅ Valid files accepted
- ✅ Error messages are clear and actionable

**Expected Result**: Invalid files rejected, valid files accepted

---

### Scenario 6: Client Media View
**User Type**: Client  
**Goal**: Verify clients can view exercise media

**Test Steps**:
1. Log in as client
2. Navigate to My Exercises
3. View active exercise program
4. Verify exercises with media show media indicators
5. Click on exercise to expand
6. Verify images display inline
7. Verify videos show play button
8. Click image/video to view fullscreen
9. Verify media gallery layout is responsive

**Success Criteria**:
- ✅ Media indicators visible
- ✅ Images display correctly
- ✅ Videos show thumbnail with play button
- ✅ Click-to-view fullscreen works
- ✅ Responsive grid layout (2 cols mobile, 3 cols desktop)
- ✅ Library exercise media (video_url/image_url) also displays

**Expected Result**: Client can view all exercise media

---

### Scenario 7: Program Creation with Media
**User Type**: Practitioner  
**Goal**: Verify programs with media are created and saved correctly

**Test Steps**:
1. Create program with:
   - Custom exercise with media
   - Library exercise with media
   - Multiple exercises
2. Click "Create & Deliver Program"
3. Verify program is created
4. Verify media attachments persist in database
5. Log in as client
6. Verify program appears with all media

**Success Criteria**:
- ✅ Program created successfully
- ✅ Media URLs stored in exercises JSONB
- ✅ Client can view program with media
- ✅ All media files accessible

**Expected Result**: Program with media created and accessible to client

---

### Scenario 8: Storage Access Control
**User Type**: Practitioner & Client  
**Goal**: Verify RLS policies work correctly

**Test Steps**:
1. As practitioner: Upload media to exercise
2. Verify practitioner can view their uploaded media
3. As client: Verify client can view media for their programs
4. As different practitioner: Attempt to access another practitioner's media
5. Verify access is denied (if policies configured)

**Success Criteria**:
- ✅ Practitioners can upload/view their own media
- ✅ Clients can view media for their programs
- ✅ Unauthorized access is blocked (if policies active)

**Expected Result**: Storage access controls work as expected

---

### Scenario 9: Library Exercise with Media
**User Type**: Practitioner  
**Goal**: Verify library exercises can have media added when added to program

**Test Steps**:
1. Click "Add from Library"
2. Select exercise from library
3. Add exercise to program
4. Verify media upload UI appears for library exercise
5. Upload media to library exercise
6. Verify media is attached to exercise in program
7. Verify library exercise's original media (video_url/image_url) also displays

**Success Criteria**:
- ✅ Library exercises can have additional media
- ✅ Program-specific media stored separately
- ✅ Both library and program media display for client

**Expected Result**: Library exercises support additional media attachments

---

### Scenario 10: Error Handling
**User Type**: Practitioner  
**Goal**: Verify graceful error handling

**Test Steps**:
1. Attempt upload with network disconnected
2. Attempt upload to non-existent bucket
3. Attempt upload with invalid credentials
4. Verify error messages are clear
5. Verify UI doesn't break
6. Verify retry is possible

**Success Criteria**:
- ✅ Network errors handled gracefully
- ✅ Error messages are clear and actionable
- ✅ UI remains functional
- ✅ User can retry upload

**Expected Result**: Errors handled gracefully with clear messaging

---

## Technical Test Cases

### TC1: Component Rendering
- **Test**: Verify all components render without errors
- **Files**: 
  - `HEPCreator.tsx`
  - `ExerciseMediaUpload.tsx`
  - `HEPViewer.tsx`
- **Expected**: No console errors, components mount successfully

### TC2: Type Safety
- **Test**: Verify TypeScript types are correct
- **Files**: 
  - `hep-service.ts` (ExerciseMediaAttachment, ProgramExercise)
- **Expected**: No TypeScript errors, types match database schema

### TC3: Storage Bucket Existence
- **Test**: Verify `exercise-media` bucket exists
- **Method**: Query Supabase Storage buckets
- **Expected**: Bucket exists with correct configuration

### TC4: Database Schema
- **Test**: Verify exercises JSONB can store media_attachments
- **Method**: Check `home_exercise_programs.exercises` structure
- **Expected**: JSONB accepts media_attachments array

### TC5: File Path Structure
- **Test**: Verify file paths follow expected structure
- **Expected**: `{practitioner_id}/{client_id}/{program_id}/{exercise_index}/{filename}`

---

## Build & Compilation Tests

### TC6: Build Success
- **Test**: Verify project builds without errors
- **Command**: `npm run build`
- **Expected**: Build succeeds with no errors

### TC7: Linter Checks
- **Test**: Verify no linter errors
- **Command**: Check linter output
- **Expected**: No linting errors

### TC8: Import Resolution
- **Test**: Verify all imports resolve correctly
- **Expected**: No module resolution errors

---

## Performance Tests

### TC9: Upload Performance
- **Test**: Verify upload progress updates smoothly
- **Expected**: Progress indicator updates in real-time

### TC10: Media Loading
- **Test**: Verify media loads quickly for clients
- **Expected**: Images/videos load within 2 seconds on good connection

### TC11: Large File Handling
- **Test**: Verify large files (close to 50MB) upload successfully
- **Expected**: Large files upload with progress tracking

---

## Accessibility Tests

### TC12: Keyboard Navigation
- **Test**: Verify all interactive elements are keyboard accessible
- **Expected**: Tab navigation works, Enter/Space activate buttons

### TC13: Screen Reader
- **Test**: Verify tooltips and labels are announced
- **Expected**: Screen reader announces "Add images/videos..." tooltip

### TC14: Focus Management
- **Test**: Verify focus moves appropriately during upload
- **Expected**: Focus remains visible and logical

---

## Mobile Responsiveness Tests

### TC15: Mobile Layout
- **Test**: Verify media grid adapts to mobile screens
- **Expected**: 2 columns on mobile, 3 on desktop

### TC16: Touch Targets
- **Test**: Verify buttons are large enough for touch
- **Expected**: Minimum 44x44px touch targets

### TC17: Mobile Upload
- **Test**: Verify file upload works on mobile devices
- **Expected**: File picker opens, upload works

---

## Integration Tests

### TC18: End-to-End Flow
- **Test**: Complete flow from exercise creation to client viewing
- **Steps**:
  1. Practitioner creates custom exercise
  2. Practitioner uploads media
  3. Practitioner creates program
  4. Client views program
  5. Client views media
- **Expected**: All steps complete successfully

### TC19: Real-time Updates
- **Test**: Verify media appears immediately after upload
- **Expected**: No page refresh needed, media appears instantly

### TC20: Data Persistence
- **Test**: Verify media persists after page refresh
- **Expected**: Media still attached after reload

---

## Test Execution Checklist

### Pre-Test Setup
- [ ] Storage bucket `exercise-media` created
- [ ] RLS policies configured (if applicable)
- [ ] Test practitioner account ready
- [ ] Test client account ready
- [ ] Test media files prepared (images, videos, invalid files)

### Build Verification
- [ ] `npm run build` succeeds
- [ ] No TypeScript errors
- [ ] No linter errors
- [ ] All imports resolve

### Component Tests
- [ ] HEPCreator renders
- [ ] ExerciseMediaUpload renders
- [ ] HEPViewer renders
- [ ] Custom exercise dialog opens/closes
- [ ] File input triggers

### Functional Tests
- [ ] Custom exercise creation works
- [ ] Image upload works
- [ ] Video upload works
- [ ] Multiple file upload works
- [ ] File validation works
- [ ] Media removal works
- [ ] Program creation with media works
- [ ] Client media view works

### Integration Tests
- [ ] End-to-end flow works
- [ ] Data persists correctly
- [ ] Media accessible after program creation

### Error Handling
- [ ] Invalid file types rejected
- [ ] Large files rejected
- [ ] Network errors handled
- [ ] Error messages are clear

### Accessibility
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Tooltips accessible

### Mobile
- [ ] Responsive layout works
- [ ] Touch targets adequate
- [ ] Mobile upload works

---

## Success Criteria

✅ **Feature is complete when:**
1. All test scenarios (1-10) pass
2. All technical test cases (TC1-TC20) pass
3. Build succeeds without errors
4. No critical bugs remain
5. Media uploads and displays correctly
6. Clients can view exercise media
7. Error handling is robust
8. Mobile experience is smooth

---

## Known Issues & Limitations

### Current Limitations
- RLS policies need manual setup via dashboard (permission restrictions)
- Media uploaded before program creation uses 'temp' folder (works but not ideal)
- No video compression/optimization (large files may be slow)

### Future Enhancements
- Automatic video compression
- Media editing/cropping
- Bulk media operations
- Media library for reuse

---

## Test Results Template

```
### Test Execution Date: [DATE]

#### Build Tests
- TC6: Build Success - [PASS/FAIL]
- TC7: Linter Checks - [PASS/FAIL]
- TC8: Import Resolution - [PASS/FAIL]

#### Functional Tests
- Scenario 1: Custom Exercise Creation - [PASS/FAIL]
- Scenario 2: Media Upload - Images - [PASS/FAIL]
- Scenario 3: Media Upload - Videos - [PASS/FAIL]
- Scenario 4: Multiple Files - [PASS/FAIL]
- Scenario 5: File Validation - [PASS/FAIL]
- Scenario 6: Client Media View - [PASS/FAIL]
- Scenario 7: Program Creation with Media - [PASS/FAIL]
- Scenario 8: Storage Access Control - [PASS/FAIL]
- Scenario 9: Library Exercise with Media - [PASS/FAIL]
- Scenario 10: Error Handling - [PASS/FAIL]

#### Technical Tests
- TC1: Component Rendering - [PASS/FAIL]
- TC2: Type Safety - [PASS/FAIL]
- TC3: Storage Bucket - [PASS/FAIL]
- TC4: Database Schema - [PASS/FAIL]
- TC5: File Path Structure - [PASS/FAIL]

#### Performance Tests
- TC9: Upload Performance - [PASS/FAIL]
- TC10: Media Loading - [PASS/FAIL]
- TC11: Large File Handling - [PASS/FAIL]

#### Accessibility Tests
- TC12: Keyboard Navigation - [PASS/FAIL]
- TC13: Screen Reader - [PASS/FAIL]
- TC14: Focus Management - [PASS/FAIL]

#### Mobile Tests
- TC15: Mobile Layout - [PASS/FAIL]
- TC16: Touch Targets - [PASS/FAIL]
- TC17: Mobile Upload - [PASS/FAIL]

#### Integration Tests
- TC18: End-to-End Flow - [PASS/FAIL]
- TC19: Real-time Updates - [PASS/FAIL]
- TC20: Data Persistence - [PASS/FAIL]

### Summary
- Total Tests: 20
- Passed: [X]
- Failed: [Y]
- Blocked: [Z]
- Pass Rate: [X%]
```

---

## Notes

- Follow BMAD Method principles: structured workflows, scale-adaptive intelligence
- Test incrementally after each component
- Document any deviations from expected behavior
- Reference: [BMAD-METHOD Documentation](https://github.com/bmad-code-org/BMAD-METHOD)
- Storage bucket must be created before testing
- RLS policies may need manual configuration
