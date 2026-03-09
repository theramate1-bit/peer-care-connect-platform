# Exercise Prescription - Practitioner User Guide

## How Practitioners Access Exercise Prescription

### Navigation Path

1. **Go to Practice Client Management**
   - Navigate to `/practice/clients` or click "Clients" in the practitioner dashboard
   - This opens the `PracticeClientManagement` page

2. **Select a Client**
   - Choose a client from the client list on the left sidebar
   - Client details will appear in the main content area

3. **Open Exercise Programs Tab**
   - Click on the **"Exercise Programs"** tab in the client details section
   - This displays the `ClientProgressTracker` component with the exercises tab active

4. **Create New Exercise Program**
   - Click the **"Add Program"** button
   - This opens the `HEPCreator` component in a dialog/modal

---

## Creating an Exercise Program

### Step 1: Program Details

The `HEPCreator` component allows practitioners to:

1. **Set Program Title**
   - Default: "Home Exercise Program for [Client Name]"
   - Can be customized

2. **Add Program Description**
   - Optional description of the program's purpose

3. **Set Program Instructions**
   - General instructions (warm-up, cool-down, precautions, etc.)

4. **Set Frequency Per Week**
   - How many times per week the client should perform the exercises
   - Default: 3 times per week

### Step 2: Add Exercises

#### Option A: Add from Exercise Library

1. Click **"Add from Library"** button
2. A dialog opens showing the exercise library with:
   - **Search functionality** - Search exercises by name
   - **Category filter** - Filter by: strength, flexibility, cardio, mobility, balance, rehabilitation
   - **Difficulty filter** - Filter by: beginner, intermediate, advanced
3. Click on an exercise to view details
4. Click **"Add to Program"** to add it
5. The exercise is added to "Selected Exercises" with default sets (3) and reps (10)

#### Option B: Create Custom Exercise

1. Click **"Create Custom"** button
2. A dialog opens with fields:
   - **Exercise Name** (required)
   - **Description** (optional)
   - **Category** (dropdown: rehabilitation, strength, flexibility, cardio, mobility, balance)
   - **Instructions** (required) - How to perform the exercise
   - **Difficulty Level** (dropdown: beginner, intermediate, advanced)
3. Click **"Add to Program"**
4. The custom exercise is added with default sets (3) and reps (10)

### Step 3: Configure Each Exercise

For each exercise in "Selected Exercises", practitioners can:

1. **Adjust Sets and Reps**
   - Use the number inputs to set:
     - **Sets**: Number of sets (default: 3)
     - **Reps**: Number of repetitions per set (default: 10)

2. **Add Media Attachments** (Images/Videos)
   - Click the **"Add Images/Videos"** section
   - A tooltip explains: *"Add images/videos of yourself or client performing this exercise to help guide them later on!"*
   - Upload multiple files:
     - **Supported formats**: Images (jpg, png, gif) and Videos (mp4, mov, avi)
     - **File size limit**: Check `ExerciseMediaUpload` component for limits
   - Files are uploaded to Supabase Storage (`exercise-media` bucket)
   - Media attachments are stored per exercise in the program

3. **Remove Exercise**
   - Click the remove/trash button to remove an exercise from the program

### Step 4: Review and Create

1. Review all selected exercises
2. Ensure program details are complete
3. Click **"Create Program"** button
4. The program is:
   - Saved to the database (`home_exercise_programs` table)
   - Linked to the client
   - Optionally linked to a session (if `sessionId` is provided)
   - Delivered to the client via messaging

---

## Editing Existing Programs

1. In the Exercise Programs tab, find the program you want to edit
2. Click the **"Edit"** button on the program card
3. The `HEPEditor` component opens (similar to `HEPCreator`)
4. Make changes:
   - Modify program details
   - Add/remove exercises
   - Update sets/reps
   - Add/remove media attachments
5. Click **"Save Changes"**

---

## Key Features

### ✅ Exercise Library
- Browse pre-defined exercises
- Search and filter functionality
- View exercise details (description, instructions, difficulty, category)
- Exercises may have existing `video_url` or `image_url` from the library

### ✅ Custom Exercises
- Create personalized exercises
- Include name, description, instructions, category, difficulty
- Custom exercises are program-specific (not added to library)

