# UX Test Data Setup Guide

## Overview

This guide helps you set up test data for UX testing of the patient management and history transfer features.

## Prerequisites

- Access to Supabase dashboard or SQL editor
- Test accounts for practitioners and clients
- Admin access to create test data

---

## Test Accounts Setup

### Practitioner Accounts

Create 3 practitioner accounts for testing:

#### Practitioner 1: Previous Practitioner
```sql
-- This practitioner will have existing patient data
-- Email: previous.therapist@test.com
-- Password: Test123!@#
-- Role: practitioner
```

#### Practitioner 2: New Practitioner
```sql
-- This practitioner will request patient history
-- Email: new.therapist@test.com
-- Password: Test123!@#
-- Role: practitioner
```

#### Practitioner 3: Receiving Practitioner
```sql
-- This practitioner will receive transfers
-- Email: receiving.therapist@test.com
-- Password: Test123!@#
-- Role: practitioner
```

### Client Accounts

#### Client 1: Test Patient
```sql
-- This client will have notes and programs
-- Email: test.patient@test.com
-- Password: Test123!@#
-- Role: client
```

---

## Sample Treatment Notes Data

### SOAP Notes Setup

```sql
-- First, get the user IDs (replace with actual IDs from your test accounts)
-- Assuming:
-- previous_practitioner_id = 'previous-practitioner-uuid'
-- client_id = 'test-patient-uuid'
-- session_id = 'test-session-uuid'

-- Create a test session
INSERT INTO client_sessions (
  id,
  therapist_id,
  client_id,
  client_email,
  client_name,
  session_date,
  session_type,
  status,
  price,
  payment_status
) VALUES (
  'test-session-uuid',
  'previous-practitioner-uuid',
  'test-patient-uuid',
  'test.patient@test.com',
  'Test Patient',
  CURRENT_DATE - INTERVAL '7 days',
  'Treatment Session',
  'completed',
  50.00,
  'paid'
) ON CONFLICT DO NOTHING;

-- Create SOAP notes for the session
INSERT INTO treatment_notes (
  session_id,
  practitioner_id,
  client_id,
  note_type,
  content,
  template_type
) VALUES
  (
    'test-session-uuid',
    'previous-practitioner-uuid',
    'test-patient-uuid',
    'subjective',
    'Patient reports ongoing lower back pain, rated 6/10. Pain increases with prolonged sitting. No recent injuries. Pain started 2 weeks ago after gardening.',
    'SOAP'
  ),
  (
    'test-session-uuid',
    'previous-practitioner-uuid',
    'test-patient-uuid',
    'objective',
    'Postural assessment: Forward head posture, increased lumbar lordosis. Palpation: Tender L4-L5 region. Range of motion: Limited flexion, pain at end range. Strength: Core weakness noted.',
    'SOAP'
  ),
  (
    'test-session-uuid',
    'previous-practitioner-uuid',
    'test-patient-uuid',
    'assessment',
    'Lower back pain likely due to postural dysfunction and core weakness. No red flags present. Patient would benefit from postural correction and core strengthening program.',
    'SOAP'
  ),
  (
    'test-session-uuid',
    'previous-practitioner-uuid',
    'test-patient-uuid',
    'plan',
    '1. Postural correction exercises 2x daily\n2. Core strengthening program 3x per week\n3. Ergonomic assessment for work setup\n4. Follow-up in 2 weeks',
    'SOAP'
  );
```

### DAP Notes Setup

```sql
-- Create another session with DAP notes
INSERT INTO client_sessions (
  id,
  therapist_id,
  client_id,
  client_email,
  client_name,
  session_date,
  session_type,
  status
) VALUES (
  'test-session-dap-uuid',
  'previous-practitioner-uuid',
  'test-patient-uuid',
  'test.patient@test.com',
  'Test Patient',
  CURRENT_DATE - INTERVAL '14 days',
  'Assessment',
  'completed'
) ON CONFLICT DO NOTHING;

-- Create DAP notes
INSERT INTO treatment_notes (
  session_id,
  practitioner_id,
  client_id,
  note_type,
  content,
  template_type
) VALUES
  (
    'test-session-dap-uuid',
    'previous-practitioner-uuid',
    'test-patient-uuid',
    'data',
    'Initial assessment completed. Patient history: 35-year-old office worker, sedentary lifestyle. Pain onset: 2 weeks ago. Current pain level: 6/10. Previous treatments: None.',
    'DAP'
  ),
  (
    'test-session-dap-uuid',
    'previous-practitioner-uuid',
    'test-patient-uuid',
    'assessment',
    'Postural dysfunction with core weakness. No contraindications for treatment.',
    'DAP'
  ),
  (
    'test-session-dap-uuid',
    'previous-practitioner-uuid',
    'test-patient-uuid',
    'plan',
    'Begin postural correction program. Schedule follow-up assessment.',
    'DAP'
  );
```

