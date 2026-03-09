import { RoleManager, isValidRole, type UserRole } from '../role-management';
import { TestStateGenerator, TestUserFactory } from './test-utils';

describe('RoleManager', () => {
  beforeEach(() => {
    // Clear all storage before each test
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('setPendingRole', () => {
    it('should store role in sessionStorage with timestamp and ID', () => {
      const role: UserRole = 'client';
      RoleManager.setPendingRole(role);

      const stored = sessionStorage.getItem('pending_user_role');
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed.role).toBe(role);
      expect(typeof parsed.timestamp).toBe('number');
      expect(typeof parsed.id).toBe('string');
    });

    it('should overwrite previous pending role', () => {
      RoleManager.setPendingRole('client');
      RoleManager.setPendingRole('sports_therapist');

      const stored = sessionStorage.getItem('pending_user_role');
      const parsed = JSON.parse(stored!);
      expect(parsed.role).toBe('sports_therapist');
    });
  });

  describe('consumePendingRole', () => {
    it('should return and remove pending role', () => {
      const role: UserRole = 'client';
      RoleManager.setPendingRole(role);

      const consumed = RoleManager.consumePendingRole();
      expect(consumed).toBe(role);

      // Should be removed after consumption
      const stored = sessionStorage.getItem('pending_user_role');
      expect(stored).toBeNull();
    });

    it('should return null if no pending role', () => {
      const consumed = RoleManager.consumePendingRole();
      expect(consumed).toBeNull();
    });

    it('should return null for expired role', () => {
      const role: UserRole = 'client';
      RoleManager.setPendingRole(role);

      // Mock expired timestamp (31 minutes ago)
      const expiredData = {
        role,
        timestamp: Date.now() - (31 * 60 * 1000),
        id: 'test-id',
      };
      sessionStorage.setItem('pending_user_role', JSON.stringify(expiredData));

      const consumed = RoleManager.consumePendingRole();
      expect(consumed).toBeNull();
    });

    it('should return null for invalid role', () => {
      const invalidData = {
        role: 'invalid_role',
        timestamp: Date.now(),
        id: 'test-id',
      };
      sessionStorage.setItem('pending_user_role', JSON.stringify(invalidData));

      const consumed = RoleManager.consumePendingRole();
      expect(consumed).toBeNull();
    });

    it('should handle corrupted sessionStorage data gracefully', () => {
      sessionStorage.setItem('pending_user_role', 'invalid-json');

      const consumed = RoleManager.consumePendingRole();
      expect(consumed).toBeNull();
    });
  });

  describe('clearAllRoleState', () => {
    it('should clear all role-related state', () => {
      // Set up various state
      localStorage.setItem('selectedRole', 'client');
      localStorage.setItem('roleSelectionTimestamp', '123456');
      sessionStorage.setItem('intendedRole', 'sports_therapist');
      sessionStorage.setItem('pending_user_role', '{"role":"client"}');

      // Mock URL with intendedRole parameter
      RoleManager.clearAllRoleState();

      expect(localStorage.getItem('selectedRole')).toBeNull();
      expect(localStorage.getItem('roleSelectionTimestamp')).toBeNull();
      expect(sessionStorage.getItem('intendedRole')).toBeNull();
      expect(sessionStorage.getItem('pending_user_role')).toBeNull();
    });
  });
});

describe('isValidRole', () => {
  it('should return true for valid roles', () => {
    expect(isValidRole('client')).toBe(true);
    expect(isValidRole('sports_therapist')).toBe(true);
    expect(isValidRole('massage_therapist')).toBe(true);
    expect(isValidRole('osteopath')).toBe(true);
    expect(isValidRole('admin')).toBe(true);
  });

  it('should return false for invalid roles', () => {
    expect(isValidRole('invalid_role')).toBe(false);
    expect(isValidRole('')).toBe(false);
    expect(isValidRole('CLIENT')).toBe(false); // Case sensitive
    expect(isValidRole('client ')).toBe(false); // Extra whitespace
  });
});

describe('RoleManager Integration', () => {
  it('should handle complete set and consume flow', () => {
    const role: UserRole = 'sports_therapist';

    RoleManager.setPendingRole(role);
    expect(sessionStorage.getItem('pending_user_role')).toBeTruthy();

    const consumed = RoleManager.consumePendingRole();
    expect(consumed).toBe(role);
    expect(sessionStorage.getItem('pending_user_role')).toBeNull();
  });
});