### ✅ Media Attachments
- Upload images/videos for each exercise
- Multiple files per exercise
- Stored securely in Supabase Storage
- Accessible to clients when viewing their programs
- Tooltip explains the feature to practitioners

### ✅ Exercise Configuration
- Set sets and reps per exercise
- Adjust frequency per week for the entire program
- Add program-level instructions

### ✅ Program Management
- Create new programs
- Edit existing programs
- View program status (active, completed, paused, cancelled)
- Link programs to specific sessions

---

## Data Structure

### Exercise in Program (`ProgramExercise`)
```typescript
{
  id?: string,                    // Library exercise ID (if from library)
  name: string,                   // Exercise name
  description?: string,            // Exercise description
  category: string,               // Exercise category
  instructions: string,           // How to perform
  difficulty_level: string,       // beginner/intermediate/advanced
  sets: number,                   // Number of sets
  reps: number,                   // Number of reps
  frequency_per_week: number,     // Frequency (from program)
  notes?: string,                 // Optional notes
  media_attachments?: [           // Program-specific media
    {
      id: string,
      file_url: string,
      file_type: 'image' | 'video',
      thumbnail_url?: string,
      description?: string,
      uploaded_at: string
    }
  ]
}
```

### Program Structure (`HomeExerciseProgram`)
```typescript
{
  practitioner_id: string,
  client_id: string,
  session_id?: string,            // Optional session link
  title: string,
  description?: string,
  exercises: ProgramExercise[],   // Array of exercises
  instructions?: string,          // Program-level instructions
  frequency_per_week: number,
  status: 'active' | 'completed' | 'paused' | 'cancelled',
  delivered_via: 'messaging' | 'email' | 'both'
}
```

---

## Client View

Clients can access their exercise programs via:
- **My Exercises** page (`/client/exercises`)
- **Exercise Programs** tab in their dashboard

Clients see:
- Program title and description
- List of exercises with:
  - Exercise name, description, instructions
  - Sets and reps
  - Media attachments (images/videos) - both from library and program-specific
  - Ability to mark exercises as completed
  - Track completion history

---

## Technical Implementation

### Components
- **`HEPCreator`**: Component for creating new exercise programs
- **`HEPEditor`**: Component for editing existing programs
- **`ExerciseMediaUpload`**: Component for uploading media to exercises
- **`ClientProgressTracker`**: Container component that includes exercise program management
- **`HEPViewer`**: Component for clients to view their programs

### Services
- **`HEPService`**: Handles all backend operations
  - `getExercises()`: Fetch exercises from library
  - `createExercise()`: Add new exercise to library
  - `createProgram()`: Create new exercise program
  - `getClientPrograms()`: Get programs for a client
  - `updateProgram()`: Update existing program

### Database Tables
- **`exercise_library`**: Pre-defined exercises
- **`home_exercise_programs`**: Client exercise programs
- **Supabase Storage**: `exercise-media` bucket for media files

---

## Best Practices

1. **Use Library Exercises When Possible**
   - Library exercises may have existing videos/images
   - Reduces duplication
   - Easier to maintain

2. **Create Custom Exercises for Specific Needs**
   - Use when library doesn't have what you need
   - Great for client-specific modifications
   - Can include personalized media

3. **Add Media for Clarity**
   - Visual demonstrations help clients understand exercises
   - Can record yourself or client performing the exercise
   - Multiple angles/views can be helpful

4. **Set Appropriate Sets/Reps**
   - Consider client's fitness level
   - Start conservative and progress
   - Can be adjusted when editing program

5. **Provide Clear Instructions**
   - Program-level instructions for overall guidance
   - Exercise-level instructions for specific movements
   - Include precautions and modifications

---

## Troubleshooting

### Can't see "Exercise Programs" tab?
- Ensure you've selected a client
- Check that you're on the Practice Client Management page
- Verify you have practitioner permissions

### Can't add exercises?
- Check internet connection
- Verify exercise library is loading
- Try refreshing the page

### Media upload failing?
- Check file size (may be too large)
- Verify file format is supported
- Check Supabase Storage permissions
- Ensure `exercise-media` bucket exists

### Program not saving?
- Verify all required fields are filled
- Check that at least one exercise is added
- Ensure you're logged in as a practitioner
- Check browser console for errors

---

**Last Updated:** 2025-01-27  
**Component Version:** HEPCreator v1.0
