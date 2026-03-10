/**
 * Tests for PreAssessmentService (KAN-191: guest/client repeat pre-assessment rules)
 * Updated to match current implementation using email_has_completed_pre_assessment RPC.
 */

import { PreAssessmentService } from '../pre-assessment-service';

const mockFrom = jest.fn();
const mockRpc = jest.fn();
const mockSelect = jest.fn().mockReturnThis();
const mockEq = jest.fn().mockReturnThis();
const mockSingle = jest.fn();

jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
    rpc: (fn: string, args: unknown) => mockRpc(fn, args),
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn() },
}));

describe('PreAssessmentService.checkFormRequirement', () => {
  const sessionId = 'session-1';
  const therapistId = 'therapist-1';
  const clientId = 'client-1';
  const guestClientId = 'guest-user-1';

  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockImplementation((table: string) => {
      if (table === 'client_sessions') {
        return {
          select: mockSelect,
          eq: mockEq,
          single: mockSingle,
        };
      }
      return {};
    });
  });

  it('returns required for first-time guest (no client email)', async () => {
    mockSingle.mockResolvedValueOnce({
      data: { client_id: null, therapist_id: therapistId, client_email: '' },
      error: null,
    });

    const result = await PreAssessmentService.checkFormRequirement(sessionId);

    expect(result).toEqual({ required: true, canSkip: false, reason: 'first_time_user' });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('returns required for first-time guest when email not recognised', async () => {
    mockSingle.mockResolvedValueOnce({
      data: { client_id: guestClientId, therapist_id: therapistId, client_email: 'guest@test.com' },
      error: null,
    });
    mockRpc.mockResolvedValueOnce({ data: false, error: null });

    const result = await PreAssessmentService.checkFormRequirement(sessionId, guestClientId);

    expect(result).toEqual({ required: true, canSkip: false, reason: 'first_time_user' });
    expect(mockRpc).toHaveBeenCalledWith('email_has_completed_pre_assessment', {
      p_email: 'guest@test.com',
    });
  });

  it('returns optional for repeat guest (email has completed form)', async () => {
    mockSingle.mockResolvedValueOnce({
      data: { client_id: guestClientId, therapist_id: therapistId, client_email: 'guest@test.com' },
      error: null,
    });
    mockRpc.mockResolvedValueOnce({ data: true, error: null });

    const result = await PreAssessmentService.checkFormRequirement(sessionId, guestClientId);

    expect(result).toEqual({ required: false, canSkip: true, reason: 'returning_user' });
    expect(mockRpc).toHaveBeenCalledWith('email_has_completed_pre_assessment', {
      p_email: 'guest@test.com',
    });
  });

  it('returns required for first-time client', async () => {
    mockSingle.mockResolvedValueOnce({
      data: { client_id: clientId, therapist_id: therapistId, client_email: 'client@test.com' },
      error: null,
    });
    mockRpc.mockResolvedValueOnce({ data: false, error: null });

    const result = await PreAssessmentService.checkFormRequirement(sessionId, clientId);

    expect(result).toEqual({ required: true, canSkip: false, reason: 'first_time_user' });
    expect(mockRpc).toHaveBeenCalledWith('email_has_completed_pre_assessment', {
      p_email: 'client@test.com',
    });
  });

  it('returns optional for repeat client with same practitioner', async () => {
    mockSingle.mockResolvedValueOnce({
      data: { client_id: clientId, therapist_id: therapistId, client_email: 'client@test.com' },
      error: null,
    });
    mockRpc.mockResolvedValueOnce({ data: true, error: null });

    const result = await PreAssessmentService.checkFormRequirement(sessionId, clientId);

    expect(result).toEqual({ required: false, canSkip: true, reason: 'returning_user' });
    expect(mockRpc).toHaveBeenCalledWith('email_has_completed_pre_assessment', {
      p_email: 'client@test.com',
    });
  });

  it('uses session.client_email when clientId not provided (guest path)', async () => {
    mockSingle.mockResolvedValueOnce({
      data: { client_id: guestClientId, therapist_id: therapistId, client_email: 'guest@test.com' },
      error: null,
    });
    mockRpc.mockResolvedValueOnce({ data: true, error: null });

    const result = await PreAssessmentService.checkFormRequirement(sessionId);

    expect(result).toEqual({ required: false, canSkip: true, reason: 'returning_user' });
    expect(mockRpc).toHaveBeenCalledWith('email_has_completed_pre_assessment', {
      p_email: 'guest@test.com',
    });
  });

  it('returns subsequent_session when session not found (safe default)', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: null });

    const result = await PreAssessmentService.checkFormRequirement(sessionId, clientId);

    expect(result).toEqual({ required: false, canSkip: true, reason: 'subsequent_session' });
  });
});
