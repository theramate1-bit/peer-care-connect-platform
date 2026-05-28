/**
 * Extended tests for email formatting
 */
import { formatBookingReference, formatTimeForEmail } from "@/emails/utils/formatting";

describe("email formatting extended", () => {
  describe("formatBookingReference", () => {
    it.each([
      ["abc-def", "THM-ABCDEF"],
      ["xyz123", "THM-XYZ123"],
    ])("%s -> %s", (id, expected) => {
      expect(formatBookingReference(id)).toBe(expected);
    });
  });

  describe("formatTimeForEmail", () => {
    it.each([
      ["09:00:00", "09:00"],
      ["12:30:00", "12:30"],
      ["00:00:00", "00:00"],
    ])("%s -> %s", (input, expected) => {
      expect(formatTimeForEmail(input)).toBe(expected);
    });
  });
});
