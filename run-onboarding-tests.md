# Running Onboarding Tests

## Quick Test - Verify Mapping Logic

The mapping logic has been tested and verified. All service-to-specialization mappings work correctly:

✅ `sports_massage` → `Sports Massage`
✅ `trigger_point` → `Massage Therapy`, `Deep Tissue Massage`  
✅ `deep_tissue` → `Deep Tissue Massage`

## Unit Tests

Run unit tests for the mapping logic:

```bash
# If using vitest
npx vitest run src/lib/__tests__/onboarding-utils.test.ts

# If using jest
npm run test:unit -- src/lib/__tests__/onboarding-utils.test.ts
```

## End-to-End Test

### Option 1: Run the TypeScript E2E Test Runner

```bash
# Make sure you have environment variables set:
# - VITE_SUPABASE_URL
# - SUPABASE_SERVICE_ROLE_KEY
# - VITE_SUPABASE_ANON_KEY

npx tsx test-onboarding-e2e-runner.ts
```

This will:
1. Create a test user
2. Complete onboarding with sample data
3. Verify all data is saved correctly
4. Calculate profile completion
5. Clean up the test user

### Option 2: Manual Testing via UI

1. Create a new practitioner account
2. Complete onboarding with:
   - First Name: "Test"
   - Last Name: "User"
   - Phone: "+441234567890"
   - Location: "London, UK"
   - Bio: (at least 50 characters)
   - Experience: 5 years
   - Professional Body: CNHC
   - Registration Number: "TEST123"
   - Qualification: Level 4 Massage Therapy
   - Services: Sports Massage, Trigger Point Therapy, Deep Tissue Massage
3. After completion, run the verification query:

```sql
-- Replace USER_ID with your test user ID
SELECT 
  first_name,
  last_name,
  (SELECT COUNT(*) FROM practitioner_specializations WHERE practitioner_id = users.id) as spec_count,
  (SELECT COUNT(*) FROM qualifications WHERE practitioner_id = users.id) as qual_count,
  onboarding_status
FROM users
WHERE id = 'YOUR_USER_ID';
```

Expected results:
- ✅ first_name: "Test" (not empty)
- ✅ last_name: "User" (not empty)
- ✅ spec_count: 3 (Sports Massage, Massage Therapy, Deep Tissue Massage)
- ✅ qual_count: 1 (Level 4 Massage Therapy Diploma)
- ✅ onboarding_status: "completed"

## Test Results Summary

### Mapping Logic Tests
- ✅ All service-to-specialization mappings verified
- ✅ No fallbacks needed - all mappings work correctly
- ✅ Multiple services map to multiple specializations correctly

### Code Changes Verified
- ✅ firstName/lastName fields added to Step 1
- ✅ Validation updated to require names
- ✅ Specializations mapping improved (no fallbacks)
- ✅ Qualifications saving fixed

## Next Steps

1. **Test with new user** - Create a new practitioner and complete onboarding
2. **Verify data** - Check that all fields are saved correctly
3. **Check profile completion** - Should be > 70% (not 42%)

