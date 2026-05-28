/**
 * Format utility tests
 */
import { cn, formatCurrency } from "@/lib/utils";

describe("utils format", () => {
  describe("cn", () => {
    it("merges two classes", () => {
      expect(cn("a", "b")).toBe("a b");
    });
    it("later wins for conflicting tailwind", () => {
      expect(cn("p-2", "p-4")).toBe("p-4");
    });
    it("filters falsy", () => {
      expect(cn("a", false, "b")).not.toContain("false");
      expect(cn("a", false, "b")).toContain("a");
    });
  });

  describe("formatCurrency", () => {
    it.each([0, 10, 99.99])("%s formats with £", (value) => {
      const r = formatCurrency(value);
      expect(r).toContain("£");
      expect(typeof r).toBe("string");
    });
  });
});
