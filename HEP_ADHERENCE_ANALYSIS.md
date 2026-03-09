# HEP Adherence & Program Tracking - Flow Analysis & Issues

## Current User Flow

### 1. Practitioner Creates HEP ✅
- Practitioner creates program via `HEPCreator`
- Program saved to `home_exercise_programs` table
- Linked to session (optional) and client
- **Status**: Working

### 2. Client Views HEP ✅
- Client sees HEP in `MySessions.tsx` or `ClientNotes.tsx`
- `HEPViewer` component displays program details
- Shows adherence percentage (calculated on-the-fly)
- **Status**: Working

### 3. Client Logs Completion ✅
- Client clicks "Log Completion" on exercise
- Fills in: pain_level, difficulty_rating, client_notes
- Data saved to `exercise_program_progress` table
- **Status**: Working

### 4. Adherence Calculation ⚠️ **ISSUES FOUND**
- Function: `calculate_program_adherence(p_program_id)`
- **Problem 1**: Counts `DISTINCT completed_date`, not exercise completions
  - If client logs 3 exercises on same day → counts as 1 completion
  - Should count total exercise completions, not unique dates
- **Problem 2**: Expected completions calculation
  - Formula: `(days_since_start / 7.0) * frequency_per_week`
  - This assumes 1 completion per day, but programs have multiple exercises
  - Doesn't account for number of exercises in program
- **Problem 3**: No deduplication
  - Client can log same exercise multiple times per day
  - No check to prevent duplicate logs

### 5. Practitioner Views Client Progress ❌ **MISSING**
- **No component exists** to show practitioners:
  - Exercise completions
  - Pain levels
  - Difficulty ratings
  - Client notes/feedback
- Practitioners can create HEPs but can't see if clients are doing them
- **Critical gap**: No visibility into client adherence

## Issues Summary

### 🔴 Critical Issues

1. **Adherence Calculation is Flawed**
   - Current: Counts unique dates, not exercise completions
   - Impact: Adherence % is inaccurate
   - Fix: Count total exercise completions, account for multiple exercises

2. **No Practitioner View of Client Progress**
   - Practitioners can't see if clients are completing exercises
   - Can't see pain levels, difficulty, or client feedback
   - Impact: No way to monitor client adherence or adjust programs

3. **No Deduplication**
   - Client can log same exercise multiple times per day
   - Impact: Inflated completion counts

### 🟡 Medium Issues

4. **Expected Completions Logic**
   - Doesn't account for multiple exercises per program
   - Should be: `(days / 7) * frequency * num_exercises` or similar

5. **No Historical View**
   - Can't see completion history over time
   - No trends or patterns visible

## Recommended Fixes

### Fix 1: Improve Adherence Calculation
```sql
-- Count total exercise completions, not unique dates
SELECT COUNT(*) INTO v_completed_exercises
FROM exercise_program_progress
WHERE program_id = p_program_id;

-- Or count unique exercise-date combinations
SELECT COUNT(DISTINCT (exercise_id, completed_date)) INTO v_completed_exercises
FROM exercise_program_progress
WHERE program_id = p_program_id;
```

### Fix 2: Add Deduplication
- Add unique constraint or check before insert
- Prevent logging same exercise multiple times per day

### Fix 3: Create Practitioner Progress View
- New component: `PractitionerHEPProgress.tsx`
- Show:
  - List of all HEPs for clients
  - Adherence percentages
  - Exercise completion details
  - Pain levels, difficulty, notes
- Add to `PracticeClientManagement.tsx` or new tab

### Fix 4: Improve Expected Completions
- Consider number of exercises in program
- Or track expected completions per exercise

## Longevity Concerns

1. **Scalability**: Current calculation will become inaccurate as programs grow
2. **Data Integrity**: No constraints prevent duplicate logs
3. **User Experience**: Practitioners have no visibility into client progress
4. **Maintenance**: Complex calculation logic in database function, hard to debug

