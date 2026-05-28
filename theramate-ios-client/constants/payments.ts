/**
 * Session + platform fee display (parity with repo-root `src/config/payments.ts`).
 */

export type PaymentPrice = {
  id: string;
  amount: number;
  currency: string;
  type: "one_time" | "recurring";
  interval?: "month" | "year";
  tier?: string;
  description?: string;
};

export type PaymentProduct = {
  id: string;
  name: string;
  description: string;
  type: "subscription" | "marketplace";
  prices: PaymentPrice[];
};

export const MARKETPLACE_FEE_DISPLAY = "1.95% + 20p";

/** Platform subscription products shown on Pricing (excludes free Starter card on web). */
export const PLATFORM_PLANS: PaymentProduct[] = [
  {
    id: "prod_T2Fz5gcRbhcwyQ",
    name: "Practitioner Plan",
    description:
      "Monthly subscription for individual practitioners — booking management and client tools.",
    type: "subscription",
    prices: [
      {
        id: "price_1S6BTOFk77knaVvaqqm7Iq5M",
        amount: 3000,
        currency: "gbp",
        type: "one_time",
        description: "£30/month",
      },
      {
        id: "price_1S6BTQFk77knaVvakB9spQHa",
        amount: 31320,
        currency: "gbp",
        type: "one_time",
        description: "£26.10/month (yearly)",
      },
    ],
  },
  {
    id: "prod_T2FzB2Nsorl4ym",
    name: "Clinic Plan",
    description:
      "For clinics and wellness centres — multiple practitioners, analytics, and team tools.",
    type: "subscription",
    prices: [
      {
        id: "price_1S6BTTFk77knaVvadG0HDJAI",
        amount: 9900,
        currency: "gbp",
        type: "one_time",
        description: "£99/month",
      },
      {
        id: "price_1S6BTWFk77knaVvagCKZZh3H",
        amount: 106920,
        currency: "gbp",
        type: "one_time",
        description: "£89.10/month (yearly)",
      },
    ],
  },
];

export function formatCurrency(amountPence: number, currency = "gbp"): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountPence / 100);
}
