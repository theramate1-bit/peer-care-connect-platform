import { cn, formatCurrency } from "../utils";

describe("utils", () => {
  describe("cn", () => {
    it("merges class names correctly", () => {
      expect(cn("foo", "bar")).toBe("foo bar");
      expect(cn("px-2", "py-1")).toBe("px-2 py-1");
    });

    it("handles conditional classes", () => {
      expect(cn("base", false && "hidden", true && "block")).toBe("base block");
    });

    it("handles tailwind merge (later wins)", () => {
      expect(cn("p-4", "p-2")).toBe("p-2");
    });

    it("returns empty string for no input", () => {
      expect(cn()).toBe("");
    });
  });

  describe("formatCurrency", () => {
    it("formats GBP correctly", () => {
      expect(formatCurrency(0)).toMatch(/£0\.00/);
      expect(formatCurrency(10.5)).toMatch(/£10\.50/);
      expect(formatCurrency(1234.56)).toMatch(/£1[, ]?234\.56/);
    });

    it("handles negative amounts", () => {
      expect(formatCurrency(-5.99)).toMatch(/-?£5\.99/);
    });
  });
});
