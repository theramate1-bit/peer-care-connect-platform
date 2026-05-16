// Payment Configuration - Synchronized with Stripe / Supabase live RPCs
// Marketplace (online card) platform fee: 1.95% of gross + 20p — see `calculateMarketplaceFee`

export interface PaymentProduct {
  id: string;
  name: string;
  description: string;
  type: "subscription" | "marketplace";
  category?:
    | "platform"
    | "sports_therapy"
    | "massage_therapy"
    | "osteopath"
    | "general";
  prices: PaymentPrice[];
}

export interface PaymentPrice {
  id: string;
  amount: number; // in pence
  currency: string;
  type: "one_time" | "recurring";
  interval?: "month" | "year";
  tier?: "basic" | "standard" | "premium";
  description?: string;
}

export interface MarketplaceFee {
  /** Variable component (1.95% = 0.0195) */
  percent: number;
  /** Fixed component in pence (£0.20) */
  fixedPence: number;
  type: "percentage_plus_fixed";
  applies_to: "all_marketplace";
}

/** Short copy for labels (UK). */
export const MARKETPLACE_FEE_DISPLAY = "1.95% + 20p";

// Marketplace Fee Configuration (online bookings; in-person / pay-at-clinic: no platform fee)
export const MARKETPLACE_FEE: MarketplaceFee = {
  percent: 0.0195,
  fixedPence: 20,
  type: "percentage_plus_fixed",
  applies_to: "all_marketplace",
};

// Platform Subscription Plans
export const PLATFORM_PLANS: PaymentProduct[] = [
  {
    id: "prod_T2FzrvauPGxL7r",
    name: "Starter Plan",
    description:
      "Free plan for clients to book sessions with practitioners. Perfect for getting started on the platform.",
    type: "subscription",
    category: "platform",
    prices: [
      {
        id: "price_1S6BTLFk77knaVvarN1txPHH",
        amount: 0,
        currency: "gbp",
        type: "one_time",
        tier: "basic",
        description: "Free forever",
      },
    ],
  },
  {
    id: "prod_T2Fz5gcRbhcwyQ",
    name: "Practitioner Plan",
    description:
      "Monthly subscription for individual practitioners to offer services on the platform with booking management and client tools.",
    type: "subscription",
    category: "platform",
    prices: [
      {
        id: "price_1S6BTOFk77knaVvaqqm7Iq5M",
        amount: 3000,
        currency: "gbp",
        type: "one_time",
        tier: "standard",
        description: "£30/month",
      },
      {
        id: "price_1S6BTQFk77knaVvakB9spQHa",
        amount: 31320,
        currency: "gbp",
        type: "one_time",
        tier: "standard",
        description: "£26.10/month (yearly)",
      },
    ],
  },
  {
    id: "prod_T2FzB2Nsorl4ym",
    name: "Clinic Plan",
    description:
      "Comprehensive plan for clinics and wellness centers with multiple practitioners, advanced analytics, and team collaboration tools.",
    type: "subscription",
    category: "platform",
    prices: [
      {
        id: "price_1S6BTTFk77knaVvadG0HDJAI",
        amount: 9900,
        currency: "gbp",
        type: "one_time",
        tier: "premium",
        description: "£99/month",
      },
      {
        id: "price_1S6BTWFk77knaVvagCKZZh3H",
        amount: 106920,
        currency: "gbp",
        type: "one_time",
        tier: "premium",
        description: "£89.10/month (yearly)",
      },
    ],
  },
];

