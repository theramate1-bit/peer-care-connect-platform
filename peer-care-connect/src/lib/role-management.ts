/**
 * Role management for OAuth callback and onboarding.
 * Handles pending role selection via sessionStorage.
 */
import type { UserRole } from '@/types/roles';

const PENDING_ROLE_KEY = 'pending_user_role';
const VALID_ROLES: string[] = ['client', 'sports_therapist', 'massage_therapist', 'osteopath', 'admin'];

export type { UserRole };

export function isValidRole(value: unknown): value is Exclude<UserRole, null> {
  return typeof value === 'string' && VALID_ROLES.includes(value);
}

export const RoleManager = {
  setPendingRole(role: string): void {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `role-${Date.now()}`;
    sessionStorage.setItem(PENDING_ROLE_KEY, JSON.stringify({ role, timestamp: Date.now(), id }));
  },

  consumePendingRole(): string | null {
    const raw = sessionStorage.getItem(PENDING_ROLE_KEY);
    sessionStorage.removeItem(PENDING_ROLE_KEY);
    if (raw == null || raw === '') return null;
    try {
      const parsed = JSON.parse(raw) as { role?: string; timestamp?: number };
      if (typeof parsed?.role === 'string' && isValidRole(parsed.role)) {
        const maxAgeMs = 30 * 60 * 1000;
        if (typeof parsed.timestamp !== 'number') return null;
        if (Date.now() - parsed.timestamp > maxAgeMs) return null;
        return parsed.role;
      }
      return null;
    } catch {
      return null;
    }
  },

  clearAllRoleState(): void {
    sessionStorage.removeItem(PENDING_ROLE_KEY);
    sessionStorage.removeItem('intendedRole');
    localStorage.removeItem('selectedRole');
    localStorage.removeItem('roleSelectionTimestamp');
  },
};
