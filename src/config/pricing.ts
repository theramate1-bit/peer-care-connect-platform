export type PlanId = 'practitioner' | 'pro' | 'clinic';

export interface PlanPriceIds {
  monthly: string;
  yearly?: string;
}

export interface PractitionerPricingConfig {
  practitioner: PlanPriceIds;
  pro: PlanPriceIds;
  clinic?: PlanPriceIds;
}

// Canonical practitioner pricing map (env-driven with safe fallbacks)
export const PRACTITIONER_PLANS: PractitionerPricingConfig = {
  practitioner: {
    monthly: import.meta.env.VITE_PRICE_PRACTITIONER_MONTHLY || 'price_1SGfP1Fk77knaVvan6m5IRRS',
    yearly: import.meta.env.VITE_PRICE_PRACTITIONER_YEARLY || 'price_1SL6QFFk77knaVvaRMyinzWv',
  },
  pro: {
    monthly: import.meta.env.VITE_PRICE_PRO_MONTHLY || 'price_1SGfPIFk77knaVvaeBxPlhJ9',
    yearly: import.meta.env.VITE_PRICE_PRO_YEARLY || 'price_1SL6QFFk77knaVvarSHwZKou',
  },
  clinic: {
    monthly: import.meta.env.VITE_PRICE_CLINIC_MONTHLY || 'price_1S6BTTFk77knaVvadG0HDJAI',
    yearly: import.meta.env.VITE_PRICE_CLINIC_YEARLY || 'price_1S6BTWFk77knaVvagCKZZh3H',
  },
};


