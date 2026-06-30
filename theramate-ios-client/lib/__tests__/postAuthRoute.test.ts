jest.mock("@/lib/authRoles", () => ({
  isPractitionerPortalRole: (role: string | null | undefined) =>
    role === "practitioner" ||
    role === "osteopath" ||
    role === "physiotherapist",
}));

import { getMainAppHref } from "@/lib/postAuthRoute";

describe("getMainAppHref", () => {
  it("returns client tabs for client role", () => {
    expect(getMainAppHref("client")).toBe("/(tabs)");
  });

  it("returns practitioner ptabs for practitioner roles", () => {
    expect(getMainAppHref("osteopath")).toBe("/(practitioner)/(ptabs)");
    expect(getMainAppHref("practitioner")).toBe("/(practitioner)/(ptabs)");
  });

  it("defaults to client tabs when role missing", () => {
    expect(getMainAppHref(null)).toBe("/(tabs)");
    expect(getMainAppHref(undefined)).toBe("/(tabs)");
  });
});
