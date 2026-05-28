import {
  getStarRatingTier,
  calculateDistance,
} from "@/lib/treatment-exchange/matching";

describe("treatment-exchange/matching", () => {
  describe("getStarRatingTier", () => {
    it("returns 0 for 0-1 stars", () => {
      expect(getStarRatingTier(0)).toBe(0);
      expect(getStarRatingTier(0.5)).toBe(0);
      expect(getStarRatingTier(1)).toBe(0);
      expect(getStarRatingTier(null)).toBe(0);
      expect(getStarRatingTier(undefined)).toBe(0);
    });

    it("returns 1 for 2-3 stars", () => {
      expect(getStarRatingTier(2)).toBe(1);
      expect(getStarRatingTier(2.5)).toBe(1);
      expect(getStarRatingTier(3)).toBe(1);
    });

    it("returns 2 for 4-5 stars", () => {
      expect(getStarRatingTier(4)).toBe(2);
      expect(getStarRatingTier(4.5)).toBe(2);
      expect(getStarRatingTier(5)).toBe(2);
    });

    it("handles string rating from database", () => {
      expect(getStarRatingTier("4.2")).toBe(2);
      expect(getStarRatingTier("2")).toBe(1);
    });
  });

  describe("calculateDistance", () => {
    it("returns 0 for same point", () => {
      expect(calculateDistance(51.5, -0.1, 51.5, -0.1)).toBe(0);
    });

    it("returns positive distance between different points", () => {
      const d = calculateDistance(51.5, -0.1, 51.6, -0.1);
      expect(d).toBeGreaterThan(0);
    });

    it("distance London to Paris is roughly 344 km", () => {
      const london = { lat: 51.5074, lon: -0.1278 };
      const paris = { lat: 48.8566, lon: 2.3522 };
      const d = calculateDistance(london.lat, london.lon, paris.lat, paris.lon);
      expect(d).toBeGreaterThan(300);
      expect(d).toBeLessThan(400);
    });
  });
  describe("getStarRatingTier boundaries", () => {
    it("returns 2 for 5", () => {
      expect(getStarRatingTier(5)).toBe(2);
    });
    it("returns 0 for 1.9", () => {
      expect(getStarRatingTier(1.9)).toBe(0);
    });
  });
});
