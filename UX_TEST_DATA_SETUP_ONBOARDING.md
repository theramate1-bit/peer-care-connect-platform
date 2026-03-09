# 🗄️ UX Test Data Setup - Onboarding Simplification

**Guide for setting up test accounts and data for UX testing**

---

## 👤 Test Accounts

### Account 1: New Practitioner (Incomplete Profile)
**Purpose**: Test onboarding flow and profile completion widget

**Setup Steps**:
1. Create new account via sign-up
2. Select "Sports Therapist" role
3. Complete simplified onboarding (3 steps)
4. **DO NOT** complete profile fields
5. Account should have:
   - ✅ Basic info (name, phone, location)
   - ❌ No bio
   - ❌ No experience_years
   - ❌ No qualifications
   - ❌ No availability

**Expected State**:
- Onboarding: ✅ Complete
- Profile: ⚠️ Incomplete (~20% complete)
- Services: 🔒 Locked

---

### Account 2: Returning Practitioner (Complete Profile)
**Purpose**: Test edge case - user with complete profile

**Setup Steps**:
1. Create account (or use existing)
2. Complete old onboarding OR manually add:
   - Bio (50+ characters)
   - Experience years
   - Professional body & registration
   - Qualification type
   - Service location & radius
3. Account should have:
   - ✅ All profile fields complete
   - ✅ Services accessible

**Expected State**:
- Onboarding: ✅ Complete
- Profile: ✅ Complete (100%)
- Services: ✅ Unlocked

---

### Account 3: Partial Profile (Mid-Completion)
**Purpose**: Test widget updates and progress tracking

**Setup Steps**:
1. Create account
2. Complete onboarding
3. Add some but not all fields:
   - ✅ Bio added
   - ✅ Experience added
   - ❌ Qualifications missing
   - ❌ Availability missing

**Expected State**:
- Onboarding: ✅ Complete
- Profile: ⚠️ Partial (~60% complete)
- Services: 🔒 Locked

---

## 📋 SQL Scripts for Test Data

### Create Test Practitioner (Incomplete)
```sql
-- Insert test user (if needed)
INSERT INTO users (
  email,
  first_name,
  last_name,
  phone,
  location,
  user_role,
  onboarding_status,
  profile_completed
) VALUES (
  'test.practitioner.incomplete@example.com',
  'Test',
  'Practitioner',
  '+44123456789',
  'London, UK',
  'sports_therapist',
  'completed',
  false
);

-- Ensure profile is incomplete
UPDATE users 
SET 
  bio = NULL,
  experience_years = NULL,
  qualification_type = NULL,
  professional_body = NULL,
  registration_number = NULL
WHERE email = 'test.practitioner.incomplete@example.com';
```

### Create Test Practitioner (Complete)
```sql
-- Insert test user (if needed)
INSERT INTO users (
  email,
  first_name,
  last_name,
  phone,
  location,
  user_role,
  onboarding_status,
  profile_completed,
  bio,
  experience_years,
  qualification_type,
  professional_body,
  registration_number,
  service_radius_km
) VALUES (
  'test.practitioner.complete@example.com',
  'Complete',
  'Profile',
  '+44123456790',
  'Manchester, UK',
  'sports_therapist',
  'completed',
  true,
  'Experienced sports therapist with 10 years of practice specializing in injury rehabilitation and performance enhancement.',
  10,
  'itmmif',
  'british_association_of_sports_rehabilitators',
  'BASRaT12345',
  25
);
```

### Create Test Practitioner (Partial)
```sql
-- Insert test user (if needed)
INSERT INTO users (
  email,
  first_name,
  last_name,
  phone,
  location,
  user_role,
  onboarding_status,
  profile_completed,
  bio,
  experience_years,
  qualification_type,
  professional_body,
  registration_number
) VALUES (
  'test.practitioner.partial@example.com',
  'Partial',
  'Profile',
  '+44123456791',
  'Birmingham, UK',
  'massage_therapist',
  'completed',
  false,
  'Qualified massage therapist with 5 years of experience in sports and deep tissue massage.',
  5,
  NULL,  -- Missing qualification
  NULL,  -- Missing professional body
  NULL   -- Missing registration
);
```

---

## 🎯 Test Scenarios Data

