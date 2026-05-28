import { describe, expect, it } from "@jest/globals";

import {
  getStripeCheckoutWebOrigins,
  isCheckoutWebHostname,
} from "@/lib/stripeCheckoutWebOrigins";

describe("stripeCheckoutWebOrigins", () => {
  it("includes primary and known Theramate domains", () => {
    const origins = getStripeCheckoutWebOrigins("https://theramate.com");
    expect(origins.some((o) => o.includes("theramate.com"))).toBe(true);
    expect(origins.some((o) => o.includes("theramate.co.uk"))).toBe(true);
  });

  it("accepts www and bare hostnames", () => {
    const origins = getStripeCheckoutWebOrigins("https://theramate.co.uk");
    expect(isCheckoutWebHostname("www.theramate.co.uk", origins)).toBe(true);
    expect(isCheckoutWebHostname("theramate.co.uk", origins)).toBe(true);
    expect(isCheckoutWebHostname("www.theramate.com", origins)).toBe(true);
    expect(isCheckoutWebHostname("evil.com", origins)).toBe(false);
  });
});