---

## Sample Progress Data

### Progress Metrics

```sql
-- Create progress metrics
INSERT INTO progress_metrics (
  client_id,
  practitioner_id,
  session_id,
  metric_type,
  metric_name,
  value,
  max_value,
  unit,
  notes,
  session_date
) VALUES
  (
    'test-patient-uuid',
    'previous-practitioner-uuid',
    'test-session-uuid',
    'pain_level',
    'Lower Back Pain',
    6,
    10,
    '/10',
    'Initial assessment',
    CURRENT_DATE - INTERVAL '7 days'
  ),
  (
    'test-patient-uuid',
    'previous-practitioner-uuid',
    'test-session-uuid',
    'mobility',
    'Lumbar Flexion',
    45,
    90,
    'degrees',
    'Limited by pain',
    CURRENT_DATE - INTERVAL '7 days'
  );
```

### Progress Goals

```sql
-- Create progress goals
INSERT INTO progress_goals (
  client_id,
  practitioner_id,
  goal_name,
  target_value,
  current_value,
  target_date,
  status,
  linked_metric_name
) VALUES
  (
    'test-patient-uuid',
    'previous-practitioner-uuid',
    'Reduce lower back pain to 3/10',
    3,
    6,
    CURRENT_DATE + INTERVAL '4 weeks',
    'in_progress',
    'Lower Back Pain'
  ),
  (
    'test-patient-uuid',
    'previous-practitioner-uuid',
    'Improve lumbar flexion to 75 degrees',
    75,
    45,
    CURRENT_DATE + INTERVAL '6 weeks',
    'in_progress',
    'Lumbar Flexion'
  );
```

---

## Sample Exercise Program Data

### Home Exercise Program

```sql
-- Create an exercise program
INSERT INTO home_exercise_programs (
  id,
  practitioner_id,
  client_id,
  session_id,
  program_title,
  description,
  instructions,
  frequency_per_week,
  status,
  delivered_via
) VALUES (
  'test-hep-uuid',
  'previous-practitioner-uuid',
  'test-patient-uuid',
  'test-session-uuid',
  'Core Strengthening Program',
  'Initial core strengthening program for lower back pain',
  'Perform exercises in order. Rest 30 seconds between exercises. Complete 3 sets of each.',
  3,
  'active',
  'messaging'
) ON CONFLICT DO NOTHING;

-- Add exercises to the program
INSERT INTO hep_exercises (
  program_id,
  exercise_name,
  description,
  sets,
  reps,
  frequency_per_week,
  category,
  difficulty_level
) VALUES
  (
    'test-hep-uuid',
    'Plank',
    'Hold plank position, engaging core',
    3,
    30,
    3,
    'strength',
    'beginner'
  ),
  (
    'test-hep-uuid',
    'Bird Dog',
    'Alternate arm and leg extension',
    3,
    10,
    3,
    'strength',
    'beginner'
  );
```

---

## Setup Script (Complete)

Here's a complete setup script you can run:

```sql
-- ============================================
-- UX Test Data Setup Script
-- ============================================

-- Step 1: Create test sessions
-- (Replace UUIDs with actual user IDs from your test accounts)

-- Session 1: Recent session with SOAP notes
INSERT INTO client_sessions (
  id,
  therapist_id,
  client_id,
  client_email,
  client_name,
  session_date,
  session_type,
  status,
  price,
  payment_status,
  session_number
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM users WHERE email = 'previous.therapist@test.com'),
  (SELECT id FROM users WHERE email = 'test.patient@test.com'),
  'test.patient@test.com',
  'Test Patient',
  CURRENT_DATE - INTERVAL '7 days',
  'Treatment Session',
  'completed',
  50.00,
  'paid',
  1
) RETURNING id;

-- Step 2: Create SOAP notes (use session_id from above)
-- (Run this after getting the session_id)

-- Step 3: Create progress metrics
-- (Use the same IDs)

-- Step 4: Create progress goals
-- (Use the same IDs)

-- Step 5: Create exercise program
-- (Use the same IDs)
```

