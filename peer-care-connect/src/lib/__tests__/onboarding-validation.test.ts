import {
  validateOnboardingStep,
  validateOnboardingData,
  getNextIncompleteStep,
  getOnboardingProgress,
  CLIENT_ONBOARDING_STEPS,
  PRACTITIONER_ONBOARDING_STEPS,
  type OnboardingData,
} from "@/lib/onboarding-validation";

describe("onboarding-validation", () => {
  describe("validateOnboardingStep", () => {
    it("returns valid for complete client step 1", () => {
      const data: OnboardingData = {
        first_name: "John",
        last_name: "Doe",
      };
      const result = validateOnboardingStep(1, data, "client");
      expect(result.isValid).toBe(true);
    });

    it("returns invalid for short first name", () => {
      const data: OnboardingData = { first_name: "J", last_name: "Doe" };
      const result = validateOnboardingStep(1, data, "client");
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("First name"))).toBe(true);
    });

    it("returns valid for unknown step (e.g. Stripe)", () => {
      const result = validateOnboardingStep(99, {}, "client");
      expect(result.isValid).toBe(true);
    });
  });

  describe("validateOnboardingData", () => {
    it("returns invalid for empty client data", () => {
      const result = validateOnboardingData({}, "client");
      expect(result.isValid).toBe(false);
    });

    it("returns valid for complete client data", () => {
      const data: OnboardingData = {
        first_name: "Jane",
        last_name: "Smith",
      };
      const result = validateOnboardingData(data, "client");
      expect(result.isValid).toBe(true);
    });
  });

  describe("getNextIncompleteStep", () => {
    it("returns 1 for empty client data", () => {
      expect(getNextIncompleteStep({}, "client")).toBe(1);
    });

    it("returns step after last when all complete", () => {
      const data: OnboardingData = {
        first_name: "Jane",
        last_name: "Smith",
      };
      expect(getNextIncompleteStep(data, "client")).toBe(
        CLIENT_ONBOARDING_STEPS.length
      );
    });
  });

  describe("getOnboardingProgress", () => {
    it("returns 0 for empty data", () => {
      expect(getOnboardingProgress({}, "client")).toBe(0);
    });

    it("returns 100 when all steps valid", () => {
      const data: OnboardingData = {
        first_name: "Jane",
        last_name: "Smith",
      };
      expect(getOnboardingProgress(data, "client")).toBe(100);
    });
  });

  describe("step configs", () => {
    it("client steps exist", () => {
      expect(CLIENT_ONBOARDING_STEPS.length).toBeGreaterThan(0);
    });
    it("practitioner steps exist", () => {
      expect(PRACTITIONER_ONBOARDING_STEPS.length).toBeGreaterThan(0);
    });
  });

  describe("practitioner onboarding (all types)", () => {
    const practitionerRoles = ["sports_therapist", "massage_therapist", "osteopath"] as const;

    practitionerRoles.forEach((role) => {
      it(`${role}: validates step 1 with required fields`, () => {
        const validData = {
          firstName: "Jane",
          lastName: "Smith",
          phone: "+447700900123",
          location: "London",
        };
        const result = validateOnboardingStep(1, validData, role);
        expect(result.isValid).toBe(true);
      });

      it(`${role}: rejects missing phone`, () => {
        const data = {
          firstName: "Jane",
          lastName: "Smith",
          location: "London",
        };
        const result = validateOnboardingStep(1, data, role);
        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.includes("phone") || e.includes("Phone"))).toBe(true);
      });

      it(`${role}: rejects short location`, () => {
        const data = {
          firstName: "Jane",
          lastName: "Smith",
          phone: "+447700900123",
          location: "AB",
        };
        const result = validateOnboardingStep(1, data, role);
        expect(result.isValid).toBe(false);
      });

      it(`${role}: getNextIncompleteStep returns 1 for empty`, () => {
        expect(getNextIncompleteStep({}, role)).toBe(1);
      });

      it(`${role}: getOnboardingProgress returns number 0-100`, () => {
        const p = getOnboardingProgress({}, role);
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThanOrEqual(100);
      });
    });
  });

  describe("validateOnboardingData practitioner", () => {
    it("returns invalid for empty practitioner data", () => {
      const result = validateOnboardingData({}, "sports_therapist");
      expect(result.isValid).toBe(false);
    });
  });
});
