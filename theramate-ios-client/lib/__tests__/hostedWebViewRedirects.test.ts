import { describe, expect, it } from "@jest/globals";

import { parseCheckoutRedirectFromUrl } from "@/lib/hostedWebViewRedirects";

describe("parseCheckoutRedirectFromUrl", () => {
  const web = "https://theramate.co.uk";

  it("detects clinic booking success", () => {
    expect(
      parseCheckoutRedirectFromUrl(
        `${web}/booking-success?session_id=cs_test_123`,
      ),
    ).toEqual({
      type: "clinic_success",
      checkoutSessionId: "cs_test_123",
    });
  });

  it("detects mobile booking success", () => {
    expect(
      parseCheckoutRedirectFromUrl(
        `${web}/mobile-booking/success?mobile_request_id=req-1&mobile_checkout_session_id=cs_mob_1`,
      ),
    ).toEqual({
      type: "mobile_success",
      mobileRequestId: "req-1",
      checkoutSessionId: "cs_mob_1",
    });
  });

  it("detects platform subscription success", () => {
    expect(
      parseCheckoutRedirectFromUrl(
        `${web}/subscription-success?session_id=cs_sub_abc`,
      ),
    ).toEqual({
      type: "subscription_success",
      checkoutSessionId: "cs_sub_abc",
    });
  });

  it("detects Stripe Connect onboarding return", () => {
    expect(
      parseCheckoutRedirectFromUrl(`${web}/onboarding/stripe-return`),
    ).toEqual({ type: "connect_onboarding_return" });
    expect(parseCheckoutRedirectFromUrl(`${web}/stripe-return`)).toEqual({
      type: "connect_onboarding_return",
    });
  });

  it("detects mobile checkout canceled query", () => {
    expect(
      parseCheckoutRedirectFromUrl(
        `${web}/marketplace?mobile_checkout_canceled=1`,
      ),
    ).toEqual({ type: "canceled" });
  });

  it("does not treat arbitrary paths containing stripe-return as Connect return", () => {
    expect(
      parseCheckoutRedirectFromUrl(`${web}/reports/stripe-return-archive`),
    ).toBeNull();
  });

  it("returns null for unrelated URLs", () => {
    expect(
      parseCheckoutRedirectFromUrl("https://evil.com/booking-success"),
    ).toBeNull();
  });

  it("accepts theramate.com when primary env is .co.uk", () => {
    expect(
      parseCheckoutRedirectFromUrl(
        "https://theramate.com/mobile-booking/success?mobile_request_id=r1&mobile_checkout_session_id=cs_1",
      ),
    ).toEqual({
      type: "mobile_success",
      mobileRequestId: "r1",
      checkoutSessionId: "cs_1",
    });
  });
});
