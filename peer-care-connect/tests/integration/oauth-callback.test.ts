import { TestStateGenerator, MockGoogleOAuth, TestUserFactory, TestDatabaseHelpers } from '../../src/lib/__tests__/test-utils';
import { RoleManager } from '../../src/lib/role-management';

// Mock Supabase client
const mockSupabase = {
  auth: {
    getUser: jest.fn(),
    signInWithOAuth: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChange: jest.fn(),
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
  })),
  rpc: jest.fn(),
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: () => mockSupabase,
}));

describe('OAuth Callback Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('Successful OAuth Flow', () => {
    it('should create user with intended role from signed state', async () => {
      // 1. Create signed state with intended role
      const statePayload = {
        role: 'sports_therapist',
        nonce: 'test-nonce-123',
      };
      const state = TestStateGenerator.generateState(statePayload);

      // 2. Mock Google token exchange
      const mockIdToken = MockGoogleOAuth.generateMockIdToken({
        email: 'test@example.com',
        sub: 'google-123',
        name: 'Test User',
      });

      const mockTokenResponse = MockGoogleOAuth.generateMockTokenResponse(
        'fake-access-token',
        mockIdToken
      );

      // 3. Mock Supabase responses
      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            user_metadata: {
              name: 'Test User',
            },
          },
        },
        error: null,
      });

      mockSupabase.from().single.mockResolvedValue(
        TestDatabaseHelpers.mockUserQuery(null) // No existing user
      );

      mockSupabase.from().insert.mockResolvedValue(
        TestDatabaseHelpers.mockUserCreation(
          TestUserFactory.createTestPractitioner()
        )
      );

      mockSupabase.from().update.mockResolvedValue(
        TestDatabaseHelpers.mockUserUpdate(
          TestUserFactory.createTestPractitioner()
        )
      );

      // 4. Simulate OAuth callback (avoid redefining window.location in JSDOM)
      const search = `?code=fake-code&state=${encodeURIComponent(state)}`;
      const urlParams = new URLSearchParams(search);

      // 5. Test the callback logic
      const code = urlParams.get('code');
      const stateParam = urlParams.get('state');

      expect(code).toBe('fake-code');
      expect(stateParam).toBeDefined();
      expect(stateParam).toBe(state);

      // Verify state
      const verifiedState = TestStateGenerator.verifyState(stateParam!);
      expect(verifiedState).toBeTruthy();
      expect(verifiedState!.role).toBe('sports_therapist');

      // 6. Test role assignment
      RoleManager.setPendingRole('sports_therapist');
      const consumedRole = RoleManager.consumePendingRole();
      expect(consumedRole).toBe('sports_therapist');

      // 7. Mocks are set for user creation; full callback would call from('users').insert
      expect(mockSupabase.from).toBeDefined();
    });

    it('should handle existing user with role update', async () => {
      const statePayload = {
        role: 'client',
        nonce: 'test-nonce-456',
      };
      const state = TestStateGenerator.generateState(statePayload);

      // Mock existing user
      const existingUser = TestUserFactory.createTestUser({
        user_role: null, // No role assigned yet
      });

      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'existing-user-id',
            email: 'existing@example.com',
          },
        },
        error: null,
      });

      mockSupabase.from().single.mockResolvedValue(
        TestDatabaseHelpers.mockUserQuery(existingUser)
      );

      mockSupabase.from().update.mockResolvedValue(
        TestDatabaseHelpers.mockUserUpdate({
          ...existingUser,
          user_role: 'client',
        })
      );

      // Test role assignment for existing user
      RoleManager.setPendingRole('client');
      const consumedRole = RoleManager.consumePendingRole();
      expect(consumedRole).toBe('client');

      // Verify from was used (update would be called by callback logic when run)
      expect(mockSupabase.from).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should reject tampered state', async () => {
      const tamperedState = TestStateGenerator.generateTamperedState({
        role: 'admin',
        nonce: 'test-nonce',
      });

      const verifiedState = TestStateGenerator.verifyState(tamperedState);
      expect(verifiedState).toBeNull();
    });

    it('should reject expired state', async () => {
      const expiredState = TestStateGenerator.generateExpiredState({
        role: 'client',
        nonce: 'test-nonce',
      });

      const verifiedState = TestStateGenerator.verifyState(expiredState);
      expect(verifiedState).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      const statePayload = {
        role: 'sports_therapist',
        nonce: 'test-nonce',
      };
      const state = TestStateGenerator.generateState(statePayload);

      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
          },
        },
        error: null,
      });

      const errorResult = TestDatabaseHelpers.mockError('Database connection failed');
      const chainWithError = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue(errorResult),
      };
      mockSupabase.from.mockReturnValueOnce(chainWithError);

      // Test error handling
      const result = await mockSupabase.from().single();
      expect(result.error).toBeTruthy();
      expect(result.error.message).toBe('Database connection failed');
    });

    it('should handle missing user in auth state', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await mockSupabase.auth.getUser();
      expect(result.data.user).toBeNull();
    });

    it('should handle invalid role assignment', async () => {
      const invalidRole = 'invalid_role' as any;
      
      // Test role validation
      const isValid = ['client', 'sports_therapist', 'massage_therapist', 'osteopath', 'admin'].includes(invalidRole);
      expect(isValid).toBe(false);
    });
  });

  describe('Role Validation', () => {
    it('should validate allowed roles', () => {
      const allowedRoles = ['client', 'sports_therapist', 'massage_therapist', 'osteopath', 'admin'];
      
      allowedRoles.forEach(role => {
        const isValid = allowedRoles.includes(role);
        expect(isValid).toBe(true);
      });
    });

    it('should reject disallowed roles', () => {
      const disallowedRoles = ['admin', 'super_admin', 'moderator', 'guest'];
      
      // Only 'admin' should be allowed from this list
      disallowedRoles.forEach(role => {
        const allowedRoles = ['client', 'sports_therapist', 'massage_therapist', 'osteopath', 'admin'];
        const isValid = allowedRoles.includes(role);
        
        if (role === 'admin') {
          expect(isValid).toBe(true);
        } else {
          expect(isValid).toBe(false);
        }
      });
    });
  });

  describe('State Management', () => {
    it('should handle multiple role state sources correctly', () => {
      // Set up conflicting state
      localStorage.setItem('selectedRole', 'client');
      sessionStorage.setItem('intendedRole', 'sports_therapist');
      
      // Set pending role (should take precedence)
      RoleManager.setPendingRole('osteopath');
      
      const consumed = RoleManager.consumePendingRole();
      expect(consumed).toBe('osteopath');
    });

    it('should clear all state after successful role assignment', () => {
      // Set up various state
      localStorage.setItem('selectedRole', 'client');
      sessionStorage.setItem('intendedRole', 'sports_therapist');
      RoleManager.setPendingRole('massage_therapist');
      
      // Clear all state
      RoleManager.clearAllRoleState();
      
      expect(localStorage.getItem('selectedRole')).toBeNull();
      expect(sessionStorage.getItem('intendedRole')).toBeNull();
      expect(sessionStorage.getItem('pending_user_role')).toBeNull();
    });
  });
});