### Scenario 1: Onboarding Flow
**Account Needed**: None (create fresh)  
**Data**: Start from sign-up page  
**Expected**: Complete in 3 steps

### Scenario 2: Profile Widget Discovery
**Account Needed**: Account 1 (Incomplete)  
**Data**: Dashboard should show widget  
**Expected**: Widget visible, ~20% complete

### Scenario 3: Completing Profile
**Account Needed**: Account 1 (Incomplete)  
**Data**: Add bio, experience, qualifications  
**Expected**: Widget updates to 100%

### Scenario 4: Services Gating
**Account Needed**: Account 1 (Incomplete) → Complete  
**Data**: Try services before/after completion  
**Expected**: Locked → Unlocked

### Scenario 5: Mobile Testing
**Account Needed**: Account 1 (Incomplete)  
**Data**: Use mobile device  
**Expected**: All features work on mobile

---

## 🔧 Manual Setup Instructions

### Option 1: Use Supabase Dashboard
1. Go to Supabase Dashboard → Authentication → Users
2. Create new user manually
3. Go to Table Editor → `users` table
4. Edit user record to set:
   - `user_role`: 'sports_therapist'
   - `onboarding_status`: 'completed'
   - `profile_completed`: false (for incomplete)
   - Leave bio, experience_years, etc. as NULL

### Option 2: Use Application Sign-Up
1. Navigate to sign-up page
2. Create account with test email
3. Complete onboarding flow
4. **Stop** before completing profile (for incomplete account)
5. **OR** complete all profile fields (for complete account)

### Option 3: Use SQL Editor
1. Go to Supabase Dashboard → SQL Editor
2. Run SQL scripts above
3. Verify data in Table Editor

---

## ✅ Verification Checklist

### Incomplete Profile Account
- [ ] Email: test.practitioner.incomplete@example.com
- [ ] Onboarding: ✅ Complete
- [ ] Bio: ❌ NULL
- [ ] Experience: ❌ NULL
- [ ] Qualifications: ❌ NULL
- [ ] Services: 🔒 Locked
- [ ] Widget: Shows ~20% complete

### Complete Profile Account
- [ ] Email: test.practitioner.complete@example.com
- [ ] Onboarding: ✅ Complete
- [ ] Bio: ✅ Present (50+ chars)
- [ ] Experience: ✅ Present
- [ ] Qualifications: ✅ Present
- [ ] Services: ✅ Unlocked
- [ ] Widget: Shows 100% or hidden

### Partial Profile Account
- [ ] Email: test.practitioner.partial@example.com
- [ ] Onboarding: ✅ Complete
- [ ] Bio: ✅ Present
- [ ] Experience: ✅ Present
- [ ] Qualifications: ❌ Missing
- [ ] Services: 🔒 Locked
- [ ] Widget: Shows ~60% complete

---

## 🧹 Cleanup After Testing

### Remove Test Accounts
```sql
-- Delete test accounts (optional)
DELETE FROM users 
WHERE email IN (
  'test.practitioner.incomplete@example.com',
  'test.practitioner.complete@example.com',
  'test.practitioner.partial@example.com'
);
```

**Note**: Only delete if you want to clean up. Otherwise, keep for future testing.

---

## 🚀 Quick Setup Commands

### Using Supabase MCP (if available)
```bash
# Create incomplete account
# (Use Supabase MCP tools to insert/update)

# Create complete account
# (Use Supabase MCP tools to insert/update)
```

### Using Application
1. Sign up with test emails
2. Complete onboarding
3. Manually set profile fields via UI
4. Verify in database

---

## 📝 Test Data Checklist

Before starting tests:
- [ ] Account 1 (Incomplete) created
- [ ] Account 2 (Complete) created
- [ ] Account 3 (Partial) created
- [ ] All accounts verified in database
- [ ] Can log in to all accounts
- [ ] Expected states confirmed

---

## 🎯 Next Steps

1. ✅ Set up test accounts
2. ✅ Verify data
3. ✅ Start testing (see `UX_TESTING_QUICK_START_ONBOARDING.md`)
4. ✅ Document findings

**Ready to test?** See `UX_TESTING_QUICK_START_ONBOARDING.md` to begin!



