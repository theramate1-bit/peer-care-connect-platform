import {
  PLATFORM_FEE_PERCENT,
  calculateApplicationFee,
  calculatePractitionerAmount,
  formatAmount,
  parseAmount,
  getFeeBreakdown,
  validatePricing,
} from "@/config/platform-fees";

describe("platform-fees", () => {
  describe("constants", () => {
    it("defines platform and Stripe fee percentages", () => {
      expect(PLATFORM_FEE_PERCENT).toBe(0.5);
    });
  });

  describe("calculateApplicationFee", () => {
    it("calculates fee from amount in pence", () => {
      expect(calculateApplicationFee(10000, 0.5)).toBe(50);
    });
    it("rounds to nearest pence", () => {
      expect(calculateApplicationFee(10001, 0.5)).toBe(50);
    });
  });

  describe("calculatePractitionerAmount", () => {
    it("subtracts application fee from total", () => {
      expect(calculatePractitionerAmount(10000, 50)).toBe(9950);
    });
  });

  describe("formatAmount", () => {
    it("formats pence as GBP", () => {
      expect(formatAmount(6000)).toMatch(/£60/);
    });
  });

  describe("parseAmount", () => {
    it("converts pounds to pence", () => {
      expect(parseAmount(60)).toBe(6000);
    });
    it("rounds decimal pounds", () => {
      expect(parseAmount(60.55)).toBe(6055);
    });
  });

  describe("getFeeBreakdown", () => {
    it("returns full breakdown", () => {
      const b = getFeeBreakdown(10000);
      expect(b.totalAmount).toBe(10000);
      expect(b.applicationFee).toBe(50);
      expect(b.practitionerAmount).toBe(9950);
      expect(b.formattedTotal).toBeTruthy();
      expect(b.formattedApplicationFee).toBeTruthy();
      expect(b.formattedPractitionerAmount).toBeTruthy();
    });
  });

  describe("validatePricing", () => {
    it("accepts positive amount", () => {
      expect(validatePricing(100)).toEqual({ isValid: true });
    });
    it("accepts zero", () => {
      expect(validatePricing(0)).toEqual({ isValid: true });
    });
    it("rejects negative amount", () => {
      expect(validatePricing(-1)).toEqual({
        isValid: false,
        error: "Price must be positive",
      });
    });
  });
  describe("getFeeBreakdown edge cases", () => {
    it("handles zero total", () => {
      const b = getFeeBreakdown(0);
      expect(b.totalAmount).toBe(0);
      expect(b.applicationFee).toBe(0);
      expect(b.practitionerAmount).toBe(0);
    });
  });
  describe("parseAmount edge cases", () => {
    it("handles zero", () => {
      expect(parseAmount(0)).toBe(0);
    });
    it("handles decimal pounds", () => {
      expect(parseAmount(19.99)).toBe(1999);
    });
  });
  describe("calculateApplicationFee edge cases", () => {
    it("returns 0 for 0 amount", () => {
      expect(calculateApplicationFee(0, 0.5)).toBe(0);
    });
  });
});
