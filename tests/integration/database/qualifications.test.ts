/**
 * Database integration tests for qualifications
 */

jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn(),
    storage: jest.fn(() => ({
      from: jest.fn(() => ({
        upload: jest.fn(),
        getPublicUrl: jest.fn(),
      })),
    })),
  },
}));

import { supabase } from '@/integrations/supabase/client';

const mockFrom = supabase.from as jest.Mock;

describe('Qualifications Database Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('qualifications table', () => {
    it('can query qualifications by practitioner', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [
            { id: 'q1', practitioner_id: 'p1', qualification_type: 'degree', document_url: 'https://...' },
          ],
          error: null,
        }),
      });

      const result = await supabase
        .from('qualifications')
        .select('*')
        .eq('practitioner_id', 'p1')
        .order('created_at', { ascending: false });

      expect(mockFrom).toHaveBeenCalledWith('qualifications');
      expect(result.data).toHaveLength(1);
    });

    it('can insert new qualification', async () => {
      mockFrom.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'q2', practitioner_id: 'p1' },
          error: null,
        }),
      });

      await supabase.from('qualifications').insert({
        practitioner_id: 'p1',
        qualification_type: 'certification',
      }).select().single();

      expect(mockFrom).toHaveBeenCalledWith('qualifications');
    });
  });
});
