import { HOSTED_CHECKOUT_PATHS } from "@/lib/hostedCheckoutPaths";

describe("HOSTED_CHECKOUT_PATHS", () => {
  it("matches edge + web contract paths", () => {
    expect(HOSTED_CHECKOUT_PATHS.bookingSuccess).toBe("/booking-success");
    expect(HOSTED_CHECKOUT_PATHS.mobileBookingSuccess).toBe(
      "/mobile-booking/success",
    );
    expect(HOSTED_CHECKOUT_PATHS.subscriptionSuccess).toBe(
      "/subscription-success",
    );
    expect(HOSTED_CHECKOUT_PATHS.connectStripeReturn).toBe(
      "/onboarding/stripe-return",
    );
    expect(HOSTED_CHECKOUT_PATHS.connectStripeReturnAlias).toBe(
      "/stripe-return",
    );
  });
});
