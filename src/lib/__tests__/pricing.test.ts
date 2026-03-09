/**
 * Unit tests for pricing utilities
 */

import {
  calculateServicePricing,
  poundsToPence,
  penceToPounds,
  formatPrice,
  validateServicePricing,
  calculateBookingPricing,
  getServiceTypeDisplayName,
  getServiceTypeDescription,
  calculatePlatformRevenue,
  calculatePractitionerEarnings,
  generatePricingSummary,
} from '../../utils/pricing';

describe('pricing utilities', () => {
  describe('calculateServicePricing', () => {
    it('should calculate pricing breakdown correctly', () => {
      const result = calculateServicePricing(7000, 4);

      expect(result.basePricePence).toBe(7000);
      expect(result.platformFeePercentage).toBe(4);
      expect(result.platformFeePence).toBe(280); // 4% of 7000
      expect(result.practitionerEarningsPence).toBe(6720); // 7000 - 280
      expect(result.totalPricePence).toBe(7000);
    });

    it('should use default platform fee percentage of 4%', () => {
      const result = calculateServicePricing(10000);

      expect(result.platformFeePercentage).toBe(4);
      expect(result.platformFeePence).toBe(400);
    });

    it('should round platform fee correctly', () => {
      const result = calculateServicePricing(1000, 1.5);

      expect(result.platformFeePence).toBe(15); // 1.5% of 1000 = 15
    });
  });

  describe('poundsToPence', () => {
    it('should convert pounds to pence correctly', () => {
      expect(poundsToPence(70.0)).toBe(7000);
      expect(poundsToPence(100.5)).toBe(10050);
      expect(poundsToPence(0.5)).toBe(50);
    });

    it('should round to nearest pence', () => {
      expect(poundsToPence(70.999)).toBe(7100);
    });
  });

  describe('penceToPounds', () => {
    it('should convert pence to pounds correctly', () => {
      expect(penceToPounds(7000)).toBe(70);
      expect(penceToPounds(10050)).toBe(100.5);
      expect(penceToPounds(50)).toBe(0.5);
    });
  });

  describe('formatPrice', () => {
    it('should format price in GBP correctly', () => {
      expect(formatPrice(7000)).toBe('£70.00');
      expect(formatPrice(10050)).toBe('£100.50');
      expect(formatPrice(0)).toBe('£0.00');
    });

    it('should format price with custom currency', () => {
      // Currency formatting can vary by locale, so we check it contains the currency symbol
      const formatted = formatPrice(7000, 'USD');
      expect(formatted).toContain('70.00');
      expect(formatted).toMatch(/\$|US\$/); // Accepts $ or US$
    });
  });

  describe('validateServicePricing', () => {
    it('should validate correct service data', () => {
      const serviceData = {
        serviceName: 'Sports Therapy',
        serviceType: 'sports_therapy' as const,
        durationMinutes: 60,
        basePricePence: 7000,
      };

      const errors = validateServicePricing(serviceData);

      expect(errors).toHaveLength(0);
    });

    it('should return error if service name is missing', () => {
      const serviceData = {
        serviceName: '',
        serviceType: 'sports_therapy' as const,
        durationMinutes: 60,
        basePricePence: 7000,
      };

      const errors = validateServicePricing(serviceData);

      expect(errors).toContain('Service name is required');
    });

    it('should return error if service type is missing', () => {
      const serviceData = {
        serviceName: 'Sports Therapy',
        serviceType: '' as any,
        durationMinutes: 60,
        basePricePence: 7000,
      };

      const errors = validateServicePricing(serviceData);

      expect(errors).toContain('Service type is required');
    });

    it('should return error if duration is invalid', () => {
      const serviceData = {
        serviceName: 'Sports Therapy',
        serviceType: 'sports_therapy' as const,
        durationMinutes: 0,
        basePricePence: 7000,
      };

      const errors = validateServicePricing(serviceData);

      expect(errors).toContain('Duration must be greater than 0 minutes');
    });

    it('should return error if price is below minimum', () => {
      const serviceData = {
        serviceName: 'Sports Therapy',
        serviceType: 'sports_therapy' as const,
        durationMinutes: 60,
        basePricePence: 500, // Below £10 minimum
      };

      const errors = validateServicePricing(serviceData);

      expect(errors).toContain('Minimum price is £10.00');
    });

    it('should return error if price is above maximum', () => {
      const serviceData = {
        serviceName: 'Sports Therapy',
        serviceType: 'sports_therapy' as const,
        durationMinutes: 60,
        basePricePence: 60000, // Above £500 maximum
      };

      const errors = validateServicePricing(serviceData);

      expect(errors).toContain('Maximum price is £500.00');
    });
  });

  describe('calculateBookingPricing', () => {
    it('should calculate booking pricing correctly', () => {
      const sessionDate = new Date('2024-12-25T10:00:00Z');
      const result = calculateBookingPricing(
        'service-123',
        'client-123',
        'practitioner-123',
        sessionDate,
        60,
        7000,
        4
      );

      expect(result.serviceId).toBe('service-123');
      expect(result.clientId).toBe('client-123');
      expect(result.practitionerId).toBe('practitioner-123');
      expect(result.sessionDate).toBe(sessionDate);
      expect(result.sessionDurationMinutes).toBe(60);
      expect(result.totalPricePence).toBe(7000);
      expect(result.platformFeePence).toBe(280);
      expect(result.practitionerEarningsPence).toBe(6720);
    });
  });

  describe('getServiceTypeDisplayName', () => {
    it('should return correct display names', () => {
      expect(getServiceTypeDisplayName('sports_therapy')).toBe('Sports Therapy');
      expect(getServiceTypeDisplayName('massage_therapy')).toBe('Massage Therapy');
      expect(getServiceTypeDisplayName('osteopathy')).toBe('Osteopathy');
    });

    it('should return original value for unknown types', () => {
      expect(getServiceTypeDisplayName('unknown_type')).toBe('unknown_type');
    });
  });

  describe('getServiceTypeDescription', () => {
    it('should return correct descriptions', () => {
      expect(getServiceTypeDescription('sports_therapy')).toContain('sports injuries');
      expect(getServiceTypeDescription('massage_therapy')).toContain('massage');
      expect(getServiceTypeDescription('osteopathy')).toContain('musculoskeletal');
    });

    it('should return empty string for unknown types', () => {
      expect(getServiceTypeDescription('unknown_type')).toBe('');
    });
  });

  describe('calculatePlatformRevenue', () => {
    it('should calculate total platform revenue', () => {
      const bookings = [
        {
          serviceId: 'service-1',
          clientId: 'client-1',
          practitionerId: 'practitioner-1',
          sessionDate: new Date(),
          sessionDurationMinutes: 60,
          totalPricePence: 7000,
          platformFeePence: 280,
          practitionerEarningsPence: 6720,
        },
        {
          serviceId: 'service-2',
          clientId: 'client-2',
          practitionerId: 'practitioner-2',
          sessionDate: new Date(),
          sessionDurationMinutes: 60,
          totalPricePence: 5000,
          platformFeePence: 200,
          practitionerEarningsPence: 4800,
        },
      ];

      const revenue = calculatePlatformRevenue(bookings);

      expect(revenue).toBe(480); // 280 + 200
    });
  });

  describe('calculatePractitionerEarnings', () => {
    it('should calculate earnings for specific practitioner', () => {
      const bookings = [
        {
          serviceId: 'service-1',
          clientId: 'client-1',
          practitionerId: 'practitioner-1',
          sessionDate: new Date(),
          sessionDurationMinutes: 60,
          totalPricePence: 7000,
          platformFeePence: 280,
          practitionerEarningsPence: 6720,
        },
        {
          serviceId: 'service-2',
          clientId: 'client-2',
          practitionerId: 'practitioner-2',
          sessionDate: new Date(),
          sessionDurationMinutes: 60,
          totalPricePence: 5000,
          platformFeePence: 200,
          practitionerEarningsPence: 4800,
        },
        {
          serviceId: 'service-3',
          clientId: 'client-3',
          practitionerId: 'practitioner-1',
          sessionDate: new Date(),
          sessionDurationMinutes: 60,
          totalPricePence: 3000,
          platformFeePence: 120,
          practitionerEarningsPence: 2880,
        },
      ];

      const earnings = calculatePractitionerEarnings(bookings, 'practitioner-1');

      expect(earnings).toBe(9600); // 6720 + 2880
    });
  });

  describe('generatePricingSummary', () => {
    it('should generate pricing summary correctly', () => {
      const pricing = {
        basePricePence: 7000,
        platformFeePercentage: 4,
        platformFeePence: 280,
        practitionerEarningsPence: 6720,
        totalPricePence: 7000,
      };

      const summary = generatePricingSummary(pricing);

      expect(summary.basePrice).toBe('£70.00');
      expect(summary.platformFee).toBe('£2.80');
      expect(summary.practitionerEarnings).toBe('£67.20');
      expect(summary.platformFeePercentage).toBe('4%');
    });
  });
});

