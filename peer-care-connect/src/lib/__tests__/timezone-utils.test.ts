import { TimezoneUtils } from "@/lib/timezone-utils";

describe("timezone-utils", () => {
  describe("getCommonTimezones", () => {
    it("returns UK and common timezones", () => {
      const tz = TimezoneUtils.getCommonTimezones();
      expect(tz.length).toBeGreaterThan(0);
      expect(tz.some((t) => t.timezone === "Europe/London")).toBe(true);
      expect(tz.some((t) => t.timezone === "UTC")).toBe(true);
    });

    it("each entry has timezone, offset, displayName", () => {
      const tz = TimezoneUtils.getCommonTimezones();
      tz.forEach((t) => {
        expect(t.timezone).toBeTruthy();
        expect(t.offset).toBeTruthy();
        expect(t.displayName).toBeTruthy();
      });
    });
  });

  describe("isValidTimezone", () => {
    it("returns true for valid timezones", () => {
      expect(TimezoneUtils.isValidTimezone("Europe/London")).toBe(true);
      expect(TimezoneUtils.isValidTimezone("UTC")).toBe(true);
    });

    it("returns false for invalid timezones", () => {
      expect(TimezoneUtils.isValidTimezone("Invalid/Zone")).toBe(false);
    });
  });

  describe("convertTime", () => {
    it("returns time string in HH:MM format", () => {
      const result = TimezoneUtils.convertTime("14:00", "Europe/London", "UTC");
      expect(result).toMatch(/^\d{1,2}:\d{2}$/);
    });

    it("returns original time on invalid timezone", () => {
      const result = TimezoneUtils.convertTime("14:00", "Invalid/Zone", "UTC");
      expect(result).toBe("14:00");
    });
  });

  describe("getCurrentTimeInTimezone", () => {
    it("returns HH:MM format for valid timezone", () => {
      const result = TimezoneUtils.getCurrentTimeInTimezone("Europe/London");
      expect(result).toMatch(/^\d{1,2}:\d{2}$/);
    });

    it("returns 00:00 fallback for invalid timezone", () => {
      const result = TimezoneUtils.getCurrentTimeInTimezone("Invalid/Zone");
      expect(result).toBe("00:00");
    });
  });
  describe("getCommonTimezones structure", () => {
    it("has America/New_York", () => {
      expect(TimezoneUtils.getCommonTimezones().some((t) => t.timezone === "America/New_York")).toBe(true);
    });
  });
  describe("convertTime edge cases", () => {
    it("handles midnight", () => {
      const result = TimezoneUtils.convertTime("00:00", "UTC", "Europe/London");
      expect(result).toMatch(/^\d{1,2}:\d{2}$/);
    });
  });
});
