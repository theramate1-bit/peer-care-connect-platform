/**
 * Additional email formatting tests
 */
import { formatBookingReference, formatTimeForEmail } from "@/emails/utils/formatting";

describe("emails formatting batch", () => {
  describe("formatBookingReference", () => {
    it.each([
      ["abc123-def456", "THM-ABC123"],
      ["short", "THM-SHORT"],
      ["123456789", "THM-123456"],
    ])("%s formats to %s", (input, expected) => {
      expect(formatBookingReference(input)).toBe(expected);
    });
  });
  describe("formatTimeForEmail", () => {
    it("handles HH:MM without seconds", () => {
      expect(formatTimeForEmail("14:30")).toBe("14:30");
    });
    it("handles HH:MM:SS", () => {
      expect(formatTimeForEmail("09:15:00")).toBe("09:15");
    });
  });
});
