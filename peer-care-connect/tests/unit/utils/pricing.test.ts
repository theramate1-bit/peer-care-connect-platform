import {
  calculateServicePricing,
  poundsToPence,
  penceToPounds,
  formatPrice,
  validateServicePricing,
  type ServiceData,
} from "@/utils/pricing";

describe("pricing utils", () => {
  describe("calculateServicePricing", () => {
    it("calculates platform fee and practitioner earnings", () => {
      const r = calculateServicePricing(10000, 4);
      expect(r.basePricePence).toBe(10000);
      expect(r.platformFeePence).toBe(400);
      expect(r.practitionerEarningsPence).toBe(9600);
      expect(r.totalPricePence).toBe(10000);
    });
    it("uses default 4% when fee not specified", () => {
      const r = calculateServicePricing(10000);
      expect(r.platformFeePercentage).toBe(4);
    });
  });

  describe("poundsToPence", () => {
    it("converts pounds to pence", () => {
      expect(poundsToPence(10)).toBe(1000);
      expect(poundsToPence(60.5)).toBe(6050);
    });
  });

  describe("penceToPounds", () => {
    it("converts pence to pounds", () => {
      expect(penceToPounds(1000)).toBe(10);
      expect(penceToPounds(6050)).toBe(60.5);
    });
  });

  describe("formatPrice", () => {
    it("formats pence as GBP", () => {
      expect(formatPrice(6000)).toMatch(/£60/);
    });
    it("uses default GBP", () => {
      expect(formatPrice(100, "GBP")).toMatch(/£/);
    });
  });

  describe("validateServicePricing", () => {
    it("rejects base price below £10", () => {
      const data: ServiceData = {
        serviceName: "Session",
        serviceType: "sports_therapy",
        durationMinutes: 60,
        basePricePence: 500,
      };
      const errors = validateServicePricing(data);
      expect(errors.some((e) => e.includes("Minimum"))).toBe(true);
    });
    it("rejects base price above £500", () => {
      const data: ServiceData = {
        serviceName: "Session",
        serviceType: "sports_therapy",
        durationMinutes: 60,
        basePricePence: 60000,
      };
      const errors = validateServicePricing(data);
      expect(errors.some((e) => e.includes("Maximum"))).toBe(true);
    });
  });
});
