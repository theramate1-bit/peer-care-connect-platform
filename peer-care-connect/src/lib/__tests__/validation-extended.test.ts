/**
 * Extended parameterized tests for validation
 */
import {
  emailSchema,
  nameSchema,
  validateEmail,
  validatePhone,
  validateUrl,
  sanitizeInput,
} from "@/lib/validation";

describe("validation extended", () => {
  describe("emailSchema", () => {
    it.each(["a@b.com", "user+tag@domain.co.uk", "test@sub.domain.com"])(
      "accepts %s",
      (email) => {
        expect(emailSchema.safeParse(email).success).toBe(true);
      }
    );
  });

  describe("nameSchema", () => {
    it.each(["Jane Doe", "Mary O'Brien", "John Smith"])("accepts %s", (name) => {
      expect(nameSchema.safeParse(name).success).toBe(true);
    });
  });

  describe("validateEmail", () => {
    it.each(["invalid", "", "no@", "@nodomain"])("rejects %s", (email) => {
      expect(validateEmail(email)).toBe(false);
    });
  });

  describe("validatePhone", () => {
    it.each(["+441234567890", "+12025551234"])("accepts %s", (phone) => {
      expect(validatePhone(phone)).toBe(true);
    });
  });

  describe("validateUrl", () => {
    it("accepts https", () => {
      expect(validateUrl("https://example.com/path")).toBe(true);
    });
  });

  describe("sanitizeInput", () => {
    it("removes angle brackets", () => {
      expect(sanitizeInput("<script>alert(1)</script>")).not.toContain("<");
      expect(sanitizeInput("<script>alert(1)</script>")).not.toContain(">");
    });
    it("removes javascript protocol", () => {
      expect(sanitizeInput("javascript:void(0)")).not.toContain("javascript:");
    });
  });
  describe("emailSchema extended", () => {
    it("accepts user@example.com", () => {
      expect(emailSchema.safeParse("user@example.com").success).toBe(true);
    });
    it("accepts a@b.co", () => {
      expect(emailSchema.safeParse("a@b.co").success).toBe(true);
    });
  });
});
