import { filterSessions } from '@/lib/my-sessions-filters';

const baseFilters = {
  practitionerId: '',
  date: 'all_time' as const,
};

describe('my sessions filters', () => {
  test('scheduled bucket uses normalized display status for paid pending_payment rows', () => {
    const sessions = [
      {
        id: 's-1',
        therapist_id: 't-1',
        session_date: '2026-03-10',
        status: 'pending_payment',
        payment_status: 'completed',
      },
      {
        id: 's-2',
        therapist_id: 't-1',
        session_date: '2026-03-11',
        status: 'pending_payment',
        payment_status: 'pending',
      },
      {
        id: 's-3',
        therapist_id: 't-1',
        session_date: '2026-03-12',
        status: 'scheduled',
        payment_status: 'pending',
      },
    ];

    const scheduled = filterSessions(sessions, {
      ...baseFilters,
      status: 'scheduled',
    });

    expect(scheduled.map((s) => s.id)).toEqual(['s-1', 's-2', 's-3']);
  });
});
/**
 * Unit tests for My Sessions filter logic (KAN-76)
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  filterSessions,
  getUniquePractitioners,
  type SessionForFilter,
  type SessionFilters,
} from '../my-sessions-filters';

const baseSession: SessionForFilter = {
  id: 's1',
  therapist_id: 't1',
  session_date: '2025-02-15',
  status: 'completed',
};

describe('filterSessions', () => {
  const fixedDate = new Date('2025-02-20');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(fixedDate.getTime());
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns all sessions when all filters are all/default', () => {
    const sessions: SessionForFilter[] = [
      { ...baseSession, id: '1', therapist_id: 't1', session_date: '2025-01-01', status: 'completed' },
      { ...baseSession, id: '2', therapist_id: 't2', session_date: '2025-02-10', status: 'scheduled' },
    ];
    const filters: SessionFilters = { practitionerId: '', date: 'all_time', status: 'all' };
    expect(filterSessions(sessions, filters)).toHaveLength(2);
  });

  it('filters by practitioner', () => {
    const sessions: SessionForFilter[] = [
      { ...baseSession, id: '1', therapist_id: 't1' },
      { ...baseSession, id: '2', therapist_id: 't2' },
    ];
    expect(filterSessions(sessions, { practitionerId: 't1', date: 'all_time', status: 'all' })).toHaveLength(1);
    expect(filterSessions(sessions, { practitionerId: 't1', date: 'all_time', status: 'all' })[0].therapist_id).toBe('t1');
  });

  it('filters by status: completed', () => {
    const sessions: SessionForFilter[] = [
      { ...baseSession, id: '1', status: 'completed' },
      { ...baseSession, id: '2', status: 'scheduled' },
      { ...baseSession, id: '3', status: 'cancelled' },
    ];
    const result = filterSessions(sessions, { practitionerId: '', date: 'all_time', status: 'completed' });
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('completed');
  });

  it('filters by status: scheduled (includes confirmed, pending_payment)', () => {
    const sessions: SessionForFilter[] = [
      { ...baseSession, id: '1', status: 'scheduled' },
      { ...baseSession, id: '2', status: 'confirmed' },
      { ...baseSession, id: '3', status: 'pending_payment' },
      { ...baseSession, id: '4', status: 'completed' },
    ];
    const result = filterSessions(sessions, { practitionerId: '', date: 'all_time', status: 'scheduled' });
    expect(result).toHaveLength(3);
    expect(result.map((s) => s.status).sort()).toEqual(['confirmed', 'pending_payment', 'scheduled']);
  });

  it('filters by status: cancelled', () => {
    const sessions: SessionForFilter[] = [
      { ...baseSession, id: '1', status: 'cancelled' },
      { ...baseSession, id: '2', status: 'completed' },
    ];
    const result = filterSessions(sessions, { practitionerId: '', date: 'all_time', status: 'cancelled' });
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('cancelled');
  });

  it('filters by this_month', () => {
    const sessions: SessionForFilter[] = [
      { ...baseSession, id: '1', session_date: '2025-02-01' },  // in month
      { ...baseSession, id: '2', session_date: '2025-01-31' },  // previous month
      { ...baseSession, id: '3', session_date: '2025-02-28' },  // in month
    ];
    const result = filterSessions(sessions, { practitionerId: '', date: 'this_month', status: 'all' });
    expect(result).toHaveLength(2);
    expect(result.map((s) => s.session_date).sort()).toEqual(['2025-02-01', '2025-02-28']);
  });

  it('filters by last_3_months', () => {
    // fixedDate is 2025-02-20; last_3_months uses startOfMonth(subMonths(now, 3)) = 2024-11-01, so Nov onward included
    const sessions: SessionForFilter[] = [
      { ...baseSession, id: '1', session_date: '2024-10-15' }, // before Nov 1 - excluded
      { ...baseSession, id: '2', session_date: '2024-12-01' }, // in range
      { ...baseSession, id: '3', session_date: '2025-02-10' },  // in range
    ];
    const result = filterSessions(sessions, { practitionerId: '', date: 'last_3_months', status: 'all' });
    expect(result).toHaveLength(2);
    expect(result.map((s) => s.session_date).sort()).toEqual(['2024-12-01', '2025-02-10']);
  });

  it('combines practitioner + status filters', () => {
    const sessions: SessionForFilter[] = [
      { ...baseSession, id: '1', therapist_id: 't1', status: 'completed' },
      { ...baseSession, id: '2', therapist_id: 't1', status: 'scheduled' },
      { ...baseSession, id: '3', therapist_id: 't2', status: 'completed' },
    ];
    const result = filterSessions(sessions, { practitionerId: 't1', date: 'all_time', status: 'completed' });
    expect(result).toHaveLength(1);
    expect(result[0].therapist_id).toBe('t1');
    expect(result[0].status).toBe('completed');
  });
});

describe('getUniquePractitioners', () => {
  it('returns unique practitioners sorted by name', () => {
    const sessions = [
      { therapist_id: 't1', therapist: { first_name: 'Bob', last_name: 'Smith' } },
      { therapist_id: 't2', therapist: { first_name: 'Alice', last_name: 'Jones' } },
      { therapist_id: 't1', therapist: { first_name: 'Bob', last_name: 'Smith' } },
    ];
    const result = getUniquePractitioners(sessions);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Alice Jones');
    expect(result[1].name).toBe('Bob Smith');
  });

  it('handles missing therapist with Unknown', () => {
    const sessions = [{ therapist_id: 't1', therapist: undefined }];
    const result = getUniquePractitioners(sessions);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Unknown');
  });
});
