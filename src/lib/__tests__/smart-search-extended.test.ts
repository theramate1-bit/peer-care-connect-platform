/**
 * Extended tests for smart search training data
 */
import { conditionsDatabase } from "@/lib/smart-search/training-data";

describe("smart-search extended", () => {
  describe("conditionsDatabase", () => {
    it("has at least one condition", () => {
      expect(conditionsDatabase.length).toBeGreaterThan(0);
    });

    it("each condition has recommendedPractitioners", () => {
      conditionsDatabase.forEach((cond) => {
        expect(cond.recommendedPractitioners).toBeDefined();
        expect(Array.isArray(cond.recommendedPractitioners)).toBe(true);
      });
    });

    it("each condition has keywords", () => {
      conditionsDatabase.forEach((cond) => {
        expect(cond.keywords?.length ?? 0).toBeGreaterThan(0);
      });
    });
  });
});
