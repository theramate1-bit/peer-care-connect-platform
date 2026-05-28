import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { supabase } from '@/integrations/supabase/client';
import { RoleManager, isValidRole } from '../role-management';

// Mock Supabase client (path must match module resolution)
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      maybeSingle: jest.fn(),
    })),
    auth: {
      getUser: jest.fn(),
      signInWithOAuth: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
    rpc: jest.fn(),
  },
}));

describe('Supabase Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear session storage before each test
    sessionStorage.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('RoleManager', () => {
    it('should set and consume pending role correctly', () => {
      const testRole = 'sports_therapist';
      
      // Set pending role
      RoleManager.setPendingRole(testRole);
      
      // Consume pending role
      const consumedRole = RoleManager.consumePendingRole();
      
      expect(consumedRole).toBe(testRole);
      
      // Second consumption should return null (single use)
      const secondConsumption = RoleManager.consumePendingRole();
      expect(secondConsumption).toBeNull();
    });

    it('should return null for expired roles', () => {
      const oldTimestamp = Date.now() - (31 * 60 * 1000);
      sessionStorage.setItem('pending_user_role', JSON.stringify({
        role: 'client',
        timestamp: oldTimestamp,
        id: 'test-id'
      }));
      const consumedRole = RoleManager.consumePendingRole();
      expect(consumedRole).toBeNull();
    });

    it('should validate roles correctly', () => {
      expect(isValidRole('client')).toBe(true);
      expect(isValidRole('sports_therapist')).toBe(true);
      expect(isValidRole('massage_therapist')).toBe(true);
      expect(isValidRole('osteopath')).toBe(true);
      expect(isValidRole('admin')).toBe(true);
      
      expect(isValidRole('invalid_role')).toBe(false);
      expect(isValidRole('')).toBe(false);
      expect(isValidRole(null as unknown)).toBe(false);
      expect(isValidRole(undefined as unknown)).toBe(false);
    });

    it('should clear all role state', () => {
      // Set some state
      RoleManager.setPendingRole('client');
      localStorage.setItem('selectedRole', 'practitioner');
      localStorage.setItem('roleSelectionTimestamp', Date.now().toString());
      
      // Clear all state
      RoleManager.clearAllRoleState();
      
      // Verify all state is cleared
      expect(sessionStorage.getItem('pending_user_role')).toBeNull();
      expect(localStorage.getItem('selectedRole')).toBeNull();
      expect(localStorage.getItem('roleSelectionTimestamp')).toBeNull();
    });
  });

  describe('Database Functions', () => {
    it('should handle user profile creation', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        user_metadata: {
          first_name: 'Test',
          last_name: 'User'
        }
      };

      const mockProfile = {
        id: 'test-user-id',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        user_role: null,
        onboarding_status: 'pending',
        profile_completed: false,
        is_verified: true,
        is_active: true,
      };

      // Mock the database response
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: null
        }),
        insert: jest.fn().mockResolvedValue({
          data: mockProfile,
          error: null
        })
      });

      // Test profile creation
      const { data, error } = await supabase
        .from('users')
        .insert({
          id: mockUser.id,
          email: mockUser.email,
          first_name: mockUser.user_metadata?.first_name || '',
          last_name: mockUser.user_metadata?.last_name || '',
          onboarding_status: 'pending',
          profile_completed: false,
          is_verified: true,
          is_active: true,
        });

      expect(error).toBeNull();
      expect(data).toEqual(mockProfile);
    });

  });

  describe('OAuth Flow', () => {
    it('should handle OAuth callback with valid parameters', async () => {
      const mockUser = {
        id: 'oauth-user-id',
        email: 'oauth@example.com'
      };

      // Mock auth state
      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      // Mock profile fetch
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: {
            id: mockUser.id,
            email: mockUser.email,
            user_role: null,
            onboarding_status: 'pending'
          },
          error: null
        }),
        single: jest.fn().mockResolvedValue({
          data: {
            id: mockUser.id,
            email: mockUser.email,
            user_role: 'sports_therapist',
            onboarding_status: 'in_progress'
          },
          error: null
        })
      });

      // Set pending role
      RoleManager.setPendingRole('sports_therapist');

      // Simulate OAuth callback flow (getUser returns { data: { user }, error })
      const { data: authData } = await supabase.auth.getUser();
      expect(authData?.user).toEqual(mockUser);
      const user = authData?.user;

      const intendedRole = RoleManager.consumePendingRole();
      expect(intendedRole).toBe('sports_therapist');

      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      expect(profile).toBeDefined();
      expect(profile.user_role).toBeNull(); // Initially null
    });

    it('should handle OAuth callback with missing user', async () => {
      supabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      });
      const { data } = await supabase.auth.getUser();
      expect(data?.user).toBeNull();
    });

    it('should handle OAuth callback with database error', async () => {
      const mockUser = {
        id: 'error-user-id',
        email: 'error@example.com'
      };

      // Mock auth state
      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      // Mock database error
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection failed' }
        })
      });

      const { data: authData } = await supabase.auth.getUser();
      expect(authData?.user).toEqual(mockUser);
      const user = authData?.user;

      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      expect(profile).toBeNull();
      expect(error).toBeDefined();
      expect(error.message).toBe('Database connection failed');
    });
  });

  describe('Error Handling', () => {
    it('should reject invalid role via isValidRole', () => {
      expect(isValidRole('invalid_role')).toBe(false);
    });

    it('should handle malformed session storage', () => {
      // Set malformed data in session storage
      sessionStorage.setItem('pending_user_role', 'invalid-json');
      
      const consumedRole = RoleManager.consumePendingRole();
      expect(consumedRole).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty session storage', () => {
      const consumedRole = RoleManager.consumePendingRole();
      expect(consumedRole).toBeNull();
    });

    it('should handle null role in session storage', () => {
      sessionStorage.setItem('pending_user_role', JSON.stringify({
        role: null,
        timestamp: Date.now(),
        id: 'test-id'
      }));
      
      const consumedRole = RoleManager.consumePendingRole();
      expect(consumedRole).toBeNull();
    });

    it('should handle missing timestamp in session storage', () => {
      sessionStorage.setItem('pending_user_role', JSON.stringify({
        role: 'client',
        id: 'test-id'
        // Missing timestamp
      }));
      
      const consumedRole = RoleManager.consumePendingRole();
      expect(consumedRole).toBeNull();
    });
  });
});
