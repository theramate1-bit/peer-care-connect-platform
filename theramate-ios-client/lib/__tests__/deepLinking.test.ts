import {
  getNavigationFromDeepLink,
  isOAuthCallbackUrl,
  isPasswordResetUrl,
} from "@/lib/deepLinking";

describe("getNavigationFromDeepLink", () => {
  it("maps HTTPS guest book path with slug casing preserved", () => {
    expect(
      getNavigationFromDeepLink("https://theramate.com/book/My-Practitioner"),
    ).toEqual({
      pathname: "/book/[slug]",
      params: { slug: "My-Practitioner" },
    });
  });

  it("maps booking/find", () => {
    expect(
      getNavigationFromDeepLink("https://www.theramate.com/booking/find"),
    ).toEqual({
      pathname: "/booking/find",
    });
  });

  it("maps booking/view with session id and optional token from query", () => {
    expect(
      getNavigationFromDeepLink(
        "https://theramate.com/booking/view/sess-123?token=abc",
      ),
    ).toEqual({
      pathname: "/booking/view/[sessionId]",
      params: { sessionId: "sess-123", token: "abc" },
    });
  });

  it("maps custom scheme book URL", () => {
    expect(getNavigationFromDeepLink("theramate://book/uuid-or-slug")).toEqual({
      pathname: "/book/[slug]",
      params: { slug: "uuid-or-slug" },
    });
  });

  it("maps public therapist profile URL", () => {
    expect(
      getNavigationFromDeepLink(
        "https://theramate.com/therapist/abc123/public",
      ),
    ).toEqual({
      pathname: "/therapist/[id]/public",
      params: { id: "abc123" },
    });
  });

  it("returns null for unrelated hosts", () => {
    expect(getNavigationFromDeepLink("https://evil.com/book/x")).toBeNull();
  });

  it("maps auth/public completion paths", () => {
    expect(
      getNavigationFromDeepLink("https://theramate.com/auth/verify-email"),
    ).toEqual({
      pathname: "/verify-email",
    });
    expect(
      getNavigationFromDeepLink(
        "https://theramate.com/auth/registration-success",
      ),
    ).toEqual({
      pathname: "/registration-success",
    });
    expect(
      getNavigationFromDeepLink("https://theramate.com/auth/role-selection"),
    ).toEqual({
      pathname: "/role-selection",
    });
    expect(
      getNavigationFromDeepLink("https://theramate.com/auth/oauth-completion"),
    ).toEqual({
      pathname: "/oauth-completion",
    });
    expect(
      getNavigationFromDeepLink("https://theramate.com/onboarding"),
    ).toEqual({
      pathname: "/onboarding",
    });
    expect(
      getNavigationFromDeepLink(
        "https://theramate.com/auth/reset-password-confirm",
      ),
    ).toEqual({
      pathname: "/reset-password-confirm",
    });
    expect(
      getNavigationFromDeepLink("https://theramate.com/subscription-success"),
    ).toEqual({
      pathname: "/settings/subscription",
    });
  });
});

describe("isOAuthCallbackUrl", () => {
  it("accepts app scheme oauth path", () => {
    expect(isOAuthCallbackUrl("theramate://oauth-callback?code=1")).toBe(true);
  });

  it("accepts HTTPS auth callback on configured host", () => {
    expect(
      isOAuthCallbackUrl("https://theramate.com/auth/callback?code=abc"),
    ).toBe(true);
    expect(
      isOAuthCallbackUrl("https://www.theramate.com/oauth-callback?code=abc"),
    ).toBe(true);
  });

  it("rejects wrong host", () => {
    expect(
      isOAuthCallbackUrl("https://example.com/auth/callback?code=abc"),
    ).toBe(false);
  });
});

describe("isPasswordResetUrl", () => {
  it("accepts app scheme reset path", () => {
    expect(isPasswordResetUrl("theramate://reset-password-confirm")).toBe(true);
  });

  it("accepts HTTPS reset confirm on configured host", () => {
    expect(
      isPasswordResetUrl("https://theramate.com/reset-password-confirm"),
    ).toBe(true);
    expect(
      isPasswordResetUrl(
        "https://www.theramate.com/auth/reset-password-confirm",
      ),
    ).toBe(true);
  });
});
