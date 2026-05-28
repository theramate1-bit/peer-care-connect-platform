import { calculateRequiredCredits } from "@/lib/treatment-exchange/credits";

describe("treatment-exchange/credits", () => {
  describe("calculateRequiredCredits", () => {
    it("returns 1 credit per minute", () => {
      expect(calculateRequiredCredits(60)).toBe(60);
      expect(calculateRequiredCredits(30)).toBe(30);
    });

    it("returns minimum 1 for zero or negative", () => {
      expect(calculateRequiredCredits(0)).toBe(1);
      expect(calculateRequiredCredits(-10)).toBe(1);
    });
    it("handles 90 minute session", () => {
      expect(calculateRequiredCredits(90)).toBe(90);
    });
  });
});
