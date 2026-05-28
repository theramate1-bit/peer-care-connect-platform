/**
 * Extended tests for profile completion
 */
import {
  calculateProfileCompletion,
  calculateProfileActivationStatus,
  type ProfileCompletionData,
} from "@/lib/profile-completion";

describe("profile-completion extended", () => {
  describe("calculateProfileCompletion", () => {
    it("returns 100 when all basic and professional fields filled", () => {
      const profile: ProfileCompletionData = {
        first_name: "Jane",
        last_name: "Doe",
        email: "j@x.com",
        phone: "+441234",
        profile_photo_url: "https://x.com/p.jpg",
        bio: "Bio",
        location: "London",
        experience_years: 5,
        registration_number: "REG1",
      };
      const r = calculateProfileCompletion(profile, 0, 2);
      expect(r.percentage).toBe(100);
    });

    it("returns undefined-safe for missing optional fields", () => {
      const r = calculateProfileCompletion({ first_name: "Jane", last_name: "Doe", email: "j@x.com" });
      expect(r.breakdown.basic.completed).toBeGreaterThanOrEqual(0);
    });
  });

  describe("calculateProfileActivationStatus", () => {
    it("returns 6 checks always", () => {
      const r = calculateProfileActivationStatus({ bio: "x" }, false);
      expect(r.checks).toHaveLength(6);
    });
  });
});
