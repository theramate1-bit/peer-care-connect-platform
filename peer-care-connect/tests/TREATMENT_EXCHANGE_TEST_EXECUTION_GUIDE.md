# Treatment Exchange System - Test Execution Guide

## Overview

This guide provides instructions for executing the comprehensive test suite for the Treatment Exchange System as outlined in the testing plan.

## Test Structure

### 1. Unit Tests
**Location**: `src/lib/__tests__/treatment-exchange.test.ts`

**Status**: ✅ Complete

**Coverage**:
- Credit balance checks (sufficient, insufficient, edge cases)
- Request sending (validation, error handling)
- Request acceptance (expired requests, slot hold recreation)
- Credit deduction (idempotency)
- Cancellation (time-based refund logic)
- Slot hold management

**Run Command**:
```bash
npm run test:unit -- treatment-exchange.test.ts
```

### 2. Integration Tests
**Location**: `tests/integration/treatment-exchange/treatment-exchange-flow.test.ts`

**Status**: ⚠️ Requires Test Database Setup

**Coverage**:
- Database operations (RPC functions)
- RLS policies
- Data consistency
- Concurrent operations
- Edge cases

**Prerequisites**:
- Test Supabase project configured
- Test users created
- Test data seeded

**Run Command**:
```bash
npm run test:integration -- treatment-exchange-flow.test.ts
```

### 3. E2E Tests
**Location**: `tests/e2e/treatment-exchange-flow.spec.ts`

**Status**: ⚠️ Requires Test Data Setup

**Coverage**:
- Complete exchange flow
- Request management
- Dashboard integration
- Session detail view
- Cancellation flow
- Error handling

**Prerequisites**:
- Test environment running
- Test users authenticated
- Test data available

**Run Command**:
```bash
npm run test:e2e -- treatment-exchange-flow.spec.ts
```

## Test Data Setup

### Step 1: Create Test Users

Execute the SQL script to create test practitioners:

```sql
-- See tests/test-data/treatment-exchange-setup.sql
```

Or use the setup script:
```bash
# Run the test data setup script
psql -h <your-supabase-host> -U postgres -d postgres -f tests/test-data/treatment-exchange-setup.sql
```

### Step 2: Configure Test Environment

Create a `.env.test` file:

```env
VITE_SUPABASE_URL=your-test-supabase-url
VITE_SUPABASE_ANON_KEY=your-test-anon-key

# Server-only (never VITE_ / never exposed to browser)
SUPABASE_SERVICE_ROLE_KEY=your-test-service-role-key
```

### Step 3: Verify Test Data

Run the verification script:
```bash
node tests/test-data/verify-test-data.js
```

## Test Execution Phases

### Phase 1: Unit Tests (No Database Required)

```bash
# Run all unit tests
npm run test:unit

# Run with coverage
npm run test:unit:coverage

# Run in watch mode
npm run test:unit:watch
```

**Expected Results**:
- All unit tests pass
- Coverage >80% for `treatment-exchange.ts`

### Phase 2: Integration Tests (Requires Test Database)

```bash
# Set up test database first
npm run test:setup:db

# Run integration tests
npm run test:integration

# Run specific test file
npm run test:integration -- treatment-exchange-flow.test.ts
```

**Expected Results**:
- All integration tests pass
- Database operations verified
- RLS policies enforced correctly

### Phase 3: E2E Tests (Requires Running Application)

```bash
# Start test environment
npm run dev:test

# In another terminal, run E2E tests
npm run test:e2e

# Run specific test file
npm run test:e2e -- treatment-exchange-flow.spec.ts

# Run in headed mode (see browser)
npm run test:e2e -- --headed
```

**Expected Results**:
- All E2E tests pass
- UI flows verified
- User journeys complete successfully

## Manual Testing Checklist

See `tests/manual-testing/treatment-exchange-manual-test-checklist.md` for detailed manual testing scenarios.

### Quick Manual Test Flow:

1. **Setup**:
   - [ ] Two practitioner accounts created
   - [ ] Both have 200+ credits
   - [ ] Both have completed profiles
   - [ ] Both have treatment exchange enabled

2. **Send Request**:
   - [ ] Navigate to Treatment Exchange page
   - [ ] Select recipient practitioner
   - [ ] Choose date/time (24+ hours ahead)
   - [ ] Select 60-minute session
   - [ ] Send request
   - [ ] Verify success message

3. **Accept Request**:
   - [ ] Log in as recipient
   - [ ] View pending request in dashboard
   - [ ] Click "Accept"
   - [ ] Verify credits deducted
   - [ ] Verify session created

4. **Cancel Session**:
   - [ ] Navigate to session detail
   - [ ] Click "Cancel"
   - [ ] Verify refund processed
   - [ ] Verify credits returned

## Test Coverage Goals

### Unit Tests
- ✅ Credit balance checks: 100%
- ✅ Request sending: 100%
- ✅ Request acceptance: 100%
- ✅ Cancellation logic: 100%
- ✅ Slot hold management: 100%

### Integration Tests
- ⚠️ RPC functions: Requires test DB
- ⚠️ RLS policies: Requires test DB
- ⚠️ Data consistency: Requires test DB

### E2E Tests
- ⚠️ Complete flows: Requires test environment
- ⚠️ UI interactions: Requires test environment

## Troubleshooting

### Unit Tests Failing

**Issue**: Mock not working correctly
**Solution**: Check mock setup in `beforeEach` hook

**Issue**: Import errors
**Solution**: Verify all dependencies are installed

### Integration Tests Failing

**Issue**: Cannot connect to test database
**Solution**: 
- Verify `.env.test` is configured
- Check Supabase connection settings
- Ensure test database is accessible

**Issue**: RLS policy errors
**Solution**:
- Verify test users have correct permissions
- Check RLS policies are enabled in test database

### E2E Tests Failing

**Issue**: Tests timeout
**Solution**:
- Increase timeout in `playwright.config.ts`
- Check application is running
- Verify test data is set up

**Issue**: Element not found
**Solution**:
- Check selectors match actual UI
- Verify page has loaded
- Add wait conditions

## Test Reports

### Generate Coverage Report

```bash
npm run test:unit:coverage
```

Report will be in `coverage/` directory.

### Generate E2E Test Report

```bash
npm run test:e2e
npx playwright show-report
```

### Generate All Reports

```bash
npm run test:all
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Treatment Exchange Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run test:unit:coverage

  integration-tests:
    runs-on: ubuntu-latest
    env:
      VITE_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
      VITE_SUPABASE_ANON_KEY: ${{ secrets.TEST_SUPABASE_ANON_KEY }}
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - uses: microsoft/playwright@v1
      - run: npm install
      - run: npm run test:e2e
```

## Next Steps

1. ✅ Complete unit tests (DONE)
2. ⚠️ Set up test database for integration tests
3. ⚠️ Configure test environment for E2E tests
4. ⚠️ Execute full test suite
5. ⚠️ Generate test coverage report
6. ⚠️ Document test results

## Support

For issues or questions:
- Check test logs in `test-results/`
- Review test data setup in `tests/test-data/`
- Consult manual testing checklist
- Review test plan document










