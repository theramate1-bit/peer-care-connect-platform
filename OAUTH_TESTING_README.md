# Google OAuth Sign-up Unit Tests

This directory contains comprehensive unit tests for the Google OAuth sign-up process across all user types in the TheraMate platform.

## Overview

The OAuth testing suite validates the complete sign-up flow for each user type:
- **Client** - Users seeking healthcare services
- **Sports Therapist** - Sports injury specialists
- **Massage Therapist** - Licensed massage professionals  
- **Osteopath** - Registered osteopathic practitioners

## Test Structure

### Core Test Files

1. **`GoogleOAuthSignup.test.tsx`** - Main OAuth sign-up tests
   - Tests OAuth initiation for each user type
   - Tests OAuth callback processing
   - Tests OAuth completion flow
   - Tests error handling and edge cases
   - Tests role-specific redirects

2. **`GoogleOAuthIntegration.test.tsx`** - Integration tests
   - Complete OAuth flow validation
   - Mock service integration
   - Error scenario testing
   - Edge case handling

3. **`MockGoogleOAuthService.ts`** - Mock OAuth service
   - Simulates Google OAuth endpoints
   - Provides test users for each role
   - Handles error scenarios
   - Validates OAuth flows

### Supporting Files

- **`jest.oauth.config.js`** - Jest configuration for OAuth tests
- **`global-setup.ts`** - Test environment setup
- **`global-teardown.ts`** - Test environment cleanup
- **`supabase.mock.ts`** - Supabase client mock
- **`sonner.mock.ts`** - Toast notification mock
- **`run-oauth-tests.js`** - Test runner script

## Running Tests

### Individual Test Commands

```bash
# Run all OAuth unit tests
npm run test:oauth:unit

# Run OAuth tests in watch mode
npm run test:oauth:unit:watch

# Run OAuth tests with coverage
npm run test:oauth:coverage

# Run comprehensive OAuth test suite
npm run test:oauth:all
```

### Test Categories

#### 1. OAuth Initiation Tests
Tests the initial OAuth sign-up button clicks and role assignment:

```typescript
it('should initiate Google OAuth for Client', async () => {
  // Test OAuth button click
  // Verify role is set in session storage
  // Confirm OAuth redirect is initiated
});
```

#### 2. OAuth Callback Tests
Tests the OAuth callback processing after Google authentication:

```typescript
it('should handle OAuth callback for Sports Therapist', async () => {
  // Mock Google user data
  // Test profile creation
  // Verify role assignment
  // Check redirect logic
});
```

#### 3. OAuth Completion Tests
Tests the OAuth completion form and final registration:

```typescript
it('should complete OAuth registration for Massage Therapist', async () => {
  // Test form validation
  // Test user data update
  // Test profile upsert
  // Verify completion flow
});
```

#### 4. Error Handling Tests
Tests various error scenarios:

```typescript
it('should handle OAuth sign-in errors', async () => {
  // Test network errors
  // Test authentication failures
  // Test database errors
  // Verify error messages
});
```

#### 5. Edge Case Tests
Tests edge cases and unusual scenarios:

```typescript
it('should handle missing user metadata gracefully', async () => {
  // Test empty OAuth metadata
  // Test fallback name extraction
  // Verify graceful degradation
});
```

## Mock Services

### MockGoogleOAuthService

The mock service provides:

- **Test Users**: Pre-configured users for each role type
- **OAuth Simulation**: Complete OAuth flow simulation
- **Error Scenarios**: Various error condition testing
- **Validation**: OAuth flow validation for each user type

```typescript
// Validate OAuth flow for a specific user type
const result = await mockGoogleOAuthService.validateOAuthFlowForUserType('client');
expect(result.success).toBe(true);
expect(result.user).toBeDefined();
```

### Test User Data

Each user type has dedicated test data:

```typescript
const mockGoogleUserData = {
  client: {
    id: 'client-123',
    email: 'client@example.com',
    user_metadata: {
      first_name: 'John',
      last_name: 'Client',
      // ... other metadata
    },
  },
  // ... other user types
};
```

## Coverage Requirements

The OAuth tests maintain high coverage standards:

- **Statements**: 80%+
- **Branches**: 80%+
- **Functions**: 80%+
- **Lines**: 80%+

