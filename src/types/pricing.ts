/**
 * Dynamic Pricing Types for TheraMate
 * Supports practitioner-specific pricing and flexible session rates
 */

export interface SessionPricing {
  '30min': number;
  '45min': number;
  '60min': number;
  '90min': number;
  [key: string]: number; // Allow custom session types
}

export interface PractitionerPricing {
  user_id: string;
  hourly_rate: number; // in pounds
  session_pricing: SessionPricing; // in pounds
  pricing_updated_at: string;
  pricing_notes?: string;
  accepts_insurance: boolean;
  insurance_providers: string[];
  discount_available: boolean;
  discount_percentage: number;
  minimum_session_duration: number; // in minutes
}

export interface BookingPricing {
  stripe_price_id: string;
  session_price: number; // in pence for Stripe
  pricing_metadata: {
    practitioner_id: string;
    session_type: string;
    duration: number;
    practitioner_rate: number; // in pence
    platform_fee: number; // in pence
    discount_applied?: number; // in pence
  };
  practitioner_rate: number; // in pence
  platform_fee: number; // in pence
  total_amount: number; // in pence
}

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number; // in pence
  discount_percentage: number;
  description: string;
  stripe_price_id?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  monthly_price: number; // in pence
  credits_included: number;
  features: string[];
  stripe_price_id?: string;
}

export interface PricingSearchFilters {
  min_price?: number;
  max_price?: number;
  session_type?: keyof SessionPricing;
  specialties?: string[];
  accepts_insurance?: boolean;
  discount_available?: boolean;
}

export interface PricingAnalytics {
  user_role: string;
  practitioner_count: number;
  avg_hourly_rate: number;
  min_hourly_rate: number;
  max_hourly_rate: number;
  avg_60min_rate: number;
  avg_30min_rate: number;
}

// Default pricing templates for different practitioner types
export const DEFAULT_PRICING_TEMPLATES: Record<string, Partial<PractitionerPricing>> = {
  sports_therapist: {
    hourly_rate: 75,
    session_pricing: {
      '30min': 40,
      '45min': 55,
      '60min': 70,
      '90min': 100
    },
    minimum_session_duration: 30,
    accepts_insurance: false,
    insurance_providers: [],
    discount_available: true,
    discount_percentage: 10
  },
  massage_therapist: {
    hourly_rate: 65,
    session_pricing: {
      '30min': 35,
      '45min': 50,
      '60min': 65,
      '90min': 90
    },
    minimum_session_duration: 30,
    accepts_insurance: false,
    insurance_providers: [],
    discount_available: true,
    discount_percentage: 15
  },
  osteopath: {
    hourly_rate: 85,
    session_pricing: {
      '30min': 45,
      '45min': 60,
      '60min': 80,
      '90min': 110
    },
    minimum_session_duration: 45,
    accepts_insurance: true,
    insurance_providers: ['BUPA', 'AXA', 'Vitality'],
    discount_available: false,
    discount_percentage: 0
  }
};

// Credit packages configuration
export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'starter',
    name: 'Starter Package',
    credits: 20,
    price: 2000, // £20
    discount_percentage: 0,
    description: 'Perfect for trying out TheraMate'
  },
  {
    id: 'professional',
    name: 'Professional Package',
    credits: 60,
    price: 5000, // £50
    discount_percentage: 17,
    description: 'Great value for regular users'
  },
  {
    id: 'premium',
    name: 'Premium Package',
    credits: 150,
    price: 10000, // £100
    discount_percentage: 33,
    description: 'Maximum value for frequent users'
  }
];

// Subscription plans configuration
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'basic',
    name: 'Basic Plan',
    monthly_price: 1999, // £19.99
    credits_included: 2,
    features: [
      'Basic platform access',
      '2 credits per month',
      'Standard support',
      'Basic analytics'
    ]
  },
  {
    id: 'pro',
    name: 'Pro Plan',
    monthly_price: 4999, // £49.99
    credits_included: 6,
    features: [
      'Full platform access',
      '6 credits per month',
      'Priority support',
      'Advanced analytics',
      'Premium features',
      'Priority booking'
    ]
  }
];

// Utility functions for pricing
export class PricingUtils {
  /**
   * Convert pounds to pence for Stripe
   */
  static poundsToPence(pounds: number): number {
    return Math.round(pounds * 100);
  }

  /**
   * Convert pence to pounds for display
   */
  static penceToPounds(pence: number): number {
    return pence / 100;
  }

  /**
   * Calculate platform fee (e.g., 10% of practitioner rate)
   */
  static calculatePlatformFee(practitionerRate: number, feePercentage: number = 10): number {
    return Math.round(practitionerRate * (feePercentage / 100));
  }

  /**
   * Calculate total amount including platform fee
   */
  static calculateTotalAmount(practitionerRate: number, platformFee: number): number {
    return practitionerRate + platformFee;
  }

  /**
   * Apply discount to a price
   */
  static applyDiscount(price: number, discountPercentage: number): number {
    return Math.round(price * (1 - discountPercentage / 100));
  }

  /**
   * Validate session pricing structure
   */
  static validateSessionPricing(pricing: SessionPricing): boolean {
    const requiredTypes = ['30min', '60min'];
    return requiredTypes.every(type => 
      pricing[type] && pricing[type] > 0
    );
  }

  /**
   * Get price range for search filters
   */
  static getPriceRange(sessionType: keyof SessionPricing): { min: number; max: number } {
    const ranges = {
      '30min': { min: 20, max: 80 },
      '45min': { min: 30, max: 100 },
      '60min': { min: 40, max: 120 },
      '90min': { min: 60, max: 150 }
    };
    return ranges[sessionType] || { min: 20, max: 150 };
  }

  /**
   * Format price for display
   */
  static formatPrice(pence: number): string {
    const pounds = this.penceToPounds(pence);
    return `£${pounds.toFixed(2)}`;
  }

  /**
   * Format price range for display
   */
  static formatPriceRange(minPence: number, maxPence: number): string {
    const minPounds = this.penceToPounds(minPence);
    const maxPounds = this.penceToPounds(maxPence);
    return `£${minPounds.toFixed(0)} - £${maxPounds.toFixed(0)}`;
  }
}

// Stripe integration types
export interface StripePriceData {
  product_id: string;
  unit_amount: number; // in pence
  currency: string;
  metadata: {
    practitioner_id?: string;
    session_type?: string;
    duration?: number;
    package_type?: string;
    credits?: number;
  };
}

export interface StripeProductConfig {
  therapy_session: string; // Generic therapy session product ID
  credit_purchase: string; // Generic credit purchase product ID
  platform_subscription: string; // Generic subscription product ID
}

// Default Stripe product IDs (update these with your actual IDs)
export const STRIPE_PRODUCT_IDS: StripeProductConfig = {
  therapy_session: 'prod_T1WKbCqmcG7PRH',
  credit_purchase: 'prod_T1WKy8OZKahDsB',
  platform_subscription: 'prod_T1WKPiGf2RJNoe'
};
