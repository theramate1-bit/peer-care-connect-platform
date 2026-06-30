/**
 * Stripe / hosted checkout return paths — keep in sync with:
 * - `src/lib/hostedCheckoutPaths.ts`
 * - `supabase/functions/_shared/hosted-checkout-paths.ts`
 */
export const HOSTED_CHECKOUT_PATHS = {
  mobileBookingSuccess: "/mobile-booking/success",
  bookingSuccess: "/booking-success",
  subscriptionSuccess: "/subscription-success",
  connectStripeReturn: "/onboarding/stripe-return",
  connectStripeReturnAlias: "/stripe-return",
} as const;

export type HostedCheckoutPath =
  (typeof HOSTED_CHECKOUT_PATHS)[keyof typeof HOSTED_CHECKOUT_PATHS];
