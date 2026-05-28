/**
 * Extended tests for slot generation
 */
import {
  generate15MinuteSlots,
  generate15MinuteSlotsWithStatus,
  hasConflictWithBuffer,
  type ExistingBooking,
} from "@/lib/slot-generation-utils";

const futureDate = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
})();

describe("slot-generation extended", () => {
  describe("generate15MinuteSlots", () => {
    it("returns 15-min spaced slots", () => {
      const slots = generate15MinuteSlots("09:00", "10:00", 30, [], [], futureDate);
      expect(slots.length).toBeGreaterThan(0);
      slots.forEach((s) => expect(s).toMatch(/^\d{2}:\d{2}$/));
    });

    it("excludes overlapping bookings", () => {
      const bookings: ExistingBooking[] = [
        { start_time: "09:30", duration_minutes: 60, status: "confirmed" },
      ];
      const slots = generate15MinuteSlots("09:00", "11:00", 30, bookings, [], futureDate);
      expect(slots).not.toContain("09:30");
    });
  });

  describe("hasConflictWithBuffer", () => {
    it("returns false when slot is after buffer", () => {
      const bookings: ExistingBooking[] = [
        { start_time: "08:00", duration_minutes: 60, status: "confirmed" },
      ];
      expect(hasConflictWithBuffer("10:00", 60, bookings)).toBe(false);
    });
    it("returns true when slot overlaps by 1 minute", () => {
      const bookings: ExistingBooking[] = [
        { start_time: "10:00", duration_minutes: 60, status: "confirmed" },
      ];
      expect(hasConflictWithBuffer("10:59", 60, bookings)).toBe(true);
    });
  });
  describe("generate15MinuteSlotsWithStatus", () => {
    it("marks slots with unavailableReason when booked", () => {
      const bookings: ExistingBooking[] = [
        { start_time: "10:00", duration_minutes: 60, status: "confirmed" },
      ];
      const slots = generate15MinuteSlotsWithStatus(
        "09:00",
        "12:00",
        30,
        bookings,
        [],
        futureDate
      );
      const bookedSlots = slots.filter((s) => !s.isAvailable && s.unavailableReason === "booked");
      expect(bookedSlots.length).toBeGreaterThan(0);
    });
  });
});
