/**
 * Tests for stripe-products (KAN-184: practitioner product save/load/delete and error messages)
 */

import {
  createPractitionerProduct,
  updatePractitionerProduct,
  deletePractitionerProduct,
  getPractitionerProducts,
} from '../stripe-products';

const mockGetSession = jest.fn();
const mockInvoke = jest.fn();
const mockFrom = jest.fn();
const mockSelect = jest.fn().mockReturnThis();
const mockEq = jest.fn().mockReturnThis();

jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
    },
    functions: {
      invoke: (name: string, opts: unknown) => mockInvoke(name, opts),
    },
    from: (table: string) => mockFrom(table),
  },
}));

describe('stripe-products', () => {
  const practitionerId = 'pract-1';
  const productId = 'prod-1';
  const validSession = { access_token: 'token', user: { id: 'user-1' } };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: { session: validSession }, error: null });
  });

  describe('createPractitionerProduct', () => {
    it('returns error when session is missing', async () => {
      mockGetSession.mockResolvedValueOnce({ data: { session: null }, error: null });

      const result = await createPractitionerProduct(practitionerId, {
        name: 'Consultation',
        price_amount: 5000,
      });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/session|expired|refresh/i);
      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it('calls edge function with create-product action and returns success', async () => {
      mockInvoke.mockResolvedValueOnce({ data: { product: { id: productId, name: 'Consultation' } }, error: null });

      const result = await createPractitionerProduct(practitionerId, {
        name: 'Consultation',
        description: 'Initial consult',
        price_amount: 5000,
        duration_minutes: 60,
      });

      expect(result.success).toBe(true);
      expect(result.product?.name).toBe('Consultation');
      expect(mockInvoke).toHaveBeenCalledWith(
        'stripe-payment',
        expect.objectContaining({
          body: expect.objectContaining({
            action: 'create-product',
            practitioner_id: practitionerId,
            name: 'Consultation',
            price_amount: 5000,
            duration_minutes: 60,
          }),
          headers: { Authorization: 'Bearer token' },
        })
      );
    });

    it('returns user-friendly error when invoke fails', async () => {
      mockInvoke.mockResolvedValueOnce({ data: null, error: new Error('Network error') });

      const result = await createPractitionerProduct(practitionerId, {
        name: 'Consultation',
        price_amount: 5000,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      expect(result.error).not.toBe('Consultation');
    });
  });

  describe('updatePractitionerProduct', () => {
    it('returns error when session is missing', async () => {
      mockGetSession.mockResolvedValueOnce({ data: { session: null }, error: null });

      const result = await updatePractitionerProduct(productId, { name: 'Updated' });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/session|expired|refresh/i);
    });

    it('calls edge function with update-product action', async () => {
      mockInvoke.mockResolvedValueOnce({ data: { product: { id: productId, name: 'Updated' } }, error: null });

      const result = await updatePractitionerProduct(productId, { name: 'Updated', price_amount: 6000 });

      expect(result.success).toBe(true);
      expect(mockInvoke).toHaveBeenCalledWith(
        'stripe-payment',
        expect.objectContaining({
          body: expect.objectContaining({
            action: 'update-product',
            product_id: productId,
            name: 'Updated',
            price_amount: 6000,
          }),
        })
      );
    });
  });

  describe('deletePractitionerProduct', () => {
    it('returns error when session is missing', async () => {
      mockGetSession.mockResolvedValueOnce({ data: { session: null }, error: null });

      const result = await deletePractitionerProduct(productId);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/session|expired|refresh/i);
    });

    it('calls edge function with delete-product action and returns success', async () => {
      mockInvoke.mockResolvedValueOnce({ data: {}, error: null });

      const result = await deletePractitionerProduct(productId);

      expect(result.success).toBe(true);
      expect(mockInvoke).toHaveBeenCalledWith(
        'stripe-payment',
        expect.objectContaining({
          body: { action: 'delete-product', product_id: productId },
        })
      );
    });
  });

  describe('getPractitionerProducts', () => {
    const mockOrderEq = jest.fn();
    beforeEach(() => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'practitioner_products') {
          return {
            select: mockSelect,
            eq: mockEq,
            order: () => ({ eq: mockOrderEq }),
          };
        }
        return {};
      });
      mockOrderEq.mockResolvedValue({ data: [{ id: productId, name: 'Consultation' }], error: null });
    });

    it('returns products when query succeeds', async () => {
      const result = await getPractitionerProducts(practitionerId);

      expect(result.success).toBe(true);
      expect(result.products).toHaveLength(1);
      expect(result.products?.[0].name).toBe('Consultation');
      expect(mockFrom).toHaveBeenCalledWith('practitioner_products');
      expect(mockEq).toHaveBeenCalledWith('practitioner_id', practitionerId);
    });

    it('filters inactive by default (eq is_active true)', async () => {
      await getPractitionerProducts(practitionerId);
      expect(mockOrderEq).toHaveBeenCalledWith('is_active', true);
    });

    it('returns user-friendly error when query fails', async () => {
      mockOrderEq.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });

      const result = await getPractitionerProducts(practitionerId);

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
expect(String(result.error).length).toBeGreaterThan(0);
    });
  });
});
