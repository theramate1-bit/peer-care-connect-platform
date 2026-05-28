/**
 * Dynamic Pricing Service for TheraMate
 * Handles practitioner-specific pricing and Stripe integration
 */

import { supabase } from '@/integrations/supabase/client';
import { 
  PractitionerPricing, 
  SessionPricing, 
  BookingPricing,
  PricingSearchFilters,
  PricingAnalytics,
  PricingUtils,
  StripePriceData,
  STRIPE_PRODUCT_IDS
} from '@/types/pricing';

export class PricingService {
  /**
   * Get practitioner pricing information
   */
  static async getPractitionerPricing(practitionerId: string): Promise<PractitionerPricing | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', practitionerId)
        .single();

      if (error) throw error;
      return data as PractitionerPricing;
    } catch (error) {
      console.error('Error fetching practitioner pricing:', error);
      return null;
    }
  }

  /**
   * Update practitioner pricing
   */
  static async updatePractitionerPricing(
    practitionerId: string, 
    pricing: Partial<PractitionerPricing>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          ...pricing,
          pricing_updated_at: new Date().toISOString()
        })
        .eq('id', practitionerId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating practitioner pricing:', error);
      return false;
    }
  }

  /**
   * Search practitioners by price range
   */
  static async searchPractitionersByPrice(
    filters: PricingSearchFilters
  ): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .rpc('search_practitioners_by_price', {
          min_price: filters.min_price || 0,
          max_price: filters.max_price || 1000,
          session_type: filters.session_type || '60min'
        });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching practitioners by price:', error);
      return [];
    }
  }

  /**
   * Get pricing analytics
   */
  static async getPricingAnalytics(): Promise<PricingAnalytics[]> {
    try {
      const { data, error } = await supabase
        .from('pricing_analytics')
        .select('*');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching pricing analytics:', error);
      return [];
    }
  }

  /**
   * Create dynamic Stripe price for therapy session
   */
  static async createSessionPrice(
    practitionerId: string,
    sessionType: keyof SessionPricing
  ): Promise<string | null> {
    try {
      // Get practitioner pricing
      const pricing = await this.getPractitionerPricing(practitionerId);
      if (!pricing) throw new Error('Practitioner pricing not found');

      const sessionPrice = pricing.session_pricing[sessionType];
      if (!sessionPrice) throw new Error(`Session type ${sessionType} not available`);

      // Convert to pence for Stripe
      const priceInPence = PricingUtils.poundsToPence(sessionPrice);

      // Create Stripe price (this would typically be done via your backend API)
      const priceData: StripePriceData = {
        product_id: STRIPE_PRODUCT_IDS.therapy_session,
        unit_amount: priceInPence,
        currency: 'gbp',
        metadata: {
          practitioner_id: practitionerId,
          session_type: sessionType,
          duration: this.getSessionDuration(sessionType)
        }
      };

      // REAL IMPLEMENTATION: Create actual Stripe price
      const response = await fetch('/api/stripe/create-price', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          practitioner_id: practitionerId,
          product_type: productType,
          amount: priceAmount,
          currency: currency,
          session_duration_minutes: sessionDurationMinutes,
          description: `${productType} session - ${sessionDurationMinutes} minutes`
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create Stripe price');
      }

      const data = await response.json();
      return data.price_id;
    } catch (error) {
      console.error('Error creating session price:', error);
      return null;
    }
  }

  /**
   * Calculate booking pricing
   */
  static calculateBookingPricing(
    practitionerRate: number, // in pence
    platformFeePercentage: number = 10
  ): BookingPricing {
    const platformFee = PricingUtils.calculatePlatformFee(practitionerRate, platformFeePercentage);
    const totalAmount = PricingUtils.calculateTotalAmount(practitionerRate, platformFee);

    return {
      stripe_price_id: '', // Will be set when creating Stripe price
      session_price: practitionerRate,
      pricing_metadata: {
        practitioner_id: '',
        session_type: '',
        duration: 0,
        practitioner_rate: practitionerRate,
        platform_fee: platformFee
      },
      practitioner_rate: practitionerRate,
      platform_fee: platformFee,
      total_amount: totalAmount
    };
  }

  /**
   * Get session duration in minutes
   */
  private static getSessionDuration(sessionType: keyof SessionPricing): number {
    const durations = {
      '30min': 30,
      '45min': 45,
      '60min': 60,
      '90min': 90
    };
    return durations[sessionType] || 60;
  }

  /**
   * Validate practitioner pricing
   */
  static validatePricing(pricing: Partial<PractitionerPricing>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (pricing.hourly_rate && pricing.hourly_rate <= 0) {
      errors.push('Hourly rate must be positive');
    }

    if (pricing.session_pricing) {
      if (!PricingUtils.validateSessionPricing(pricing.session_pricing)) {
        errors.push('Session pricing must include 30min and 60min rates');
      }

      Object.entries(pricing.session_pricing).forEach(([type, price]) => {
        if (price <= 0) {
          errors.push(`${type} session price must be positive`);
        }
      });
    }

    if (pricing.discount_percentage && (pricing.discount_percentage < 0 || pricing.discount_percentage > 100)) {
      errors.push('Discount percentage must be between 0 and 100');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get price recommendations for new practitioners
   */
  static async getPriceRecommendations(role: string): Promise<SessionPricing> {
    try {
      const analytics = await this.getPricingAnalytics();
      const roleAnalytics = analytics.find(a => a.user_role === role);

      if (!roleAnalytics) {
        // Return default pricing if no analytics available
        return {
          '30min': 40,
          '45min': 55,
          '60min': 70,
          '90min': 100
        };
      }

      // Calculate recommended pricing based on analytics
      const baseRate = roleAnalytics.avg_60min_rate;
      return {
        '30min': Math.round(baseRate * 0.6),
        '45min': Math.round(baseRate * 0.8),
        '60min': baseRate,
        '90min': Math.round(baseRate * 1.4)
      };
    } catch (error) {
      console.error('Error getting price recommendations:', error);
      return {
        '30min': 40,
        '45min': 55,
        '60min': 70,
        '90min': 100
      };
    }
  }

  /**
   * Apply discount to session pricing
   */
  static applyDiscountToPricing(
    pricing: SessionPricing,
    discountPercentage: number
  ): SessionPricing {
    const discountedPricing: SessionPricing = {} as SessionPricing;

    Object.entries(pricing).forEach(([sessionType, price]) => {
      discountedPricing[sessionType] = PricingUtils.applyDiscount(price, discountPercentage);
    });

    return discountedPricing;
  }

  /**
   * Get pricing summary for practitioner
   */
  static getPricingSummary(pricing: PractitionerPricing) {
    const sessionTypes = Object.keys(pricing.session_pricing) as Array<keyof SessionPricing>;
    const prices = Object.values(pricing.session_pricing);
    
    return {
      hourly_rate: pricing.hourly_rate,
      min_session_price: Math.min(...prices),
      max_session_price: Math.max(...prices),
      avg_session_price: Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length),
      available_sessions: sessionTypes,
      discount_available: pricing.discount_available,
      discount_percentage: pricing.discount_percentage,
      accepts_insurance: pricing.accepts_insurance
    };
  }
}

export default PricingService;
