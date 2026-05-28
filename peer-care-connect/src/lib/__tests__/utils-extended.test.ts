/**
 * Extended tests for utils (cn, formatCurrency)
 */
import { cn, formatCurrency } from "@/lib/utils";

describe("utils extended", () => {
  describe("cn", () => {
    it("handles undefined", () => {
      expect(cn("a", undefined, "b")).toBe("a b");
    });
    it("handles null", () => {
      expect(cn("a", null, "b")).toBe("a b");
    });
  });

  describe("formatCurrency", () => {
    it.each([
      [0],
      [100],
      [1000],
      [9999],
    ])("formats %s pence as string with £", (pence) => {
      const result = formatCurrency(pence);
      expect(result).toContain("£");
      expect(typeof result).toBe("string");
    });
  });
});
