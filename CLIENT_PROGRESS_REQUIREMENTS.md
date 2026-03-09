# Client Progress Dashboard - Requirements & How It Works

## Overview
The "Client Progress" section on the practitioner dashboard shows recent updates about client activity. It displays the 3 most recent updates from three different sources.

## What Shows Up in Client Progress

The dashboard displays three types of progress updates:

### 1. **Exercise Completions** ✅
**Icon**: Green checkmark circle  
**Shows**: When a client completes an exercise from a home exercise program

**Required Data**:
- Table: `exercise_program_progress`
- Must have:
  - `program_id` → Links to `home_exercise_programs` table
  - `completed_at` or `completed_date` → When the exercise was completed
  - `session_id` (optional) → Links to the session where it was completed
- The program must belong to the practitioner (`program.practitioner_id = current_user.id`)

**Example Display**:
> "**Johnny Clienté** completed 'Knee Rehabilitation Program'."

### 2. **Treatment Notes** 📝
**Icon**: Blue edit icon  
**Shows**: When a new treatment note (SOAP note) is created for a client

**Required Data**:
- Table: `treatment_notes`
- Must have:
  - `practitioner_id` → Must match current practitioner
  - `session_id` → Links to `client_sessions` table
  - `created_at` → When the note was created
  - `content` → The note content

**Example Display**:
> "New note added for **Sarah Miller**."

### 3. **Pain Level Reports** ⚠️
**Icon**: Orange alert triangle  
**Shows**: When a client reports high pain levels (≥7/10)

**Required Data**:
- Table: `progress_metrics`
- Must have:
  - `practitioner_id` → Must match current practitioner
  - `metric_type` = `'pain_level'`
  - `value` ≥ 7 (only high pain levels are shown)
  - `session_date` → Date of the pain report
  - `client_id` → Links to the client

**Example Display**:
> "**Johnny Clienté** reported high pain levels (8/10)."

## Database Tables Required

### 1. `exercise_program_progress` Table
```sql
CREATE TABLE exercise_program_progress (
  id UUID PRIMARY KEY,
  program_id UUID REFERENCES home_exercise_programs(id),
  client_id UUID REFERENCES users(id),
  session_id UUID REFERENCES client_sessions(id), -- Optional
  exercise_name TEXT,
  completed_at TIMESTAMPTZ,
  completed_date DATE,
  -- ... other fields
);
```

### 2. `treatment_notes` Table
```sql
CREATE TABLE treatment_notes (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES client_sessions(id),
  practitioner_id UUID REFERENCES users(id),
  client_id UUID REFERENCES users(id),
  note_type TEXT,
  content TEXT,
  created_at TIMESTAMPTZ,
  -- ... other fields
);
```

### 3. `progress_metrics` Table
```sql
CREATE TABLE progress_metrics (
  id UUID PRIMARY KEY,
  client_id UUID REFERENCES users(id),
  practitioner_id UUID REFERENCES users(id),
  session_id UUID REFERENCES client_sessions(id), -- Optional
  metric_type TEXT CHECK (metric_type IN ('pain_level', 'mobility', 'strength', ...)),
  metric_name TEXT,
  value DECIMAL(10,2),
  max_value DECIMAL(10,2),
  session_date DATE,
  -- ... other fields
);
```

## How to Generate Progress Updates

### For Exercise Completions:
1. **Prescribe a Home Exercise Program**:
   - Go to Client Management → Select a client → Exercise Programs tab
   - Create a new exercise program for the client
   - Assign exercises to the program

2. **Client Completes Exercises**:
   - Client views their exercise program
   - Client marks exercises as completed
   - This creates a record in `exercise_program_progress` table

### For Treatment Notes:
1. **Create SOAP Notes**:
   - Go to Client Management → Select a client → Sessions tab
   - Click "Edit Notes" on a session
   - Fill in Subjective, Objective, Assessment, and Plan sections
   - Save the note
   - This creates records in `treatment_notes` table

### For Pain Level Reports:
1. **Add Pain Level Metrics**:
   - Go to Client Management → Select a client → Progress tab
   - Click "Add Metric" in the Pain Level section
   - Enter a pain level value (0-10)
   - If the value is 7 or higher, it will appear in the dashboard
   - This creates a record in `progress_metrics` table with `metric_type = 'pain_level'`

## Why "No recent progress updates" Shows

The dashboard shows "No recent progress updates" when:
- No exercise completions exist for your clients' programs
- No treatment notes have been created recently
- No pain level metrics ≥ 7 have been recorded

## Query Logic

The dashboard fetches:
- **Last 5 exercise completions** (ordered by `completed_at` DESC)
- **Last 5 treatment notes** (ordered by `created_at` DESC)
- **Last 5 pain metrics** with value ≥ 7 (ordered by `session_date` DESC)

Then it:
1. Combines all three types into one array
2. Sorts by date (most recent first)
3. Takes the top 3 updates
4. Displays them in the dashboard

## Troubleshooting

### If updates aren't showing:

1. **Check Data Exists**:
   ```sql
   -- Check exercise completions
   SELECT * FROM exercise_program_progress 
   WHERE program_id IN (
     SELECT id FROM home_exercise_programs 
     WHERE practitioner_id = 'your-user-id'
   ) 
   ORDER BY completed_at DESC LIMIT 5;
   
   -- Check treatment notes
   SELECT * FROM treatment_notes 
   WHERE practitioner_id = 'your-user-id'
   ORDER BY created_at DESC LIMIT 5;
   
   -- Check pain metrics
   SELECT * FROM progress_metrics 
   WHERE practitioner_id = 'your-user-id' 
   AND metric_type = 'pain_level' 
   AND value >= 7
   ORDER BY session_date DESC LIMIT 5;
   ```

2. **Check Foreign Key Relationships**:
   - Ensure `practitioner_id` matches your user ID
   - Ensure `client_id` exists in `users` table
   - Ensure `session_id` exists in `client_sessions` table (if provided)

3. **Check Date Fields**:
   - Exercise completions need `completed_at` or `completed_date`
   - Treatment notes need `created_at`
   - Pain metrics need `session_date`

4. **Check Permissions**:
   - Ensure you have SELECT permissions on all three tables
   - Ensure RLS (Row Level Security) policies allow you to read your clients' data

## Quick Start Guide

To see progress updates on your dashboard:

1. **Create a session** for a client
2. **Add a treatment note** (SOAP note) for that session
3. **OR** prescribe an exercise program and have the client complete exercises
4. **OR** add a pain level metric with value ≥ 7

The updates will appear automatically in the "Client Progress" section!


