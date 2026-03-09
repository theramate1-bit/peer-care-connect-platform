# SOAP Notes & Metrics Removal - Test Data Setup Guide

**Complete guide for setting up test data for UX testing**

---

## 🎯 Test Data Requirements

### Practitioner Accounts
- **3-5 test practitioner accounts**
- Different experience levels
- Different roles (Osteopath, Sports Therapist, Massage Therapist)

### Client Accounts
- **10-15 test client accounts**
- Various conditions
- Mix of active and inactive clients

### Historical Data
- **20+ sessions with SOAP notes**
- **30+ historical metrics** (for backward compatibility testing)
- **15+ existing goals**
- Mix of completed and active goals

---

## 👤 Practitioner Test Accounts

### Account 1: Experienced Osteopath
```sql
-- Create practitioner account
-- Email: sarah.osteopath@test.com
-- Role: osteopath
-- Experience: 10+ years
-- Has: Historical metrics, goals, SOAP notes
```

**Setup Steps**:
1. Create account with role "osteopath"
2. Complete onboarding
3. Create 5-10 client sessions
4. Add SOAP notes to sessions
5. Create 10+ historical metrics
6. Create 5+ goals (some linked to metrics)

---

### Account 2: New Sports Therapist
```sql
-- Create practitioner account
-- Email: mike.sportstherapist@test.com
-- Role: sports_therapist
-- Experience: 2 years
-- Has: Few sessions, no historical metrics
```

**Setup Steps**:
1. Create account with role "sports_therapist"
2. Complete onboarding
3. Create 2-3 client sessions
4. Add 1-2 SOAP notes
5. No historical metrics (new user)
6. No goals yet

---

### Account 3: Massage Therapist (Mobile User)
```sql
-- Create practitioner account
-- Email: emma.massage@test.com
-- Role: massage_therapist
-- Experience: 5 years
-- Has: Mix of sessions, some metrics
```

**Setup Steps**:
1. Create account with role "massage_therapist"
2. Complete onboarding
3. Create 5-7 client sessions
4. Add SOAP notes to some sessions
5. Create 5-8 historical metrics
6. Create 3-5 goals

---

## 👥 Client Test Accounts

### Client Account Template
```sql
-- Create client account
-- Email: client.{number}@test.com
-- Role: client
-- Has: Sessions, some with SOAP notes
```

### Client 1: Active Client with Pain Issues
- **Name**: John Doe
- **Condition**: Lower back pain
- **Sessions**: 5 sessions
- **SOAP Notes**: 3 notes (with VAS scores)
- **Metrics**: 8 historical metrics (pain, ROM)
- **Goals**: 2 active goals (pain reduction, ROM improvement)

### Client 2: New Client
- **Name**: Jane Smith
- **Condition**: Shoulder injury
- **Sessions**: 1 session
- **SOAP Notes**: 1 note (no VAS/ROM yet)
- **Metrics**: None
- **Goals**: None

### Client 3: Chronic Condition Client
- **Name**: Bob Johnson
- **Condition**: Chronic knee pain
- **Sessions**: 10 sessions
- **SOAP Notes**: 8 notes (with VAS and ROM)
- **Metrics**: 15 historical metrics
- **Goals**: 3 goals (1 completed, 2 active)

---

## 📝 Sample SOAP Notes Data

### SOAP Note with VAS and ROM
```json
{
  "subjective": "Client reports lower back pain that started 2 weeks ago after lifting heavy boxes. Pain is worse in the morning and improves with movement.",
  "objective": "Pain score (VAS): 6/10. Range of motion: Lumbar flexion 45°, extension 15°, lateral flexion left 20°, right 25°. Palpation reveals tenderness at L4-L5.",
  "assessment": "Acute lower back strain, likely muscular in origin.",
  "plan": "Soft tissue massage, stretching exercises, heat therapy. Follow up in 1 week."
}
```

### SOAP Note for Goal Extraction
```json
{
  "subjective": "Client reports improvement in shoulder mobility.",
  "objective": "Pain score (VAS): 4/10 (down from 7/10). Shoulder abduction: 120° (improved from 90°).",
  "assessment": "Good progress with shoulder rehabilitation.",
  "plan": "Continue with current exercises. Goal: Reduce pain to 2/10 and improve abduction to 150° within 6 weeks."
}
```

---

## 📊 Sample Historical Metrics

### Pain Level Metrics
```sql
-- Lower Back Pain metrics
INSERT INTO progress_metrics (client_id, practitioner_id, metric_type, metric_name, value, max_value, unit, session_date)
VALUES 
  ('client-1-id', 'practitioner-1-id', 'pain_level', 'Lower Back Pain', 7, 10, '/10', '2024-12-01'),
  ('client-1-id', 'practitioner-1-id', 'pain_level', 'Lower Back Pain', 6, 10, '/10', '2024-12-08'),
  ('client-1-id', 'practitioner-1-id', 'pain_level', 'Lower Back Pain', 5, 10, '/10', '2024-12-15');
```

### ROM Metrics
```sql
-- Knee Flexion metrics
INSERT INTO progress_metrics (client_id, practitioner_id, metric_type, metric_name, value, max_value, unit, session_date)
VALUES 
  ('client-3-id', 'practitioner-1-id', 'mobility', 'Knee Flexion', 90, 140, 'degrees', '2024-11-01'),
  ('client-3-id', 'practitioner-1-id', 'mobility', 'Knee Flexion', 110, 140, 'degrees', '2024-11-15'),
  ('client-3-id', 'practitioner-1-id', 'mobility', 'Knee Flexion', 130, 140, 'degrees', '2024-12-01');
```

