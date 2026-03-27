# Pre-Assessment Form: Practitioner View UX Plan

## Overview

This document outlines where and how practitioners should view pre-assessment forms submitted by clients after booking, based on UX best practices and current codebase patterns.

## UX Principles Applied

Based on BMad Method principles and current codebase patterns:

1. **Progressive Disclosure**: Show status at a glance, details on demand
2. **Information Hierarchy**: Most important info (required forms) should be most visible
3. **Consistency**: Follow existing badge/status patterns in the codebase
4. **Contextual Access**: Pre-assessment info should be accessible where practitioners need it most

## Placement Strategy

### 1. Session List View (`PracticeClientManagement.tsx`)

**Location**: Session cards in the "Sessions" tab

**Implementation**:

- Add `PreAssessmentStatus` badge next to existing badges (status, "Note Completed")
- Show in both **Upcoming Sessions** and **Past Sessions** sections
- Badge states:
  - ✅ **Green "Form Completed"** - Form submitted, clickable to view
  - ⚠️ **Red "Form Required"** - Required but not completed (upcoming sessions only)
  - ℹ️ **Gray "Optional"** - Not required (subsequent sessions)

**Visual Placement**:

```
┌─────────────────────────────────────────┐
│ Session #1 • Initial Assessment          │
│ [Session #1] [Confirmed] [Form Required] │ ← Add here
│                                          │
│ [Edit Notes]                             │
└─────────────────────────────────────────┘
```

**Code Location**:

- Line ~3457: Past sessions badge area
- Line ~3523: Upcoming sessions badge area

### 2. Session Detail View (`SessionDetailView.tsx`)

**Location**: Main content area, after "Session Information" card

**Implementation**:

- Add new `Card` component titled "Pre-Assessment Form"
- Use `PreAssessmentStatus` component with `showViewButton={true}`
- Place after "Session Information" card, before "Preparation Instructions"
- Show full form in modal when "View" button clicked

**Visual Structure**:

```
┌─────────────────────────────────────────┐
│ Session Information                     │
│ [Date, Time, Type, Focus Area]          │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ Pre-Assessment Form          [View]     │ ← New card here
│ ✅ Form Completed                       │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ Preparation Instructions                │
└─────────────────────────────────────────┘
```

**Code Location**:

- Line ~1017: After Session Information card
- Add new Card component with PreAssessmentStatus

### 3. Client Sidebar (Optional Enhancement)

**Location**: Sidebar in `SessionDetailView.tsx` (practitioner view only)

**Implementation**:

- Add pre-assessment status indicator in "Your Client" card
- Small badge or icon showing completion status
- Quick visual reference without taking main content space

**Code Location**:

- Line ~1178: Inside "Your Client" CardContent
- Add after client name/avatar, before contact info

## Data Requirements

### Session Data Needed

The following fields from `client_sessions` table are required:

- `pre_assessment_required` (boolean)
- `pre_assessment_completed` (boolean)
- `pre_assessment_form_id` (UUID, optional)

### Query Updates Needed

1. **PracticeClientManagement.tsx**:
   - Update session queries to include pre-assessment fields
   - Lines ~1902-1963: Add fields to SELECT queries

2. **SessionDetailView.tsx**:
   - Update session detail query to include pre-assessment fields
   - Line ~192: Add fields to SELECT query

## Component Integration

### Files to Modify

1. **`src/pages/practice/PracticeClientManagement.tsx`**
   - Import `PreAssessmentStatus` component
   - Add to session card badge area (lines ~3457, ~3523)
   - Update session queries to fetch pre-assessment fields

2. **`src/components/sessions/SessionDetailView.tsx`**
   - Import `PreAssessmentStatus` component
   - Add new Card section after Session Information (line ~1017)
   - Update session interface to include pre-assessment fields
   - Update session query to fetch pre-assessment fields

### Component Usage

```tsx
// In session cards
<PreAssessmentStatus
  sessionId={session.id}
  preAssessmentCompleted={session.pre_assessment_completed}
  preAssessmentRequired={session.pre_assessment_required}
  showViewButton={false} // Badge only in list view
/>

// In session detail view
<PreAssessmentStatus
  sessionId={session.id}
  preAssessmentCompleted={session.pre_assessment_completed}
  preAssessmentRequired={session.pre_assessment_required}
  showViewButton={true} // Show view button in detail view
/>
```

## Priority & Visibility

### High Priority (Most Visible)

- **Upcoming Sessions** with required but incomplete forms
  - Red "Form Required" badge should be prominent
  - Consider adding visual emphasis (border, background color)

### Medium Priority

- **Upcoming Sessions** with completed forms
  - Green "Form Completed" badge
  - Clickable to view form

### Low Priority

- **Past Sessions** with completed forms
  - Green "Form Completed" badge
  - Historical reference

## User Flow

1. **Practitioner opens Practice Client Management**
   - Sees session list with pre-assessment badges
   - Red badges indicate action needed

2. **Practitioner clicks on session card**
   - Opens Session Detail View
   - Sees pre-assessment section with status

3. **Practitioner clicks "View" button** (if form completed)
   - Modal opens with full pre-assessment form
   - Can review all client information before session

4. **Before session starts**
   - Practitioner reviews pre-assessment form
   - Has context about client's condition, medical history, body map

## Implementation Checklist

- [ ] Update session queries to include pre-assessment fields
- [ ] Add PreAssessmentStatus to session cards in PracticeClientManagement
- [ ] Add PreAssessmentStatus to SessionDetailView main content
- [ ] Test badge display for all states (completed, required, optional)
- [ ] Test modal view functionality
- [ ] Verify RLS policies allow practitioner access
- [ ] Test with both authenticated clients and guest bookings
- [ ] Verify mobile responsiveness

## Notes

- Pre-assessment forms are read-only for practitioners (as designed)
- Forms are accessible via RLS policies that check `therapist_id` match
- Guest bookings are supported (forms linked via `session_id` and `client_email`)
- Forms should be accessible before, during, and after sessions for reference