### Coverage Areas

- OAuth initiation logic
- OAuth callback processing
- OAuth completion flow
- Error handling
- Role assignment
- Profile creation
- Redirect logic

## Test Scenarios

### Happy Path Scenarios

1. **Complete Client Sign-up**
   - Click "Sign up with Google as Client"
   - Complete Google OAuth
   - Fill completion form
   - Redirect to client dashboard

2. **Complete Practitioner Sign-up**
   - Click "Sign up with Google as [Practitioner Type]"
   - Complete Google OAuth
   - Fill completion form
   - Redirect to practitioner dashboard

### Error Scenarios

1. **OAuth Failures**
   - Network errors
   - Authentication failures
   - Invalid credentials
   - Server errors

2. **Database Errors**
   - Profile creation failures
   - Role assignment failures
   - Update failures

3. **Validation Errors**
   - Missing required fields
   - Invalid data formats
   - Terms not accepted

### Edge Cases

1. **Missing Metadata**
   - Empty OAuth user metadata
   - Partial name information
   - Missing email verification

2. **Existing Users**
   - Users with existing profiles
   - Users with incomplete onboarding
   - Users with existing roles

3. **Network Issues**
   - Slow connections
   - Intermittent failures
   - Timeout scenarios

## Best Practices

### Test Organization

- Group tests by user type
- Separate happy path from error scenarios
- Use descriptive test names
- Maintain consistent test structure

### Mock Management

- Reset mocks between tests
- Use realistic test data
- Mock external dependencies
- Verify mock interactions

### Assertions

- Test both success and failure cases
- Verify user data accuracy
- Check redirect destinations
- Validate error messages

## Debugging Tests

### Common Issues

1. **Mock Not Working**
   - Check mock setup in beforeEach
   - Verify mock return values
   - Ensure proper mock imports

2. **Async Test Failures**
   - Use proper async/await patterns
   - Add appropriate waitFor calls
   - Check test timeouts

3. **Component Rendering Issues**
   - Verify test wrapper setup
   - Check component imports
   - Ensure proper routing

### Debug Commands

```bash
# Run specific test with verbose output
npm run test:oauth:unit -- --verbose

# Run tests in debug mode
npm run test:oauth:unit -- --detectOpenHandles

# Run single test file
npm run test:oauth:unit -- GoogleOAuthSignup.test.tsx
```

## Continuous Integration

The OAuth tests are integrated into the CI/CD pipeline:

- **Pre-commit**: Run OAuth unit tests
- **Pull Requests**: Full OAuth test suite
- **Deployment**: OAuth integration tests

### CI Configuration

```yaml
# Example GitHub Actions workflow
- name: Run OAuth Tests
  run: |
    npm run test:oauth:unit
    npm run test:oauth:coverage
```

## Contributing

When adding new OAuth features:

1. **Add Tests**: Create tests for new functionality
2. **Update Mocks**: Extend mock services as needed
3. **Maintain Coverage**: Ensure coverage requirements
4. **Document Changes**: Update test documentation

### Test Naming Convention

```typescript
// Format: should [action] for [user type] when [condition]
it('should initiate Google OAuth for Client when button is clicked', async () => {
  // Test implementation
});

it('should handle OAuth errors gracefully for Sports Therapist when network fails', async () => {
  // Test implementation
});
```

## Troubleshooting

### Common Problems

1. **Tests Timing Out**
   - Increase test timeout
   - Check for infinite loops
   - Verify async operations

2. **Mock Not Resetting**
   - Clear mocks in beforeEach
   - Use restoreMocks: true
   - Check mock scope

3. **Component Not Rendering**
   - Verify test wrapper
   - Check component dependencies
   - Ensure proper imports

### Getting Help

- Check test output for specific errors
- Review mock implementations
- Consult Jest documentation
- Check component test examples

## Future Enhancements

Planned improvements to the OAuth test suite:

1. **Performance Testing**: Add performance benchmarks
2. **Accessibility Testing**: Include a11y tests
3. **Cross-browser Testing**: Add browser-specific tests
4. **Visual Regression**: Add visual testing
5. **Load Testing**: Add load testing scenarios

---

For questions or issues with OAuth tests, please refer to the main project documentation or create an issue in the repository.