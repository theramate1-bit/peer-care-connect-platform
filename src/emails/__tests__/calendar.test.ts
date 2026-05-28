import { generateCalendarUrl } from "@/emails/utils/calendar";

describe("emails/utils/calendar", () => {
  describe("generateCalendarUrl", () => {
    it("returns Google Calendar URL with date range", () => {
      const url = generateCalendarUrl(
        "Sports Therapy Session",
        "60 min session",
        "2025-06-15",
        "14:00",
        60,
        "123 High St"
      );
      expect(url).toContain("https://calendar.google.com");
      expect(url).toContain("action=TEMPLATE");
      expect(url).toContain("text=");
      expect(url).toContain("dates=");
      expect(url).toContain("location=");
    });

    it("works without location", () => {
      const url = generateCalendarUrl(
        "Session",
        "Desc",
        "2025-06-15",
        "10:00",
        30
      );
      expect(url).toContain("calendar.google.com");
    });
  });
});
