import { typography, fontWeights, typographyClass } from "@/lib/typography-tokens";

describe("typography-tokens", () => {
  describe("typography", () => {
    it("has display sizes", () => {
      expect(typography.display.large).toContain("text-6xl");
      expect(typography.display.medium).toContain("text-5xl");
      expect(typography.display.small).toContain("text-4xl");
    });

    it("has heading levels", () => {
      expect(typography.heading.h1).toContain("text-3xl");
      expect(typography.heading.h2).toContain("text-2xl");
      expect(typography.heading.h3).toContain("text-xl");
    });

    it("has body sizes", () => {
      expect(typography.body.large).toContain("text-lg");
      expect(typography.body.base).toContain("text-base");
      expect(typography.body.small).toContain("text-sm");
    });
  });

  describe("fontWeights", () => {
    it("has weight tokens", () => {
      expect(fontWeights.normal).toBe("font-normal");
      expect(fontWeights.bold).toBe("font-bold");
    });
  });

  describe("typographyClass", () => {
    it("returns token when no opts", () => {
      expect(typographyClass(typography.heading.h1)).toBe(typography.heading.h1);
    });

    it("appends weight when provided", () => {
      const out = typographyClass(typography.body.base, { weight: "bold" });
      expect(out).toContain("font-bold");
    });

    it("appends className when provided", () => {
      const out = typographyClass(typography.body.base, { className: "mt-4" });
      expect(out).toContain("mt-4");
    });
  });
});
