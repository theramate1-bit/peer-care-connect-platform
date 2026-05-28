import {
  emailSchema,
  nameSchema,
  sanitizeInput,
  validateEmail,
  validatePassword,
  validatePhone,
  validateUrl,
  validateRateLimit,
  sanitizeSqlInput,
  userRegistrationSchema,
  reviewSchema,
} from "@/lib/validation";

describe("validation", () => {
  describe("emailSchema", () => {
    it("accepts valid emails", () => {
      expect(emailSchema.safeParse("user@example.com").success).toBe(true);
      expect(emailSchema.safeParse("a@b.co").success).toBe(true);
    });
    it("rejects invalid emails", () => {
      expect(emailSchema.safeParse("invalid").success).toBe(false);
      expect(emailSchema.safeParse("").success).toBe(false);
    });
  });

  describe("nameSchema", () => {
    it("accepts valid names", () => {
      expect(nameSchema.safeParse("Jane Doe").success).toBe(true);
      expect(nameSchema.safeParse("O'Brien").success).toBe(true);
    });
    it("rejects short names", () => {
      expect(nameSchema.safeParse("A").success).toBe(false);
    });
    it("rejects names with numbers", () => {
      expect(nameSchema.safeParse("Jane123").success).toBe(false);
    });
  });

  describe("sanitizeInput", () => {
    it("trims and removes HTML", () => {
      expect(sanitizeInput("  <script>x</script>  ")).not.toContain("<");
    });
    it("removes javascript: protocol", () => {
      expect(sanitizeInput("javascript:alert(1)")).not.toContain("javascript:");
    });
  });

  describe("validateEmail", () => {
    it("returns true for valid email", () => {
      expect(validateEmail("user@example.com")).toBe(true);
    });
    it("returns false for invalid email", () => {
      expect(validateEmail("invalid")).toBe(false);
    });
  });

  describe("validatePassword", () => {
    it("rejects weak password", () => {
      const r = validatePassword("weak");
      expect(r.valid).toBe(false);
      expect(r.errors.length).toBeGreaterThan(0);
    });
    it("accepts strong password", () => {
      const r = validatePassword("StrongP@ss1");
      expect(r.valid).toBe(true);
    });
  });

  describe("validatePhone", () => {
    it("accepts valid phone", () => {
      expect(validatePhone("+441234567890")).toBe(true);
    });
    it("rejects too short", () => {
      expect(validatePhone("123")).toBe(false);
    });
  });

  describe("validateUrl", () => {
    it("accepts valid URL", () => {
      expect(validateUrl("https://example.com")).toBe(true);
    });
    it("rejects invalid URL", () => {
      expect(validateUrl("not-a-url")).toBe(false);
    });
  });

  describe("validateRateLimit", () => {
    it("returns true when under limit", () => {
      expect(validateRateLimit(3, 5, 60000)).toBe(true);
    });
    it("returns false when at or over limit", () => {
      expect(validateRateLimit(5, 5, 60000)).toBe(false);
    });
  });

  describe("sanitizeSqlInput", () => {
    it("removes dangerous chars", () => {
      const out = sanitizeSqlInput("'; DROP TABLE--");
      expect(out).not.toContain("'");
      expect(out).not.toContain("--");
    });
  });

  describe("userRegistrationSchema", () => {
    it("requires userRole to be valid practitioner type", () => {
      const invalid = {
        email: "a@b.com",
        password: "StrongP@ss1",
        confirmPassword: "StrongP@ss1",
        firstName: "Jane",
        lastName: "Doe",
        userRole: "invalid",
        agreeToTerms: true,
      };
      expect(userRegistrationSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe("reviewSchema", () => {
    it("accepts valid review", () => {
      const r = reviewSchema.safeParse({
        rating: 5,
        comment: "Great session, very professional.",
        sessionId: "123e4567-e89b-12d3-a456-426614174000",
      });
      expect(r.success).toBe(true);
    });
    it("rejects rating out of range", () => {
      const r = reviewSchema.safeParse({
        rating: 6,
        comment: "Great session",
        sessionId: "123e4567-e89b-12d3-a456-426614174000",
      });
      expect(r.success).toBe(false);
    });
    it("rejects rating below 1", () => {
      expect(reviewSchema.safeParse({ rating: 0, comment: "Ok", sessionId: "123e4567-e89b-12d3-a456-426614174000" }).success).toBe(false);
    });
  });
  describe("validateRateLimit edge cases", () => {
    it("returns false when count exceeds limit", () => {
      expect(validateRateLimit(10, 5, 60000)).toBe(false);
    });
  });
  describe("validateUrl edge cases", () => {
    it("accepts http URLs", () => {
      expect(validateUrl("http://example.com")).toBe(true);
    });
  });
});