---

## 🎯 Sample Goals

### Pain Reduction Goal
```sql
INSERT INTO progress_goals (client_id, practitioner_id, goal_name, description, target_value, current_value, target_date, status, linked_metric_name)
VALUES 
  ('client-1-id', 'practitioner-1-id', 'Reduce Lower Back Pain', 'Reduce pain from 7/10 to 4/10', 4, 5, '2025-03-01', 'active', 'Lower Back Pain');
```

### ROM Improvement Goal
```sql
INSERT INTO progress_goals (client_id, practitioner_id, goal_name, description, target_value, current_value, target_date, status, linked_metric_name)
VALUES 
  ('client-3-id', 'practitioner-1-id', 'Improve Knee Flexion', 'Increase knee flexion from 90° to 130°', 130, 120, '2025-02-15', 'active', 'Knee Flexion');
```

---

## 🔧 SQL Setup Scripts

### Create Test Practitioner
```sql
-- Insert test practitioner
INSERT INTO auth.users (email, raw_user_meta_data, user_role)
VALUES 
  ('sarah.osteopath@test.com', 
   '{"first_name": "Sarah", "last_name": "Osteopath", "user_role": "osteopath"}',
   'osteopath')
RETURNING id;
```

### Create Test Client
```sql
-- Insert test client
INSERT INTO auth.users (email, raw_user_meta_data, user_role)
VALUES 
  ('client.1@test.com',
   '{"first_name": "John", "last_name": "Doe", "user_role": "client"}',
   'client')
RETURNING id;
```

### Create Session with SOAP Notes
```sql
-- Create session
INSERT INTO client_sessions (client_id, practitioner_id, session_date, session_type)
VALUES ('client-id', 'practitioner-id', '2024-12-20', 'initial')
RETURNING id;

-- Create SOAP note sections
INSERT INTO treatment_notes (session_id, note_type, content, created_by)
VALUES 
  ('session-id', 'subjective', 'Client reports lower back pain...', 'practitioner-id'),
  ('session-id', 'objective', 'Pain score (VAS): 6/10. Range of motion: Lumbar flexion 45°...', 'practitioner-id'),
  ('session-id', 'assessment', 'Acute lower back strain...', 'practitioner-id'),
  ('session-id', 'plan', 'Soft tissue massage, stretching exercises...', 'practitioner-id');
```

---

## 📱 Mobile Test Data

### Mobile-Specific Setup
- **iOS Device**: iPhone 12 or newer
- **Android Device**: Android 11 or newer
- **Test Accounts**: Use same accounts as desktop
- **Network**: Test on WiFi and cellular

### Mobile Test Scenarios
1. Create SOAP note on mobile
2. Create goal on mobile
3. View progress dashboard on mobile
4. Extract goals on mobile

---

## ✅ Verification Checklist

### Before Testing
- [ ] All practitioner accounts created
- [ ] All client accounts created
- [ ] Sessions created with SOAP notes
- [ ] Historical metrics created
- [ ] Goals created (some linked to metrics)
- [ ] Test data verified in database
- [ ] Mobile devices ready
- [ ] Test environment accessible

### Data Verification
- [ ] Can log in as each practitioner
- [ ] Can access client sessions
- [ ] SOAP notes are visible
- [ ] Historical metrics are visible
- [ ] Goals are visible
- [ ] Goal linking works
- [ ] Data persists correctly

---

## 🐛 Common Setup Issues

### Issue: Can't See Historical Metrics
**Solution**: Ensure metrics are linked to correct client_id and practitioner_id

### Issue: Goals Not Linking to Metrics
**Solution**: Verify metric names match exactly (case-sensitive)

### Issue: SOAP Notes Not Saving
**Solution**: Check session_id and created_by fields are correct

### Issue: Mobile Data Not Syncing
**Solution**: Verify API endpoints are accessible from mobile

---

## 📊 Test Data Summary Template

### Practitioner Accounts
| Email | Role | Sessions | Metrics | Goals |
|-------|------|----------|---------|-------|
| sarah.osteopath@test.com | osteopath | 10 | 15 | 5 |
| mike.sportstherapist@test.com | sports_therapist | 3 | 0 | 0 |
| emma.massage@test.com | massage_therapist | 7 | 8 | 3 |

### Client Accounts
| Email | Sessions | SOAP Notes | Metrics | Goals |
|-------|----------|------------|---------|-------|
| client.1@test.com | 5 | 3 | 8 | 2 |
| client.2@test.com | 1 | 1 | 0 | 0 |
| client.3@test.com | 10 | 8 | 15 | 3 |

---

## 🔗 Related Documents

- **Testing Plan**: `SOAP_NOTES_METRICS_UX_TESTING_PLAN.md`
- **Test Scripts**: `SOAP_NOTES_METRICS_UX_TEST_SCRIPTS.md`
- **Checklist**: `SOAP_NOTES_METRICS_UX_TESTING_CHECKLIST.md`
- **Quick Start**: `SOAP_NOTES_METRICS_UX_TESTING_QUICK_START.md`
- **Overview**: `SOAP_NOTES_METRICS_UX_TESTING_README.md`

---

**Test data setup complete!** Verify all data is correct before beginning testing sessions.



