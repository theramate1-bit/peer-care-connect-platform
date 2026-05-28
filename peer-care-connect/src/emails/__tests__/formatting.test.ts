import {
  formatBookingReference,
  formatTimeForEmail,
} from "@/emails/utils/formatting";

describe("emails/utils/formatting", () => {
  describe("formatBookingReference", () => {
    it("returns N/A for undefined", () => {
      expect(formatBookingReference(undefined)).toBe("N/A");
    });

    it("formats session ID as THM-XXX", () => {
      expect(formatBookingReference("abc123-def456")).toBe("THM-ABC123");
    });

    it("takes first 6 chars and uppercases", () => {
      expect(formatBookingReference("xyz789-ghijkl")).toBe("THM-XYZ789");
    });
  });

  describe("formatTimeForEmail", () => {
    it("returns empty for null/undefined", () => {
      expect(formatTimeForEmail(null)).toBe("");
      expect(formatTimeForEmail(undefined)).toBe("");
    });

    it("strips seconds from HH:MM:SS", () => {
      expect(formatTimeForEmail("14:30:00")).toBe("14:30");
    });

    it("keeps HH:MM as-is", () => {
      expect(formatTimeForEmail("14:30")).toBe("14:30");
    });
    it("handles midnight", () => {
      expect(formatTimeForEmail("00:00:00")).toBe("00:00");
    });
  });
  describe("formatBookingReference edge cases", () => {
    it("handles short id", () => {
      expect(formatBookingReference("ab")).toBe("THM-AB");
    });
    it("handles null", () => {
      expect(formatBookingReference(null as any)).toBe("N/A");
    });
  });
});
