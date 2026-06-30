/**
 * Stripe Checkout return paths — keep in sync with:
 * - `src/lib/hostedCheckoutPaths.ts`
 * - `theramate-ios-client/lib/hostedCheckoutPaths.ts`
 */
export const HOSTED_CHECKOUT_PATHS = {
  mobileBookingSuccess: "/mobile-booking/success",
  bookingSuccess: "/booking-success",
  subscriptionSuccess: "/subscription-success",
  connectStripeReturn: "/onboarding/stripe-return",
  connectStripeReturnAlias: "/stripe-return",
};

/** Join APP_URL + path + optional query (path must start with `/`). */
export function joinAppUrl(appUrl: string, path: string, search = ""): string {
  const base = appUrl.replace(/\/$/, "");
  return `${base}${path}${search}`;
}
