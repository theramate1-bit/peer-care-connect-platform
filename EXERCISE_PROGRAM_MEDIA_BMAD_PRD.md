# Exercise Program Media Enhancement - BMAD PRD

**Date:** 2025-02-21  
**Feature:** Custom Exercise Creation & Media Attachments for Home Exercise Programs  
**Method:** BMAD-METHOD (Brainstorm → Map → Analyze → Design)

---

## Vision

Enable practitioners to create personalized exercise programs with custom exercises and visual guidance (images/videos) that clients can easily access and follow outside therapy sessions.

---

## Success Criteria

1. **Practitioners can create custom exercises** with name, description, reps, and sets
2. **Practitioners can attach images/videos** to exercises in programs (not just library exercises)
3. **Clients can view exercise media** when accessing their programs
4. **Media attachments are stored securely** in Supabase Storage
5. **File upload feature is discoverable** via tooltip explanation

---

## User Journeys

### Journey 1: Practitioner Creates Custom Exercise with Media

**Actor:** Practitioner  
**Goal:** Create a personalized exercise program with custom exercises and visual demonstrations

**Steps:**
1. Navigate to Patient Management → Select Client → Exercise Programs → Add Program
2. Click "Add Exercise" → Select "Create Custom Exercise"
3. Enter exercise name, description, category, difficulty
4. Set reps and sets for this program
5. Click "Add Images/Videos" (with tooltip: "Add images/videos of yourself or client performing this exercise to help guide them later on!")
6. Upload image(s) or video(s) from device
7. Preview uploaded media
8. Add exercise to program
9. Repeat for additional exercises
10. Create and deliver program

**Success:** Program created with custom exercises containing media attachments

---

### Journey 2: Client Views Exercise Program with Media

**Actor:** Client  
**Goal:** Access exercise program and view visual demonstrations

**Steps:**
1. Navigate to My Exercises (or Exercise Programs tab)
2. View active exercise program
3. See exercise list with media indicators (image/video icons)
4. Click on exercise to expand details
5. View attached images/videos inline
6. Play video or view image gallery
7. Follow exercise instructions with visual guidance

**Success:** Client can view and follow exercises with visual demonstrations

---

## Functional Requirements

### FR-1: Custom Exercise Creation
**Capability:** Practitioners can create custom exercises directly in HEPCreator  
**Details:**
- Exercise name (required)
- Description (optional)
- Category (required): strength, flexibility, cardio, mobility, balance, rehabilitation
- Difficulty level (required): beginner, intermediate, advanced
- Instructions (required)
- Reps and sets configured per program (not stored in library)

**Acceptance:**
- Custom exercise form appears in HEPCreator dialog
- Exercise is added to program (not saved to library)
- Exercise appears in program exercises list

---

### FR-2: Exercise Media Attachments
**Capability:** Practitioners can attach images/videos to exercises in programs  
**Details:**
- Each exercise in a program can have multiple media attachments
- Supported formats: images (jpg, png, gif, webp), videos (mp4, webm, mov)
- Max file size: 50MB per file
- Media stored in Supabase Storage bucket: `exercise-media`
- Media URLs stored in exercise JSONB object in `home_exercise_programs.exercises`

**Acceptance:**
- File upload button appears next to each exercise in HEPCreator
- Tooltip explains feature: "Add images/videos of yourself or client performing this exercise to help guide them later on!"
- Upload progress shown during upload
- Preview of uploaded media displayed
- Media persists when program is saved

---

### FR-3: Media Display for Clients
**Capability:** Clients can view exercise media in their programs  
**Details:**
- Images displayed inline in exercise card
- Videos playable in embedded player
- Media gallery view for multiple attachments
- Responsive design for mobile/tablet

**Acceptance:**
- Media appears in HEPViewer for each exercise
- Images load and display correctly
- Videos play without errors
- Mobile-friendly media viewing

---

### FR-4: Media Storage & Security
**Capability:** Exercise media stored securely with proper access control  
**Details:**
- Storage bucket: `exercise-media`
- Path structure: `{practitioner_id}/{client_id}/{program_id}/{exercise_index}/{filename}`
- RLS policies: Practitioners can upload, clients can view their own programs' media
- Media URLs stored in program exercises JSONB

**Acceptance:**
- Files upload successfully to Supabase Storage
- RLS policies prevent unauthorized access
- Media URLs are accessible to authorized users only

---

## Technical Requirements

### TR-1: Database Schema
- No new tables required (uses existing `home_exercise_programs.exercises` JSONB)
- Exercise media URLs stored in exercise object: `{ media_attachments: [{ url, type, filename }] }`

### TR-2: Storage Bucket
- Create `exercise-media` bucket in Supabase
- Configure RLS policies for read/write access
- Set up CORS for media access

### TR-3: Component Updates
- `HEPCreator.tsx`: Add custom exercise form, file upload UI
- `HEPViewer.tsx`: Add media display components
- `HEPEditor.tsx`: Add media editing capability
- New: `ExerciseMediaUpload.tsx` component

### TR-4: Service Layer
- Update `HEPService` to handle media attachments
- Add file upload utility for exercise media
- Update `ProgramExercise` interface to include `media_attachments`

---

## Out of Scope (Future Enhancements)

- Removing duplicate exercises from library (not urgent, per acceptance criteria)
- Media editing/cropping tools
- Video compression/optimization
- Media sharing between programs
- Client-uploaded exercise videos

---

## Dependencies

- Supabase Storage configured
- File upload utilities (`FileUploadService`)
- Existing HEP system functional

---

## Risks & Mitigations

**Risk:** Large video files may cause upload failures  
**Mitigation:** Implement file size limits, compression for videos, progress indicators

**Risk:** Media URLs in JSONB may become invalid if storage files deleted  
**Mitigation:** Implement cleanup job or soft-delete for media, validate URLs on display

---

## Implementation Phases

### Phase 1: Core Functionality
- Custom exercise creation form
- File upload component
- Storage bucket setup
- Media attachment to exercises

### Phase 2: Display & UX
- Media display in HEPViewer
- Tooltip explanations
- Responsive media viewing
- Error handling

### Phase 3: Polish
- Media editing in HEPEditor
- Upload progress improvements
- Media gallery enhancements

---

## Traceability

**Vision → Success Criteria:**
- Vision: Personalized exercise programs with visual guidance
- SC-1: Custom exercises enable personalization
- SC-2-5: Media attachments provide visual guidance

**Success Criteria → User Journeys:**
- SC-1, SC-2 → Journey 1 (Practitioner creates custom exercise with media)
- SC-3, SC-4 → Journey 2 (Client views exercise media)

**User Journeys → Functional Requirements:**
- Journey 1 → FR-1 (Custom Exercise Creation), FR-2 (Media Attachments)
- Journey 2 → FR-3 (Media Display)
- Both → FR-4 (Storage & Security)

---

## Notes

- Custom exercises are program-specific (not saved to library) to allow flexibility
- Media attachments are per-exercise-in-program, not per-library-exercise
- Existing library exercises can still be used, but media can be added when adding to program
- Tooltip should be prominent and helpful for practitioners discovering the feature
