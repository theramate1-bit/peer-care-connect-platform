import {
  parseDateSafe,
  getFriendlyDateLabel,
  formatDateSafe,
  formatTimeHHMM,
  formatTimeWithoutSeconds,
  getCurrentDate,
  isToday,
} from "../date";

describe("date", () => {
  describe("parseDateSafe", () => {
    it("parses YYYY-MM-DD as local date without timezone shift", () => {
      const d = parseDateSafe("2025-06-15");
      expect(d.getFullYear()).toBe(2025);
      expect(d.getMonth()).toBe(5);
      expect(d.getDate()).toBe(15);
    });

    it("parses datetime strings with standard parsing", () => {
      const d = parseDateSafe("2025-06-15T14:30:00Z");
      expect(d.getFullYear()).toBe(2025);
    });
  });

  describe("getFriendlyDateLabel", () => {
    it("returns Today for today's date", () => {
      const today = new Date();
      const todayStr =
        today.getFullYear() +
        "-" +
        String(today.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(today.getDate()).padStart(2, "0");
      expect(getFriendlyDateLabel(todayStr)).toBe("Today");
    });

    it("returns Tomorrow for tomorrow's date", () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr =
        tomorrow.getFullYear() +
        "-" +
        String(tomorrow.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(tomorrow.getDate()).padStart(2, "0");
      expect(getFriendlyDateLabel(tomorrowStr)).toBe("Tomorrow");
    });

    it("returns formatted date for other dates", () => {
      expect(getFriendlyDateLabel("2025-06-15")).toMatch(/\w+.*15/);
    });
  });

  describe("formatDateSafe", () => {
    it("formats date in long format by default", () => {
      const result = formatDateSafe("2025-06-15");
      expect(result).toContain("2025");
      expect(result).toMatch(/June|Jun/);
      expect(result).toContain("15");
    });

    it("returns Invalid Date string when input cannot be parsed (no throw)", () => {
      expect(formatDateSafe("invalid")).toBe("Invalid Date");
    });
  });

  describe("formatTimeHHMM", () => {
    it("formats time correctly", () => {
      expect(formatTimeHHMM("14:30")).toMatch(/\d{1,2}:\d{2}/);
    });

    it("returns Invalid Date string when time cannot be parsed (no throw)", () => {
      expect(formatTimeHHMM("invalid")).toBe("Invalid Date");
    });
  });

  describe("formatTimeWithoutSeconds", () => {
    it("strips seconds from HH:MM:SS", () => {
      expect(formatTimeWithoutSeconds("14:30:00")).toBe("14:30");
    });

    it("keeps HH:MM as-is", () => {
      expect(formatTimeWithoutSeconds("14:30")).toBe("14:30");
    });

    it("returns empty for null/undefined", () => {
      expect(formatTimeWithoutSeconds(null)).toBe("");
      expect(formatTimeWithoutSeconds(undefined)).toBe("");
    });
  });

  describe("getCurrentDate", () => {
    it("returns date at midnight local", () => {
      const d = getCurrentDate();
      expect(d.getHours()).toBe(0);
      expect(d.getMinutes()).toBe(0);
      expect(d.getSeconds()).toBe(0);
    });
  });

  describe("formatDateSafe formats", () => {
    it("uses short format when specified", () => {
      const result = formatDateSafe("2025-06-15", "short");
      expect(result).toContain("15");
      expect(result).not.toContain("Invalid");
    });
    it("uses full format when specified", () => {
      const result = formatDateSafe("2025-06-15", "full");
      expect(result).toMatch(/\w+/);
    });
  });

  describe("parseDateSafe edge cases", () => {
    it("handles single-digit month and day", () => {
      const d = parseDateSafe("2025-01-05");
      expect(d.getFullYear()).toBe(2025);
      expect(d.getMonth()).toBe(0);
      expect(d.getDate()).toBe(5);
    });
  });

  describe("isToday", () => {
    it("returns true for today", () => {
      const today = new Date();
      expect(isToday(today)).toBe(true);
      const todayStr = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, "0") + "-" + String(today.getDate()).padStart(2, "0");
      expect(isToday(todayStr)).toBe(true);
    });

    it("returns false for yesterday", () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isToday(yesterday)).toBe(false);
    });
  });
});
