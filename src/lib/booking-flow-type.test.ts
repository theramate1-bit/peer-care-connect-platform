/**
 * Unit tests for booking flow type helpers (canBookClinic, canRequestMobile, defaultBookingFlowType).
 * Ensures mobile/hybrid practitioner booking flows are determined correctly.
 */

import {
  canBookClinic,
  canRequestMobile,
  defaultBookingFlowType,
  type PractitionerForBookingFlow,
} from './booking-flow-type';

describe('booking-flow-type', () => {
  const basePractitioner: PractitionerForBookingFlow = {
    therapist_type: 'clinic_based',
    products: [{ is_active: true, service_type: 'clinic' }],
  };

  describe('canBookClinic', () => {
    it('returns true for clinic_based with active clinic product', () => {
      expect(canBookClinic(basePractitioner)).toBe(true);
    });

    it('returns true for hybrid with active clinic product', () => {
      expect(
        canBookClinic({
          ...basePractitioner,
          therapist_type: 'hybrid',
          products: [{ is_active: true, service_type: 'clinic' }],
        })
      ).toBe(true);
    });

    it('returns true for hybrid with active both product', () => {
      expect(
        canBookClinic({
          ...basePractitioner,
          therapist_type: 'hybrid',
          products: [{ is_active: true, service_type: 'both' }],
        })
      ).toBe(true);
    });

    it('returns false for mobile-only therapist_type', () => {
      expect(
        canBookClinic({
          ...basePractitioner,
          therapist_type: 'mobile',
          products: [{ is_active: true, service_type: 'mobile' }],
        })
      ).toBe(false);
    });

    it('normalizes clinic_based + mobile-only product to clinic (legacy/misaligned)', () => {
      // getEffectiveProductServiceType treats mobile→clinic for clinic_based, so clinic booking is offered
      expect(
        canBookClinic({
          ...basePractitioner,
          therapist_type: 'clinic_based',
          products: [{ is_active: true, service_type: 'mobile' }],
        })
      ).toBe(true);
    });

    it('returns false when therapist_type is null/undefined', () => {
      expect(canBookClinic({ ...basePractitioner, therapist_type: null })).toBe(false);
      expect(canBookClinic({ ...basePractitioner, therapist_type: undefined })).toBe(false);
    });

    it('returns false when products is empty', () => {
      expect(canBookClinic({ ...basePractitioner, products: [] })).toBe(false);
    });
  });

  describe('canRequestMobile', () => {
    const mobilePractitioner: PractitionerForBookingFlow = {
      therapist_type: 'mobile',
      mobile_service_radius_km: 25,
      base_latitude: 51.5,
      base_longitude: -0.1,
      products: [{ is_active: true, service_type: 'mobile' }],
    };

    it('returns true for mobile with radius and coords', () => {
      expect(canRequestMobile(mobilePractitioner)).toBe(true);
    });

    it('returns true for hybrid with mobile product and radius/coords', () => {
      expect(
        canRequestMobile({
          ...mobilePractitioner,
          therapist_type: 'hybrid',
          products: [{ is_active: true, service_type: 'both' }],
        })
      ).toBe(true);
    });

    it('returns false when mobile_service_radius_km is missing', () => {
      expect(
        canRequestMobile({
          ...mobilePractitioner,
          mobile_service_radius_km: undefined,
        })
      ).toBe(false);
    });

    it('returns false when base_latitude/longitude are missing', () => {
      expect(
        canRequestMobile({
          ...mobilePractitioner,
          base_latitude: null,
          base_longitude: null,
        })
      ).toBe(false);
    });

    it('returns false for clinic_based only', () => {
      expect(
        canRequestMobile({
          ...basePractitioner,
          mobile_service_radius_km: 25,
          base_latitude: 51.5,
          base_longitude: -0.1,
        })
      ).toBe(false);
    });

    it('normalizes mobile + clinic-only product to mobile (legacy/misaligned)', () => {
      // getEffectiveProductServiceType treats clinic→mobile for mobile practitioner, so mobile is offered
      expect(
        canRequestMobile({
          ...mobilePractitioner,
          products: [{ is_active: true, service_type: 'clinic' }],
        })
      ).toBe(true);
    });
  });

  describe('defaultBookingFlowType', () => {
    it('returns clinic when only clinic is available', () => {
      expect(defaultBookingFlowType(basePractitioner)).toBe('clinic');
    });

    it('returns mobile when only mobile is available', () => {
      expect(
        defaultBookingFlowType({
          therapist_type: 'mobile',
          mobile_service_radius_km: 25,
          base_latitude: 51.5,
          base_longitude: -0.1,
          products: [{ is_active: true, service_type: 'mobile' }],
        })
      ).toBe('mobile');
    });

    it('returns clinic when both are available (hybrid default)', () => {
      expect(
        defaultBookingFlowType({
          therapist_type: 'hybrid',
          mobile_service_radius_km: 25,
          base_latitude: 51.5,
          base_longitude: -0.1,
          products: [
            { is_active: true, service_type: 'clinic' },
            { is_active: true, service_type: 'mobile' },
          ],
        })
      ).toBe('clinic');
    });

    it('returns clinic when neither is available (fallback)', () => {
      expect(
        defaultBookingFlowType({
          therapist_type: null,
          products: [],
        })
      ).toBe('clinic');
    });
  });
});
