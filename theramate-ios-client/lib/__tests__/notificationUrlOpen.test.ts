import { describe, expect, it } from "@jest/globals";

import { tryMapWebUrlToRoute } from "@/lib/notificationWebRouteMap";

const REQ = "a1b2c3d4-e5f6-4789-a012-3456789abcde";

describe("tryMapWebUrlToRoute", () => {
  it("maps practice exchange-requests with request to native detail", () => {
    const route = tryMapWebUrlToRoute(
      `https://theramate.co.uk/practice/exchange-requests?request=${REQ}`,
      "sports_therapist",
    );
    expect(route).toBe(`/(practitioner)/exchange/${REQ}`);
  });

  it("maps exchange inbox without request to native hub", () => {
    expect(
      tryMapWebUrlToRoute(
        "https://theramate.com/practice/exchange-requests",
        "osteopath",
      ),
    ).toBe("/(practitioner)/exchange");
  });

  it("maps exchange link for client to credits", () => {
    expect(
      tryMapWebUrlToRoute(
        `https://theramate.co.uk/practice/exchange-requests?request=${REQ}`,
        "client",
      ),
    ).toBe("/profile/credits");
  });
});