// Marketplace Service Products
export const MARKETPLACE_SERVICES: PaymentProduct[] = [
  {
    id: "prod_SuoL41cuFbVs9n",
    name: "General Therapy Session",
    description: "Individual therapy session with a qualified practitioner",
    type: "marketplace",
    category: "general",
    prices: [
      {
        id: "price_1RyyicFk77knaVvabsduGibm",
        amount: 5000,
        currency: "gbp",
        type: "one_time",
        tier: "basic",
        description: "£50 - Basic Session",
      },
      {
        id: "price_1RyyigFk77knaVva9Xcn3lxU",
        amount: 7500,
        currency: "gbp",
        type: "one_time",
        tier: "standard",
        description: "£75 - Standard Session",
      },
      {
        id: "price_1RyyilFk77knaVvasI3rN9Zq",
        amount: 10000,
        currency: "gbp",
        type: "one_time",
        tier: "premium",
        description: "£100 - Premium Session",
      },
    ],
  },
  {
    id: "prod_SupTrJm4RHhhmk",
    name: "Sports Therapy Session",
    description:
      "Specialized sports therapy session focusing on athletic performance, injury prevention, and recovery",
    type: "marketplace",
    category: "sports_therapy",
    prices: [
      {
        id: "price_1RyzoLFk77knaVvafbEFAZZZ",
        amount: 6000,
        currency: "gbp",
        type: "one_time",
        tier: "basic",
        description: "£60 - Basic Sports Therapy",
      },
      {
        id: "price_1RyzoMFk77knaVvaxi5JRwdc",
        amount: 8000,
        currency: "gbp",
        type: "one_time",
        tier: "standard",
        description: "£80 - Standard Sports Therapy",
      },
      {
        id: "price_1RyzoNFk77knaVvawFH5fvzi",
        amount: 12000,
        currency: "gbp",
        type: "one_time",
        tier: "premium",
        description: "£120 - Premium Sports Therapy",
      },
    ],
  },
  {
    id: "prod_SupTDipDgdns1j",
    name: "Massage Therapy Session",
    description:
      "Professional massage therapy session for relaxation, pain relief, and muscle recovery",
    type: "marketplace",
    category: "massage_therapy",
    prices: [
      {
        id: "price_1RyzoRFk77knaVvaLbeeKmEi",
        amount: 5000,
        currency: "gbp",
        type: "one_time",
        tier: "basic",
        description: "£50 - Basic Massage Therapy",
      },
      {
        id: "price_1RyzoSFk77knaVvaegsngVms",
        amount: 7000,
        currency: "gbp",
        type: "one_time",
        tier: "standard",
        description: "£70 - Standard Massage Therapy",
      },
      {
        id: "price_1RyzoTFk77knaVvaVqaWnnyi",
        amount: 10000,
        currency: "gbp",
        type: "one_time",
        tier: "premium",
        description: "£100 - Premium Massage Therapy",
      },
    ],
  },
  {
    id: "prod_SupTVFcpnOTNqI",
    name: "Osteopath Session",
    description:
      "Osteopathic treatment session focusing on holistic health and structural alignment",
    type: "marketplace",
    category: "osteopath",
    prices: [
      {
        id: "price_1RyzoWFk77knaVvaRdHhQxcG",
        amount: 7500,
        currency: "gbp",
        type: "one_time",
        tier: "basic",
        description: "£75 - Basic Osteopath Session",
      },
      {
        id: "price_1RyzoXFk77knaVvaVt4RjThF",
        amount: 9500,
        currency: "gbp",
        type: "one_time",
        tier: "standard",
        description: "£95 - Standard Osteopath Session",
      },
      {
        id: "price_1RyzoYFk77knaVva4lbnXfMq",
        amount: 15000,
        currency: "gbp",
        type: "one_time",
        tier: "premium",
        description: "£150 - Premium Osteopath Session",
      },
    ],
  },
  {
    id: "prod_SuoLThQ3MIm1v3",
    name: "Therapy Project",
    description:
      "Multi-session therapy project with ongoing support and progress tracking",
    type: "marketplace",
    category: "general",
    prices: [
      {
        id: "price_1RyyiqFk77knaVvatUhsnaTj",
        amount: 25000,
        currency: "gbp",
        type: "one_time",
        tier: "premium",
        description: "£250 - Comprehensive Therapy Project",
      },
    ],
  },
];

// All products combined
export const ALL_PRODUCTS = [...PLATFORM_PLANS, ...MARKETPLACE_SERVICES];

// Helper functions
export const getProductById = (id: string): PaymentProduct | undefined => {
  return ALL_PRODUCTS.find((product) => product.id === id);
};

export const getPriceById = (
  id: string,
): { product: PaymentProduct; price: PaymentPrice } | undefined => {
  for (const product of ALL_PRODUCTS) {
    const price = product.prices.find((p) => p.id === id);
    if (price) {
      return { product, price };
    }
  }
  return undefined;
};

export const getProductsByCategory = (category: string): PaymentProduct[] => {
  return ALL_PRODUCTS.filter((product) => product.category === category);
};

export const getMarketplaceProducts = (): PaymentProduct[] => {
  return ALL_PRODUCTS.filter((product) => product.type === "marketplace");
};

export const getPlatformProducts = (): PaymentProduct[] => {
  return ALL_PRODUCTS.filter((product) => product.type === "subscription");
};

/** `amount` = gross in pence (same units as Stripe amounts). */
export const calculateMarketplaceFee = (amountPence: number): number => {
  return (
    Math.round(amountPence * MARKETPLACE_FEE.percent) +
    MARKETPLACE_FEE.fixedPence
  );
};

// Calculate practitioner payout (amount - marketplace fee)
export const calculatePractitionerPayout = (amount: number): number => {
  const fee = calculateMarketplaceFee(amount);
  return amount - fee;
};

// Format currency
export const formatCurrency = (
  amount: number,
  currency: string = "gbp",
): string => {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
};

// Get therapist type products
export const getTherapistTypeProducts = (
  therapistType: "sports_therapist" | "massage_therapist" | "osteopath",
): PaymentProduct[] => {
  const categoryMap = {
    sports_therapist: "sports_therapy",
    massage_therapist: "massage_therapy",
    osteopath: "osteopath",
  };

  const category = categoryMap[therapistType];
  return getProductsByCategory(category);
};

// Payment calculation utilities
export interface PaymentBreakdown {
  subtotal: number;
  marketplaceFee: number;
  practitionerPayout: number;
  total: number;
}

export const calculatePaymentBreakdown = (amount: number): PaymentBreakdown => {
  const marketplaceFee = calculateMarketplaceFee(amount);
  const practitionerPayout = calculatePractitionerPayout(amount);

  return {
    subtotal: amount,
    marketplaceFee,
    practitionerPayout,
    total: amount,
  };
};

export default {
  MARKETPLACE_FEE,
  MARKETPLACE_FEE_DISPLAY,
  PLATFORM_PLANS,
  MARKETPLACE_SERVICES,
  ALL_PRODUCTS,
  getProductById,
  getPriceById,
  getProductsByCategory,
  getMarketplaceProducts,
  getPlatformProducts,
  calculateMarketplaceFee,
  calculatePractitionerPayout,
  formatCurrency,
  getTherapistTypeProducts,
  calculatePaymentBreakdown,
};
