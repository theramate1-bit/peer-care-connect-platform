# Test Structure and Organization

This document describes the organization and conventions for tests in the peer-care-connect application.

## Directory Structure

```
peer-care-connect/
├── src/
│   ├── components/
│   │   ├── __tests__/              # Component unit tests
│   │   │   ├── Button.test.tsx
│   │   │   └── Card.test.tsx
│   │   └── ui/
│   │       └── __tests__/
│   ├── services/
│   │   ├── __tests__/              # Service unit tests
│   │   │   ├── bookingService.test.ts
│   │   │   └── stripeService.test.ts
│   │   ├── bookingService.ts
│   │   └── stripeService.ts
│   ├── lib/
│   │   ├── __tests__/              # Utility unit tests
│   │   │   └── pricing.test.ts
│   │   └── utils/
│   │       └── pricing.ts
│   └── test/
│       ├── helpers/                # Test utilities
│       │   ├── supabase-test-client.ts
│       │   ├── mock-factories.ts
│       │   ├── test-db-helpers.ts
│       │   └── stripe-test-helpers.ts
│       ├── setup.ts                # Jest setup
│       └── test-utils.ts           # Test utilities
└── tests/
    ├── integration/                # Integration tests
    │   ├── database/
    │   │   ├── credit-system.test.ts
    │   │   └── booking-operations.test.ts
    │   ├── api/
    │   │   └── stripe-webhooks.test.ts
    │   └── realtime/
    │       └── subscriptions.test.ts
    └── e2e/                        # E2E tests
        ├── oauth-flows.spec.ts
        ├── booking-flow.spec.ts
        ├── payment-flow.spec.ts
        └── practitioner-journey.spec.ts
```

## Test Types

### Unit Tests

**Location**: `src/**/__tests__/`

**Purpose**: Test individual components, functions, and services in isolation.

**Email Tests**:
- `src/lib/__tests__/email-templates.test.ts` - Email template generation
- `src/lib/__tests__/email-validation.test.ts` - Email validation logic
- `src/lib/__tests__/email-sending.test.ts` - Email sending functionality

**Conventions**:
- One test file per source file
- Test file name: `[filename].test.ts` or `[filename].test.tsx`
- Use mocks for external dependencies
- Fast execution (< 100ms per test)

**Example Structure**:
```typescript
describe('ComponentName', () => {
  describe('feature', () => {
    it('should do something', () => {
      // Test implementation
    });
  });
});
```

### Integration Tests

**Location**: `tests/integration/`

**Purpose**: Test interactions between components, database operations, and external services.

**Conventions**:
- Group by domain (database, api, realtime)
- May require test database connection
- Test real integrations, not mocks
- Slower execution acceptable

**Example Structure**:
```typescript
describe('Database Operations', () => {
  beforeAll(() => {
    // Setup test database
  });

  describe('RPC Functions', () => {
    it('should execute function correctly', () => {
      // Test implementation
    });
  });
});
```

### E2E Tests

**Location**: `tests/e2e/`

**Purpose**: Test complete user journeys from start to finish.

**Conventions**:
- Use Playwright for browser automation
- Test file name: `[feature]-flow.spec.ts`
- Test user-facing workflows
- May require test environment setup

**Example Structure**:
```typescript
test.describe('Feature Flow', () => {
  test('should complete user journey', async ({ page }) => {
    // Test implementation
  });
});
```

## Test Utilities

### Mock Data Factories

**Location**: `src/test/helpers/mock-factories.ts`

**Purpose**: Generate consistent test data.

**Usage**:
```typescript
import { MockDataFactory } from '@/test/helpers/mock-factories';

const user = MockDataFactory.createUser();
const booking = MockDataFactory.createBooking({ status: 'confirmed' });
```

### Supabase Test Client

**Location**: `src/test/helpers/supabase-test-client.ts`

**Purpose**: Create mocked Supabase clients for testing.

**Usage**:
```typescript
import { createTestSupabaseClient } from '@/test/helpers/supabase-test-client';

const supabase = createTestSupabaseClient();
```

### Stripe Test Helpers

**Location**: `src/test/helpers/stripe-test-helpers.ts`

**Purpose**: Generate mock Stripe objects and test Stripe integration.

**Usage**:
```typescript
import { StripeTestHelpers } from '@/test/helpers/stripe-test-helpers';

const paymentIntent = StripeTestHelpers.createMockPaymentIntent();
```

## Naming Conventions

### Test Files
- Unit tests: `[component].test.tsx` or `[service].test.ts`
- Integration tests: `[feature].test.ts`
- E2E tests: `[feature]-flow.spec.ts`

### Test Descriptions
- Use descriptive names: `should create booking successfully`
- Group related tests with `describe` blocks
- Use `it` or `test` for individual test cases

### Mock Data
- Use `Mock` prefix for mock functions: `mockCreateBooking`
- Use `createMock` prefix for mock data: `createMockUser`

## Test Organization

### By Feature
Group tests by feature or domain:
```
services/
├── booking/
│   ├── bookingService.ts
│   └── __tests__/
│       └── bookingService.test.ts
```

### By Type
Group tests by test type:
```
tests/
├── integration/
│   ├── database/
│   └── api/
└── e2e/
```

## Coverage Goals

- **Unit Tests**: 80%+ coverage for components, services, utilities
- **Integration Tests**: All critical database operations and API endpoints
- **E2E Tests**: All user journeys and critical paths

## Best Practices

1. **One Assertion Per Test**: Each test should verify one thing
2. **Arrange-Act-Assert**: Structure tests clearly
3. **Test Behavior, Not Implementation**: Focus on what, not how
4. **Use Descriptive Names**: Test names should explain what is being tested
5. **Keep Tests Fast**: Unit tests should be fast, E2E tests can be slower
6. **Clean Up**: Always clean up test data and mocks
7. **Isolation**: Tests should not depend on each other

## Configuration Files

- `jest.config.js`: Jest configuration for unit and integration tests
- `playwright.config.ts`: Playwright configuration for E2E tests
- `src/test/setup.ts`: Global test setup and mocks

## Running Tests

See [TESTING_GUIDE.md](./TESTING_GUIDE.md) for detailed instructions on running tests.

