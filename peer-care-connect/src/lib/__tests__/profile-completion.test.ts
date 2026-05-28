import {
  calculateProfileCompletion,
  calculateProfileActivationStatus,
  type ProfileCompletionData,
} from "@/lib/profile-completion";

describe("profile-completion", () => {
  describe("calculateProfileCompletion", () => {
    it("returns 0 for null profile", () => {
      const r = calculateProfileCompletion(null);
      expect(r.percentage).toBe(0);
      expect(r.completed).toBe(0);
      expect(r.total).toBe(11);
    });

    it("counts basic fields", () => {
      const profile: ProfileCompletionData = {
        first_name: "Jane",
        last_name: "Doe",
        email: "jane@example.com",
        phone: "+441234567890",
        profile_photo_url: "https://example.com/photo.jpg",
      };
      const r = calculateProfileCompletion(profile);
      expect(r.breakdown.basic.completed).toBe(5);
      expect(r.breakdown.basic.total).toBe(5);
    });

    it("counts professional fields with qualifications", () => {
      const profile: ProfileCompletionData = {
        first_name: "Jane",
        last_name: "Doe",
        email: "j@x.com",
        phone: "+44",
        profile_photo_url: "x",
        bio: "Practitioner bio",
        location: "London",
        experience_years: 5,
        registration_number: "REG123",
      };
      const r = calculateProfileCompletion(profile, 0, 2);
      expect(r.breakdown.professional.completed).toBe(5);
    });

    it("ignores empty strings", () => {
      const r = calculateProfileCompletion({
        first_name: "",
        last_name: "   ",
        email: null,
      });
      expect(r.breakdown.basic.completed).toBe(0);
    });
  });

  describe("calculateProfileActivationStatus", () => {
    it("returns all false for null profile", () => {
      const r = calculateProfileActivationStatus(null, false);
      expect(r.percentage).toBe(0);
      expect(r.checks.every((c) => !c.isComplete)).toBe(true);
    });

    it("marks bio complete when non-empty", () => {
      const r = calculateProfileActivationStatus({ bio: "Experienced practitioner" }, false);
      expect(r.checks.find((c) => c.id === "bio")?.isComplete).toBe(true);
    });

    it("marks experience complete when experience_years set", () => {
      const r = calculateProfileActivationStatus({ experience_years: 5 }, false);
      expect(r.checks.find((c) => c.id === "experience")?.isComplete).toBe(true);
    });

    it("marks qualifications complete when counts > 0", () => {
      const r = calculateProfileActivationStatus({}, false, 2, 1, 1);
      expect(r.checks.find((c) => c.id === "qualifications")?.isComplete).toBe(true);
    });

    it("marks availability complete when hasAvailability true", () => {
      const r = calculateProfileActivationStatus({}, true);
      expect(r.checks.find((c) => c.id === "availability")?.isComplete).toBe(true);
    });

    it("marks location complete when location set", () => {
      const r = calculateProfileActivationStatus({ location: "London" }, false);
      expect(r.checks.find((c) => c.id === "location")?.isComplete).toBe(true);
    });

    it("marks services complete when productsCount > 0", () => {
      const r = calculateProfileActivationStatus({}, false, 0, 3, 0);
      expect(r.checks.find((c) => c.id === "services")?.isComplete).toBe(true);
    });
  });
});
