/**
 * Extended tests for typography tokens
 */
import { typography, fontWeights, typographyClass } from "@/lib/typography-tokens";

describe("typography extended", () => {
  describe("typography", () => {
    it("has small muted", () => {
      expect(typography.small.muted).toContain("text-xs");
    });
  });

  describe("fontWeights", () => {
    it("has medium and semibold", () => {
      expect(fontWeights.medium).toBe("font-medium");
      expect(fontWeights.semibold).toBe("font-semibold");
    });
  });

  describe("typographyClass", () => {
    it("combines token with weight and className", () => {
      const c = typographyClass(typography.body.base, { weight: "bold", className: "mt-2" });
      expect(c).toContain("font-bold");
      expect(c).toContain("mt-2");
    });
  });
});
