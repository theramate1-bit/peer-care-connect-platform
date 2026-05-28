/**
 * Pricing utilities for TheraMate marketplace
 * Handles custom practitioner pricing with platform fees
 */

export interface ServicePricing {
  basePricePence: number;
  platformFeePercentage: number;
  platformFeePence: number;
  practitionerEarningsPence: number;
  totalPricePence: number;
}

export interface ServiceData {
  serviceName: string;
  serviceType: 'sports_therapy' | 'massage_therapy' | 'osteopathy';
  durationMinutes: number;
  basePricePence: number;
  description?: string;
}

export interface BookingPricing {
  serviceId: string;
  clientId: string;
  practitionerId: string;
  sessionDate: Date;
  sessionDurationMinutes: number;
  totalPricePence: number;
  platformFeePence: number;
  practitionerEarningsPence: number;
}

/**
 * Calculate pricing breakdown for a service
 */
export function calculateServicePricing(
  basePricePence: number,
  platformFeePercentage: number = 4
): ServicePricing {
  const platformFeePence = Math.round(basePricePence * (platformFeePercentage / 100));
  const practitionerEarningsPence = basePricePence - platformFeePence;
  
  return {
    basePricePence,
    platformFeePercentage,
    platformFeePence,
    practitionerEarningsPence,
    totalPricePence: basePricePence
  };
}

/**
 * Convert pounds to pence
 */
export function poundsToPence(pounds: number): number {
  return Math.round(pounds * 100);
}

/**
 * Convert pence to pounds
 */
export function penceToPounds(pence: number): number {
  return pence / 100;
}

/**
 * Format price for display
 */
export function formatPrice(pence: number, currency: string = 'GBP'): string {
  const pounds = penceToPounds(pence);
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(pounds);
}

/**
 * Validate service pricing
 */
export function validateServicePricing(serviceData: ServiceData): string[] {
  const errors: string[] = [];
  
  if (!serviceData.serviceName || serviceData.serviceName.trim().length === 0) {
    errors.push('Service name is required');
  }
  
  if (!serviceData.serviceType) {
    errors.push('Service type is required');
  }
  
  if (!serviceData.durationMinutes || serviceData.durationMinutes <= 0) {
    errors.push('Duration must be greater than 0 minutes');
  }
  
  if (!serviceData.basePricePence || serviceData.basePricePence <= 0) {
    errors.push('Base price must be greater than 0');
  }
  
  // Validate minimum pricing (e.g., minimum £10)
  if (serviceData.basePricePence < 1000) {
    errors.push('Minimum price is £10.00');
  }
  
  // Validate maximum pricing (e.g., maximum £500)
  if (serviceData.basePricePence > 50000) {
    errors.push('Maximum price is £500.00');
  }
  
  return errors;
}

/**
 * Calculate booking pricing
 */
export function calculateBookingPricing(
  serviceId: string,
  clientId: string,
  practitionerId: string,
  sessionDate: Date,
  sessionDurationMinutes: number,
  basePricePence: number,
  platformFeePercentage: number = 4
): BookingPricing {
  const pricing = calculateServicePricing(basePricePence, platformFeePercentage);
  
  return {
    serviceId,
    clientId,
    practitionerId,
    sessionDate,
    sessionDurationMinutes,
    totalPricePence: pricing.totalPricePence,
    platformFeePence: pricing.platformFeePence,
    practitionerEarningsPence: pricing.practitionerEarningsPence
  };
}

/**
 * Get service type display name
 */
export function getServiceTypeDisplayName(serviceType: string): string {
  const displayNames: Record<string, string> = {
    'sports_therapy': 'Sports Therapy',
    'massage_therapy': 'Massage Therapy',
    'osteopathy': 'Osteopathy'
  };
  
  return displayNames[serviceType] || serviceType;
}

/**
 * Get service type description
 */
export function getServiceTypeDescription(serviceType: string): string {
  const descriptions: Record<string, string> = {
    'sports_therapy': 'Specialized therapy for sports injuries and performance enhancement',
    'massage_therapy': 'Various massage techniques for relaxation and therapeutic benefits',
    'osteopathy': 'Manual therapy focusing on musculoskeletal system'
  };
  
  return descriptions[serviceType] || '';
}

/**
 * Calculate platform revenue for a period
 */
export function calculatePlatformRevenue(bookings: BookingPricing[]): number {
  return bookings.reduce((total, booking) => total + booking.platformFeePence, 0);
}

/**
 * Calculate practitioner earnings for a period
 */
export function calculatePractitionerEarnings(bookings: BookingPricing[], practitionerId: string): number {
  return bookings
    .filter(booking => booking.practitionerId === practitionerId)
    .reduce((total, booking) => total + booking.practitionerEarningsPence, 0);
}

/**
 * Generate pricing summary for display
 */
export function generatePricingSummary(pricing: ServicePricing) {
  return {
    basePrice: formatPrice(pricing.basePricePence),
    platformFee: formatPrice(pricing.platformFeePence),
    practitionerEarnings: formatPrice(pricing.practitionerEarningsPence),
    platformFeePercentage: `${pricing.platformFeePercentage}%`
  };
}
