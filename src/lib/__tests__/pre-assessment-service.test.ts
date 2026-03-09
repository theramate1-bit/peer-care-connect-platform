/**
 * Tests for PreAssessmentService (KAN-191: guest/client repeat pre-assessment rules)
 */

import { PreAssessmentService } from '../pre-assessment-service';

const mockFrom = jest.fn();
const mockRpc = jest.fn();
const mockSelect = jest.fn().mockReturnThis();
const mockEq = jest.fn().mockReturnThis();
const mockSingle = jest.fn();
const mockIn = jest.fn().mockReturnThis();

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
          in: mockIn,
        };
      }
      return {};
    });
  });

  it('returns required for first-time guest (no client identity)', async () => {
    mockSingle.mockResolvedValueOnce({
      data: { client_id: null, therapist_id: therapistId, client_email: 'guest@test.com' },
      error: null,
    });

    const result = await PreAssessmentService.checkFormRequirement(sessionId);

    expect(result).toEqual({ required: true, canSkip: false, reason: 'guest' });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('returns required for first-time guest when clientId provided and is_first_session true', async () => {
    mockSingle.mockResolvedValueOnce({
      data: { client_id: guestClientId, therapist_id: therapistId, client_email: 'guest@test.com' },
      error: null,
    });
    mockRpc.mockResolvedValueOnce({ data: true, error: null });

    const result = await PreAssessmentService.checkFormRequirement(sessionId, guestClientId);

    expect(result).toEqual({ required: true, canSkip: false, reason: 'initial_session' });
    expect(mockRpc).toHaveBeenCalledWith('is_first_session_with_practitioner', {
      p_client_id: guestClientId,
      p_therapist_id: therapistId,
    });
  });

  it('returns optional for repeat guest (same practitioner)', async () => {
    mockSingle.mockResolvedValueOnce({
      data: { client_id: guestClientId, therapist_id: therapistId, client_email: 'guest@test.com' },
      error: null,
    });
    mockRpc.mockResolvedValueOnce({ data: false, error: null });

    const result = await PreAssessmentService.checkFormRequirement(sessionId, guestClientId);

    expect(result).toEqual({ required: false, canSkip: true, reason: 'subsequent_session' });
    expect(mockRpc).toHaveBeenCalledWith('is_first_session_with_practitioner', {
      p_client_id: guestClientId,
      p_therapist_id: therapistId,
    });
  });

  it('returns required for first-time client', async () => {
    mockSingle.mockResolvedValueOnce({
      data: { client_id: clientId, therapist_id: therapistId, client_email: 'client@test.com' },
      error: null,
    });
    mockRpc.mockResolvedValueOnce({ data: true, error: null });

    const result = await PreAssessmentService.checkFormRequirement(sessionId, clientId);

    expect(result).toEqual({ required: true, canSkip: false, reason: 'initial_session' });
  });

  it('returns optional for repeat client with same practitioner', async () => {
    mockSingle.mockResolvedValueOnce({
      data: { client_id: clientId, therapist_id: therapistId, client_email: 'client@test.com' },
      error: null,
    });
    mockRpc.mockResolvedValueOnce({ data: false, error: null });

    const result = await PreAssessmentService.checkFormRequirement(sessionId, clientId);

    expect(result).toEqual({ required: false, canSkip: true, reason: 'subsequent_session' });
  });

  it('uses session.client_id when clientId not provided (guest path)', async () => {
    mockSingle.mockResolvedValueOnce({
      data: { client_id: guestClientId, therapist_id: therapistId, client_email: 'guest@test.com' },
      error: null,
    });
    mockRpc.mockResolvedValueOnce({ data: false, error: null });

    const result = await PreAssessmentService.checkFormRequirement(sessionId);

    expect(result).toEqual({ required: false, canSkip: true, reason: 'subsequent_session' });
    expect(mockRpc).toHaveBeenCalledWith('is_first_session_with_practitioner', {
      p_client_id: guestClientId,
      p_therapist_id: therapistId,
    });
  });

  it('returns subsequent_session when session not found (safe default)', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: null });

    const result = await PreAssessmentService.checkFormRequirement(sessionId, clientId);

    expect(result).toEqual({ required: false, canSkip: true, reason: 'subsequent_session' });
  });
});
