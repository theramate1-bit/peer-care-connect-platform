/**
 * Canonical display numbers for marketing (subscription amounts match Stripe checkout in app;
 * booking fee % aligns with MARKETPLACE_PRICING.md).
 */

const env = import.meta.env;

/** Platform fee component — see MARKETPLACE_PRICING.md */
export const marketplaceFeePercentDisplay =
  (env.VITE_MARKETPLACE_FEE_PERCENT as string | undefined)?.trim() || "1.95";

/** Flat platform component on each paid booking. */
export const marketplaceFeeFlatPenceDisplay =
  (env.VITE_MARKETPLACE_FEE_FLAT_PENCE as string | undefined)?.trim() || "20";

export const smsOutboundUnitPricePenceDisplay =
  (env.VITE_SMS_OUTBOUND_PENCE as string | undefined)?.trim() || "6";

export const annualDiscountPercent = 10;

export type PlanId = "practitioner" | "pro";

export interface PractitionerPlanDef {
  id: PlanId;
  name: string;
  monthlyPrice: number;
  /** Short bullets — max one line each */
  features: string[];
  popular?: boolean;
}

export const PRACTITIONER_PLANS: PractitionerPlanDef[] = [
  {
    id: "practitioner",
    name: "Starter",
    monthlyPrice: 30,
    features: [
      "Online booking & session calendar",
      "Client messaging (SMS charged per text)",
      "Treatment notes per session",
      "Payouts & credit exchange with peers",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 50,
    popular: true,
    features: [
      "Everything in Starter (including usage-billed SMS)",
      "AI help finishing notes",
      "Voice notes for sessions",
    ],
  },
];
