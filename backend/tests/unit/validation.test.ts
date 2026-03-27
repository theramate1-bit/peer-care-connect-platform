import {
  sanitizeString,
  validateEmail,
  validateEnum,
  validateJSONBody,
  validatePositiveInteger,
  validatePositiveNumber,
  validateRequired,
  validateRequiredString,
  validateStringLength,
  validateStripeSignature,
  validateURL,
  validateUUID,
} from "../../../supabase/functions/_shared/validation";

describe("validation helpers", () => {
  it("validates email and uuid input", () => {
    expect(validateEmail("person@example.com")).toEqual({ valid: true });
    expect(validateEmail("")).toEqual({
      valid: false,
      error: "Email is required and must be a string",
    });
    expect(validateEmail("bad-email")).toEqual({
      valid: false,
      error: "Invalid email address format: bad-email",
    });

    expect(
      validateUUID("123e4567-e89b-12d3-a456-426614174000", "User ID"),
    ).toEqual({
      valid: true,
    });
    expect(validateUUID("not-a-uuid", "User ID")).toEqual({
      valid: false,
      error: "Invalid User ID format",
    });
  });

  it("covers required, numeric, length, url, and enum validators", () => {
    expect(validateRequiredString("value", "Field")).toEqual({ valid: true });
    expect(validateRequiredString("   ", "Field")).toEqual({
      valid: false,
      error: "Field is required and must be a non-empty string",
    });

    expect(validateRequired(0, "Count")).toEqual({ valid: true });
    expect(validateRequired(undefined, "Count")).toEqual({
      valid: false,
      error: "Count is required",
    });

    expect(validatePositiveInteger(2, "Quantity")).toEqual({ valid: true });
    expect(validatePositiveInteger(0, "Quantity")).toEqual({
      valid: false,
      error: "Quantity must be a positive integer",
    });

    expect(validatePositiveNumber(2.5, "Price")).toEqual({ valid: true });
    expect(validatePositiveNumber("abc", "Price")).toEqual({
      valid: false,
      error: "Price must be a positive number",
    });

    expect(validateStringLength("hello", "Label", 3, 10)).toEqual({
      valid: true,
    });
    expect(validateStringLength("hi", "Label", 3, 10)).toEqual({
      valid: false,
      error: "Label must be at least 3 characters",
    });
    expect(validateStringLength("this is too long", "Label", 3, 5)).toEqual({
      valid: false,
      error: "Label must be at most 5 characters",
    });

    expect(validateURL("https://example.com")).toEqual({ valid: true });
    expect(validateURL("not-a-url")).toEqual({
      valid: false,
      error: "Invalid URL format",
    });

    expect(
      validateEnum("clinic", "Mode", ["clinic", "mobile"] as const),
    ).toEqual({
      valid: true,
    });
    expect(validateEnum("both", "Mode", ["clinic", "mobile"] as const)).toEqual(
      {
        valid: false,
        error: "Mode must be one of: clinic, mobile",
      },
    );
  });

  it("sanitizes control characters without stripping normal text", () => {
    expect(sanitizeString(" hello\u0000world \n")).toBe("helloworld");
    expect(sanitizeString(123 as unknown as string)).toBe("");
  });

  it("validates json request happy-path and failure modes", async () => {
    const request = new Request("https://example.com", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: true }),
    });

    await expect(validateJSONBody(request)).resolves.toEqual({
      valid: true,
      data: { ok: true },
    });

    await expect(
      validateJSONBody(
        new Request("https://example.com", {
          method: "POST",
          headers: { "content-type": "text/plain" },
          body: "plain",
        }),
      ),
    ).resolves.toEqual({
      valid: false,
      error: "Content-Type must be application/json",
    });

    await expect(
      validateJSONBody(
        new Request("https://example.com", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "",
        }),
      ),
    ).resolves.toEqual({
      valid: false,
      error: "Request body is empty",
    });

    await expect(
      validateJSONBody(
        new Request("https://example.com", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{bad json",
        }),
      ),
    ).resolves.toMatchObject({
      valid: false,
    });
  });

  it("validates stripe signature shape", () => {
    expect(validateStripeSignature("t=123,v1=abc")).toEqual({ valid: true });
    expect(validateStripeSignature(null)).toEqual({
      valid: false,
      error: "Missing Stripe signature header",
    });
    expect(validateStripeSignature("invalid")).toEqual({
      valid: false,
      error: "Invalid Stripe signature format",
    });
  });

  it("validateEmail rejects too-long email", () => {
    const longEmail = "a".repeat(255) + "@example.com";
    expect(validateEmail(longEmail)).toEqual({
      valid: false,
      error: "Email address is too long (max 254 characters)",
    });
  });

  it("validatePositiveInteger rejects decimal", () => {
    expect(validatePositiveInteger(2.5, "Qty")).toEqual({
      valid: false,
      error: "Qty must be a positive integer",
    });
  });

  it("validateEnum allows empty string to fail", () => {
    expect(validateEnum("", "Status", ["a", "b"] as const)).toEqual({
      valid: false,
      error: "Status is required",
    });
  });

  it("validateRequiredString rejects null and empty", () => {
    expect(validateRequiredString(null as any, "X")).toEqual({
      valid: false,
      error: "X is required and must be a non-empty string",
    });
    expect(validateRequiredString("", "X")).toEqual({
      valid: false,
      error: "X is required and must be a non-empty string",
    });
  });

  it("validateUUID rejects null and empty string", () => {
    expect(validateUUID(null as any)).toMatchObject({ valid: false });
    expect(validateUUID("")).toMatchObject({ valid: false });
  });

  it("validateURL rejects empty string", () => {
    expect(validateURL("")).toEqual({
      valid: false,
      error: "URL is required and must be a string",
    });
  });

  it("validateStringLength rejects non-string", () => {
    expect(validateStringLength(null as any, "X", 1, 10)).toEqual({
      valid: false,
      error: "X must be a string",
    });
  });

  it("validatePositiveNumber rejects zero and negative", () => {
    expect(validatePositiveNumber(0, "P")).toEqual({
      valid: false,
      error: "P must be a positive number",
    });
    expect(validatePositiveNumber(-1, "P")).toEqual({
      valid: false,
      error: "P must be a positive number",
    });
  });

  it("validateJSONBody rejects body exceeding 10MB", async () => {
    const largeBody = "x".repeat(10 * 1024 * 1024 + 1);
    const req = new Request("https://example.com", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: largeBody,
    });
    const result = await validateJSONBody(req);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("too large");
  });

  it("sanitizeString preserves tabs and newlines", () => {
    expect(sanitizeString("a\tb\nc")).toBe("a\tb\nc");
  });
});
