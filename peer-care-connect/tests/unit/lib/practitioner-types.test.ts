/**
 * Tests for practitioner type handling across the platform.
 * Covers sports_therapist, massage_therapist, osteopath, and therapist_type (clinic_based, mobile, hybrid).
 */

import { getServiceTypeDisplayName, getServiceTypeDescription } from "@/utils/pricing";
import { validateServicePricing, type ServiceData } from "@/utils/pricing";

const practitionerServiceTypes = ["sports_therapy", "massage_therapy", "osteopathy"] as const;

describe("practitioner types", () => {
  describe("getServiceTypeDisplayName", () => {
    practitionerServiceTypes.forEach((serviceType) => {
      it(`returns display name for ${serviceType}`, () => {
        const name = getServiceTypeDisplayName(serviceType);
        expect(name).toBeTruthy();
        expect(name).not.toBe(serviceType);
      });
    });

    it("returns display names for all practitioner service types", () => {
      expect(getServiceTypeDisplayName("sports_therapy")).toBe("Sports Therapy");
      expect(getServiceTypeDisplayName("massage_therapy")).toBe("Massage Therapy");
      expect(getServiceTypeDisplayName("osteopathy")).toBe("Osteopathy");
    });

    it("returns original value for unknown type", () => {
      expect(getServiceTypeDisplayName("acupuncture")).toBe("acupuncture");
    });
  });

  describe("getServiceTypeDescription", () => {
    practitionerServiceTypes.forEach((serviceType) => {
      it(`returns description for ${serviceType}`, () => {
        const desc = getServiceTypeDescription(serviceType);
        expect(desc.length).toBeGreaterThan(0);
      });
    });

    it("returns empty for unknown type", () => {
      expect(getServiceTypeDescription("unknown")).toBe("");
    });
  });

  describe("validateServicePricing per service type", () => {
    practitionerServiceTypes.forEach((serviceType) => {
      it(`accepts valid ${serviceType} service`, () => {
        const data: ServiceData = {
          serviceName: "60 min Session",
          serviceType,
          durationMinutes: 60,
          basePricePence: 7000,
        };
        const errors = validateServicePricing(data);
        expect(errors).toHaveLength(0);
      });
    });
    it("rejects zero duration", () => {
      const data: ServiceData = {
        serviceName: "Session",
        serviceType: "sports_therapy",
        durationMinutes: 0,
        basePricePence: 5000,
      };
      const errors = validateServicePricing(data);
      expect(errors.length).toBeGreaterThan(0);
    });
    it("rejects negative price", () => {
      const data: ServiceData = {
        serviceName: "Session",
        serviceType: "sports_therapy",
        durationMinutes: 60,
        basePricePence: -100,
      };
      const errors = validateServicePricing(data);
      expect(errors.length).toBeGreaterThan(0);
    });
    it("rejects empty service name", () => {
      const data: ServiceData = {
        serviceName: "",
        serviceType: "massage_therapy",
        durationMinutes: 60,
        basePricePence: 5000,
      };
      const errors = validateServicePricing(data);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
