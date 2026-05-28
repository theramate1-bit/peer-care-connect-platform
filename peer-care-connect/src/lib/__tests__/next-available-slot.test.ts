import { formatNextAvailableLabel } from "@/lib/next-available-slot";

describe("next-available-slot", () => {
  describe("formatNextAvailableLabel", () => {
    it("returns Today at [time] when date is today", () => {
      const today = new Date();
      const dateStr =
        today.getFullYear() +
        "-" +
        String(today.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(today.getDate()).padStart(2, "0");
      const result = formatNextAvailableLabel(dateStr, "14:00");
      expect(result).toContain("Today");
      expect(result).toMatch(/\d{1,2}:\d{2}\s*(AM|PM)/);
    });

    it("returns Tomorrow at [time] when date is tomorrow", () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr =
        tomorrow.getFullYear() +
        "-" +
        String(tomorrow.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(tomorrow.getDate()).padStart(2, "0");
      const result = formatNextAvailableLabel(dateStr, "10:00");
      expect(result).toContain("Tomorrow");
    });

    it("returns day name for other dates", () => {
      const result = formatNextAvailableLabel("2025-06-15", "09:00");
      expect(result).toMatch(/Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday/);
      expect(result).toContain("at");
    });
  });
});
