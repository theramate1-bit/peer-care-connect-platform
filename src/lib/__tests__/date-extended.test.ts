/**
 * Extended parameterized tests for date utils
 */
import {
  parseDateSafe,
  formatDateSafe,
  formatTimeHHMM,
  formatTimeWithoutSeconds,
  getFriendlyDateLabel,
  isToday,
} from "@/lib/date";

describe("date extended", () => {
  describe("parseDateSafe valid inputs", () => {
    it.each([
      ["2025-01-01"],
      ["2025-12-31"],
      ["2024-02-29"],
    ])("parses %s correctly", (dateStr) => {
      const d = parseDateSafe(dateStr);
      expect(d.getTime()).not.toBeNaN();
    });
  });

  describe("formatTimeWithoutSeconds variants", () => {
    it.each([
      ["14:30:00", "14:30"],
      ["09:00:00", "09:00"],
      ["23:59:59", "23:59"],
      ["00:00:00", "00:00"],
    ])("%s -> %s", (input, expected) => {
      expect(formatTimeWithoutSeconds(input)).toBe(expected);
    });
  });

  describe("formatDateSafe invalid", () => {
    it("returns Invalid Date for garbage", () => {
      expect(formatDateSafe("garbage")).toBe("Invalid Date");
    });
  });

  describe("isToday with string", () => {
    it("returns false for yesterday", () => {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const str = y.getFullYear() + "-" + String(y.getMonth() + 1).padStart(2, "0") + "-" + String(y.getDate()).padStart(2, "0");
      expect(isToday(str)).toBe(false);
    });
  });

  describe("getFriendlyDateLabel format", () => {
    it("returns string for far date", () => {
      const r = getFriendlyDateLabel("2026-01-15");
      expect(typeof r).toBe("string");
      expect(r.length).toBeGreaterThan(0);
    });
  });
});
