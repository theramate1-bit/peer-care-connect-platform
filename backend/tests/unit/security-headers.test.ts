import { securityHeaders } from "../../../supabase/functions/_shared/security-headers";

describe("securityHeaders", () => {
  it("returns standard security headers", () => {
    const headers = securityHeaders();

    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["Strict-Transport-Security"]).toContain("max-age=31536000");
    expect(headers["X-XSS-Protection"]).toBe("1; mode=block");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["Permissions-Policy"]).toBeTruthy();
  });

  it("does not add Access-Control-Allow-Origin when no origin", () => {
    const headers = securityHeaders();
    expect(headers["Access-Control-Allow-Origin"]).toBeUndefined();
  });

  it("adds access-control-allow-origin when origin is provided", () => {
    const headers = securityHeaders("https://app.theramate.co.uk");

    expect(headers["Access-Control-Allow-Origin"]).toBe(
      "https://app.theramate.co.uk",
    );
  });

  it("handles empty string origin as falsy", () => {
    const headers = securityHeaders("");
    expect(headers["Access-Control-Allow-Origin"]).toBeUndefined();
  });
});
