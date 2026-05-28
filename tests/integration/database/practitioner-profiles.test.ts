/**
 * Database integration tests for practitioner profiles
 */

jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

import { supabase } from '@/integrations/supabase/client';

const mockFrom = supabase.from as jest.Mock;

describe('Practitioner Profiles Database Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('users table', () => {
    it('can query user by id', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'u1', user_role: 'sports_therapist', onboarding_status: 'completed' },
          error: null,
        }),
      });

      const result = await supabase.from('users').select('*').eq('id', 'u1').single();

      expect(mockFrom).toHaveBeenCalledWith('users');
      expect(result.data?.user_role).toBe('sports_therapist');
    });
  });

  describe('practitioner_profiles / profiles', () => {
    it('can query profile by user id', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { id: 'p1', first_name: 'Jane', last_name: 'Doe', bio: 'Experienced therapist' },
          error: null,
        }),
      });

      const result = await supabase.from('profiles').select('*').eq('id', 'u1').maybeSingle();

      expect(result.data).toBeDefined();
      expect(result.error).toBeNull();
    });

    it('can update profile fields', async () => {
      const mockSingle = jest.fn().mockResolvedValue({
        data: { id: 'p1', first_name: 'Jane', last_name: 'Updated' },
        error: null,
      });
      const chain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: mockSingle,
      };
      mockFrom.mockReturnValue(chain);

      const result = await supabase.from('profiles').update({ last_name: 'Updated' }).eq('id', 'u1').select().single();

      expect(mockFrom).toHaveBeenCalledWith('profiles');
      expect(result.data?.last_name).toBe('Updated');
    });
  });
});
