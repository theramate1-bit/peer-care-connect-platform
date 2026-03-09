# Testing Guide

This guide explains how to write and run tests for the peer-care-connect application.

## Overview

The testing infrastructure includes:
- **Unit Tests**: React components, services, and utilities
- **Integration Tests**: Database operations, API endpoints, external services
- **End-to-End Tests**: Complete user journeys using Playwright

## Running Tests

### Unit Tests

```bash
# Run all unit tests
npm run test:unit

# Run tests in watch mode
npm run test:unit:watch

# Run tests with coverage
npm run test:unit:coverage
```

### Integration Tests

```bash
# Run all integration tests
npm run test:integration
```

### End-to-End Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run specific E2E test file
npx playwright test tests/e2e/booking-flow.spec.ts

# Run E2E tests in headed mode (see browser)
npx playwright test --headed
```

### Run All Tests

```bash
# Run all test suites
npm run test:all
```

### CI/CD Tests

```bash
# Run tests optimized for CI environments
npm run test:ci
```

## Writing Tests

### Unit Tests

#### Component Tests

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('should render and handle clicks', async () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    const button = screen.getByRole('button');
    await userEvent.click(button);
    
    expect(handleClick).toHaveBeenCalled();
  });
});
```

#### Service Tests

```typescript
import { createBooking } from '@/services/bookingService';
import { MockDataFactory } from '@/test/helpers/mock-factories';

describe('bookingService', () => {
  it('should create booking', async () => {
    const booking = MockDataFactory.createBooking();
    // Test implementation...
  });
});
```

#### Utility Tests

```typescript
import { calculateServicePricing } from '@/utils/pricing';

describe('pricing utilities', () => {
  it('should calculate pricing correctly', () => {
    const result = calculateServicePricing(7000, 4);
    expect(result.platformFeePence).toBe(280);
  });
});
```

### Integration Tests

Integration tests are located in `tests/integration/` and test database operations, API endpoints, and external service integrations.

```typescript
describe('Database Operations', () => {
  it('should create booking with correct pricing', async () => {
    // Test database RPC function
  });
});
```

### E2E Tests

E2E tests use Playwright and are located in `tests/e2e/`. They test complete user journeys.

```typescript
import { test, expect } from '@playwright/test';

test('should complete booking flow', async ({ page }) => {
  await page.goto('/marketplace');
  // Test user journey...
});
```

## Email Testing

### Email Template Tests

Test email template generation:

```typescript
import { generateEmailTemplate } from '@/lib/__tests__/email-templates.test';

const template = generateEmailTemplate('booking_confirmation_client', {
  sessionType: 'Sports Therapy',
  sessionDate: '2024-12-25',
  practitionerName: 'John Practitioner'
}, 'Jane Client');

expect(template.subject).toContain('Booking Confirmed');
```

### Email Validation Tests

Test email validation:

```typescript
import { validateEmailRequest } from '@/lib/__tests__/email-validation.test';

const result = validateEmailRequest({
  emailType: 'booking_confirmation_client',
  recipientEmail: 'client@example.com',
  recipientName: 'John Client'
});

expect(result.valid).toBe(true);
```

### Email Sending Tests

Test email sending functionality:

```typescript
import { EmailTestHelpers } from '@/test/helpers/email-test-helpers';

const request = EmailTestHelpers.createMockEmailRequest({
  emailType: 'booking_confirmation_client',
  recipientEmail: 'client@example.com'
});

const mockResponse = EmailTestHelpers.mockEmailInvoke(true, 'email-123');
```

### Email Test Helpers

Use `EmailTestHelpers` for email-related tests:

- `createMockEmailRequest()` - Create mock email requests
- `createMockEmailResponse()` - Create mock email responses
- `createBookingConfirmationData()` - Create booking confirmation data
- `createPaymentConfirmationData()` - Create payment confirmation data
- `isValidEmail()` - Validate email addresses
- `getValidEmailTypes()` - Get list of valid email types

## Test Utilities

### Mock Data Factories

Use `MockDataFactory` to generate test data:

```typescript
import { MockDataFactory } from '@/test/helpers/mock-factories';

const user = MockDataFactory.createUser();
const booking = MockDataFactory.createBooking();
const service = MockDataFactory.createService();
```

### Supabase Test Client

Use `createTestSupabaseClient` to create mocked Supabase clients:

```typescript
import { createTestSupabaseClient } from '@/test/helpers/supabase-test-client';

const supabase = createTestSupabaseClient();
```

### Stripe Test Helpers

Use `StripeTestHelpers` for Stripe-related tests:

```typescript
import { StripeTestHelpers } from '@/test/helpers/stripe-test-helpers';

const paymentIntent = StripeTestHelpers.createMockPaymentIntent();
```

## Test Structure

```
peer-care-connect/
├── src/
│   ├── components/
│   │   └── __tests__/          # Component unit tests
│   ├── services/
│   │   └── __tests__/          # Service unit tests
│   ├── lib/
│   │   └── __tests__/           # Utility unit tests
│   └── test/
│       └── helpers/             # Test utilities
└── tests/
    ├── integration/             # Integration tests
    │   ├── database/
    │   ├── api/
    │   └── realtime/
    └── e2e/                     # E2E tests
```

## Best Practices

1. **Test Isolation**: Each test should be independent and not rely on other tests
2. **Mock External Services**: Always mock external APIs (Stripe, Supabase) in unit tests
3. **Use Test Utilities**: Leverage mock factories and helpers for consistency
4. **Test User Behavior**: Focus on testing user interactions, not implementation details
5. **Coverage Goals**: Aim for 80%+ coverage on critical paths
6. **Fast Tests**: Keep unit tests fast (< 100ms each)
7. **Descriptive Names**: Use clear, descriptive test names

## Debugging Tests

### Unit Tests

```bash
# Run specific test file
npm run test:unit -- src/services/__tests__/bookingService.test.ts

# Run with verbose output
npm run test:unit -- --verbose
```

### E2E Tests

```bash
# Run in headed mode
npx playwright test --headed

# Run with debug mode
npx playwright test --debug

# Show test report
npm run test:report
```

## CI/CD Integration

Tests are automatically run in CI/CD pipelines. The `test:ci` script optimizes test execution for CI environments:

- Runs tests in parallel where possible
- Generates coverage reports
- Fails fast on errors
- Optimizes worker counts

## Troubleshooting

### Tests Failing Locally

1. Check that all dependencies are installed: `npm install`
2. Verify test database connection (for integration tests)
3. Check environment variables are set correctly
4. Clear Jest cache: `npm run test:unit -- --clearCache`

### E2E Tests Failing

1. Ensure dev server is running: `npm run dev`
2. Check Playwright browsers are installed: `npx playwright install`
3. Verify test data exists in database
4. Check for timing issues (add waits if needed)

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/docs/intro)

