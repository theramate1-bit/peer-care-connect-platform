const { RoleManager, isValidRole } = require('../role-management');

// Use shared sessionStorage/localStorage from test setup; clear before each test
describe('Supabase Core Functionality Tests', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  describe('RoleManager', () => {
    test('should set pending role correctly', () => {
      const testRole = 'sports_therapist';
      RoleManager.setPendingRole(testRole);
      const raw = sessionStorage.getItem('pending_user_role');
      expect(raw).toBeTruthy();
      const parsed = JSON.parse(raw);
      expect(parsed.role).toBe(testRole);
      expect(typeof parsed.timestamp).toBe('number');
      expect(typeof parsed.id).toBe('string');
    });

    test('should consume pending role correctly', () => {
      const testRole = 'client';
      sessionStorage.setItem('pending_user_role', JSON.stringify({
        role: testRole,
        timestamp: Date.now(),
        id: 'test-id'
      }));
      const consumedRole = RoleManager.consumePendingRole();
      expect(consumedRole).toBe(testRole);
      expect(sessionStorage.getItem('pending_user_role')).toBeNull();
    });

    test('should return null for expired role', () => {
      sessionStorage.setItem('pending_user_role', JSON.stringify({
        role: 'client',
        timestamp: Date.now() - 2000000,
        id: 'test-id'
      }));
      const consumedRole = RoleManager.consumePendingRole();
      expect(consumedRole).toBeNull();
    });

    test('should return null when no pending role', () => {
      const consumedRole = RoleManager.consumePendingRole();
      expect(consumedRole).toBeNull();
    });

    test('should clear all role state', () => {
      sessionStorage.setItem('pending_user_role', '{}');
      localStorage.setItem('selectedRole', 'client');
      localStorage.setItem('roleSelectionTimestamp', '123');
      RoleManager.clearAllRoleState();
      expect(sessionStorage.getItem('pending_user_role')).toBeNull();
      expect(localStorage.getItem('selectedRole')).toBeNull();
      expect(localStorage.getItem('roleSelectionTimestamp')).toBeNull();
    });
  });

  describe('Role Validation', () => {
    test('should validate valid roles', () => {
      expect(isValidRole('client')).toBe(true);
      expect(isValidRole('sports_therapist')).toBe(true);
      expect(isValidRole('massage_therapist')).toBe(true);
      expect(isValidRole('osteopath')).toBe(true);
      expect(isValidRole('admin')).toBe(true);
    });

    test('should reject invalid roles', () => {
      expect(isValidRole('invalid_role')).toBe(false);
      expect(isValidRole('')).toBe(false);
      expect(isValidRole(null)).toBe(false);
      expect(isValidRole(undefined)).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed session storage', () => {
      sessionStorage.setItem('pending_user_role', 'invalid-json');
      const consumedRole = RoleManager.consumePendingRole();
      expect(consumedRole).toBeNull();
    });

    test('should handle missing timestamp', () => {
      sessionStorage.setItem('pending_user_role', JSON.stringify({
        role: 'client',
        id: 'test-id'
      }));
      const consumedRole = RoleManager.consumePendingRole();
      expect(consumedRole).toBeNull();
    });

    test('should handle null role in session storage', () => {
      sessionStorage.setItem('pending_user_role', JSON.stringify({
        role: null,
        timestamp: Date.now(),
        id: 'test-id'
      }));
      const consumedRole = RoleManager.consumePendingRole();
      expect(consumedRole).toBeNull();
    });
  });
});