---

## Verification Queries

### Check Client Notes
```sql
SELECT 
  tn.id,
  tn.note_type,
  tn.template_type,
  tn.content,
  cs.session_date
FROM treatment_notes tn
LEFT JOIN client_sessions cs ON tn.session_id = cs.id
WHERE tn.client_id = (SELECT id FROM users WHERE email = 'test.patient@test.com')
ORDER BY tn.created_at DESC;
```

### Check Progress Data
```sql
SELECT 
  'metrics' as type,
  COUNT(*) as count
FROM progress_metrics
WHERE client_id = (SELECT id FROM users WHERE email = 'test.patient@test.com')
UNION ALL
SELECT 
  'goals' as type,
  COUNT(*) as count
FROM progress_goals
WHERE client_id = (SELECT id FROM users WHERE email = 'test.patient@test.com');
```

### Check Exercise Programs
```sql
SELECT 
  id,
  program_title,
  status,
  created_at
FROM home_exercise_programs
WHERE client_id = (SELECT id FROM users WHERE email = 'test.patient@test.com');
```

---

## Test Scenarios Data Requirements

### Scenario 1: Client Views Notes
**Required**:
- At least 1 session with SOAP notes
- At least 1 session with DAP notes
- At least 1 general note

### Scenario 2: Create Exercise Program
**Required**:
- Client with at least 1 session
- Exercise library populated

### Scenario 3: Transfer Program
**Required**:
- Client with exercise program
- At least 2 practitioners with sessions for same client

### Scenario 4: Request History
**Required**:
- Client with previous practitioner
- Previous practitioner with notes/metrics/goals/programs
- New practitioner with access to same client

### Scenario 5: Approve Request
**Required**:
- Pending history request
- Previous practitioner with patient data

---

## Cleanup Script

After testing, you may want to clean up test data:

```sql
-- WARNING: This will delete all test data
-- Only run in test environment!

-- Delete test requests
DELETE FROM patient_history_requests
WHERE client_id IN (
  SELECT id FROM users WHERE email LIKE '%@test.com'
);

-- Delete test notes
DELETE FROM treatment_notes
WHERE client_id IN (
  SELECT id FROM users WHERE email LIKE '%@test.com'
);

-- Delete test programs
DELETE FROM home_exercise_programs
WHERE client_id IN (
  SELECT id FROM users WHERE email LIKE '%@test.com'
);

-- Delete test metrics
DELETE FROM progress_metrics
WHERE client_id IN (
  SELECT id FROM users WHERE email LIKE '%@test.com'
);

-- Delete test goals
DELETE FROM progress_goals
WHERE client_id IN (
  SELECT id FROM users WHERE email LIKE '%@test.com'
);

-- Delete test sessions
DELETE FROM client_sessions
WHERE client_email LIKE '%@test.com';
```

---

## Quick Setup Checklist

- [ ] Test accounts created
- [ ] At least 1 client with SOAP notes
- [ ] At least 1 client with DAP notes
- [ ] At least 1 exercise program created
- [ ] Progress metrics added
- [ ] Progress goals added
- [ ] Multiple practitioners with same client
- [ ] Test data verified with queries

---

## Troubleshooting

### Notes Not Showing
- Check RLS policies allow client to read their notes
- Verify `client_id` matches in `treatment_notes`
- Check `template_type` is set correctly

### Transfer Not Working
- Verify both practitioners exist
- Check they have sessions with same client
- Verify RLS policies allow transfer

### History Request Not Working
- Check migration was applied
- Verify `patient_history_requests` table exists
- Check RLS policies are correct

### Exercise Program Issues
- Verify `home_exercise_programs` table exists
- Check `hep_exercises` table exists
- Verify foreign keys are correct
