import {
  conditionsDatabase,
  type ConditionProfile,
} from "@/lib/smart-search/training-data";

describe("smart-search/training-data", () => {
  describe("conditionsDatabase", () => {
    it("has at least one condition", () => {
      expect(conditionsDatabase.length).toBeGreaterThan(0);
    });

    it("each condition has required fields", () => {
      conditionsDatabase.forEach((c: ConditionProfile) => {
        expect(c.id).toBeTruthy();
        expect(c.name).toBeTruthy();
        expect(Array.isArray(c.keywords)).toBe(true);
        expect(Array.isArray(c.recommendedPractitioners)).toBe(true);
        expect(c.urgencyLevel).toMatch(/low|medium|high/);
        expect(c.severity).toMatch(/mild|moderate|severe/);
      });
    });

    it("lower_back_pain recommends osteopath and sports_therapist", () => {
      const lbp = conditionsDatabase.find((c) => c.id === "lower_back_pain");
      expect(lbp).toBeDefined();
      expect(lbp!.recommendedPractitioners).toContain("osteopath");
      expect(lbp!.recommendedPractitioners).toContain("sports_therapist");
    });

    it("stress_tension recommends massage_therapist", () => {
      const stress = conditionsDatabase.find((c) => c.id === "stress_tension");
      expect(stress).toBeDefined();
      expect(stress!.recommendedPractitioners).toContain("massage_therapist");
    });
  });
});
