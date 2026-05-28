/**
 * Pure filter logic for My Sessions (practitioner, date, status).
 * Used by MySessions page and unit tests.
 */

import { startOfMonth, endOfMonth, subMonths, isWithinInterval, parseISO } from 'date-fns';
import { getDisplaySessionStatus } from '@/lib/session-display-status';

export type DateRangeFilter = 'this_month' | 'last_3_months' | 'all_time';
export type StatusFilter = 'all' | 'completed' | 'scheduled' | 'cancelled';

export interface SessionForFilter {
  id: string;
  therapist_id: string;
  session_date: string;
  status: string;
  payment_status?: string | null;
}

export interface SessionFilters {
  practitionerId: string;
  date: DateRangeFilter;
  status: StatusFilter;
}

/**
 * Filter sessions by practitioner, date range, and status.
 * @param sessions - List of sessions
 * @param filters - Current filter values
 * @param now - Reference date (default: new Date()) for date range logic
 */
export function filterSessions<T extends SessionForFilter>(
  sessions: T[],
  filters: SessionFilters,
  now: Date = new Date()
): T[] {
  const { practitionerId, date, status } = filters;
  return sessions.filter((session) => {
    if (practitionerId && session.therapist_id !== practitionerId) return false;
    if (date !== 'all_time') {
      const d = parseISO(session.session_date);
      if (date === 'this_month') {
        if (!isWithinInterval(d, { start: startOfMonth(now), end: endOfMonth(now) })) return false;
      } else if (date === 'last_3_months') {
        const from = subMonths(now, 3);
        if (d < startOfMonth(from)) return false;
      }
    }
    if (status !== 'all') {
      const displayStatus = getDisplaySessionStatus(session);
      if (status === 'completed' && displayStatus !== 'completed') return false;
      if (status === 'scheduled' && !['scheduled', 'confirmed', 'pending_payment'].includes(displayStatus)) return false;
      if (status === 'cancelled' && displayStatus !== 'cancelled') return false;
    }
    return true;
  });
}

/**
 * Get unique practitioners from sessions for the practitioner dropdown, sorted by name.
 */
export function getUniquePractitioners(
  sessions: Array<{ therapist_id: string; therapist?: { first_name?: string; last_name?: string } }>
): { id: string; name: string }[] {
  const byId = new Map<string, { id: string; name: string }>();
  sessions.forEach((s) => {
    if (!s.therapist_id || byId.has(s.therapist_id)) return;
    byId.set(s.therapist_id, {
      id: s.therapist_id,
      name: [s.therapist?.first_name, s.therapist?.last_name].filter(Boolean).join(' ') || 'Unknown',
    });
  });
  return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
}
