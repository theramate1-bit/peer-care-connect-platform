/**
 * Extended tests for booking flow type
 */
import {
  canBookClinic,
  canRequestMobile,
  isProductClinicBookable,
  isProductMobileBookable,
  getEffectiveProductServiceType,
} from "@/lib/booking-flow-type";

describe("booking-flow extended", () => {
  describe("getEffectiveProductServiceType", () => {
    it.each([
      ["clinic_based", "clinic", "clinic"],
      ["mobile", "mobile", "mobile"],
      ["hybrid", "both", "both"],
    ] as const)("%s with %s product -> %s", (therapistType, serviceType, expected) => {
      expect(
        getEffectiveProductServiceType(therapistType, { is_active: true, service_type: serviceType })
      ).toBe(expected);
    });
  });

  describe("isProductClinicBookable", () => {
    it("returns true for both", () => {
      expect(isProductClinicBookable("hybrid", { is_active: true, service_type: "both" })).toBe(true);
    });
  });

  describe("isProductMobileBookable", () => {
    it("returns true for both", () => {
      expect(isProductMobileBookable("hybrid", { is_active: true, service_type: "both" })).toBe(true);
    });
  });

  describe("canBookClinic", () => {
    it("returns false when no products", () => {
      const p = {
        therapist_type: "clinic_based" as const,
        products: [] as any[],
      };
      expect(canBookClinic(p)).toBe(false);
    });
  });
});
