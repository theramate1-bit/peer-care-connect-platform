# Story 8: Treatment Notes Navigation & Consistency - Implementation Plan

## Issues Identified

1. **Navigation Problem**: 
   - Link from SessionDetailView goes to `/practice/clients?session=${session.id}`
   - Need to verify this works for all session statuses (including completed)
   - Need consistent navigation from diary

2. **Re-editing Loophole**:
   - Completion is tracked via `session_recordings.status = 'completed'`
   - Client-side state (`isNoteCompleted`, `completedSessions`) can be lost on page refresh
   - No database-level enforcement to prevent editing completed notes
   - When accessing from diary, completion status might not be checked

3. **Inconsistency**:
   - Multiple entry points for editing notes
   - Completion check might not be consistent across all components
   - No standardized format enforcement

## Solution

### 1. Add Database-Level Status Field
- Add `status` field to `treatment_notes` table: `draft` | `completed`
- Add database constraint to prevent updates when status = 'completed'
- Migrate existing data to use this field

### 2. Fix Navigation
- Ensure treatment notes link works from SessionDetailView for all session statuses
- Add navigation from diary view
- Standardize URL parameters

### 3. Prevent Re-editing
- Add database-level check in RLS policy
- Add application-level check in all edit functions
- Show clear "Completed - View Only" indicator

### 4. Standardize Completion Check
- Create shared utility function to check if notes are completed
- Use this function consistently across all components
- Ensure completion status persists across page refreshes

## Implementation Steps

1. **Database Migration**: Add status field to treatment_notes
2. **Update RLS Policies**: Prevent updates when completed
3. **Create Utility Function**: Check completion status
4. **Update PracticeClientManagement**: Use database status
5. **Update SessionDetailView**: Ensure navigation works
6. **Update TreatmentNotes Page**: Add completion check
7. **Add UI Indicators**: Show "Completed" badge/status
