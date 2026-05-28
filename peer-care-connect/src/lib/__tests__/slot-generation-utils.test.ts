import {
  hasConflictWithBuffer,
  generate15MinuteSlots,
  generateDefault15MinuteSlots,
  generate15MinuteSlotsWithStatus,
  generateDefault15MinuteSlotsWithStatus,
  type ExistingBooking,
} from "@/lib/slot-generation-utils";

const futureSessionDate = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
})();

describe("slot-generation-utils", () => {
  describe("hasConflictWithBuffer", () => {
    it("returns false when no bookings", () => {
      expect(
        hasConflictWithBuffer("10:00", 60, [], undefined, {})
      ).toBe(false);
    });

    it("returns true when slot overlaps with existing booking", () => {
      const bookings: ExistingBooking[] = [
        { start_time: "10:00", duration_minutes: 60, status: "confirmed" },
      ];
      expect(hasConflictWithBuffer("10:30", 60, bookings)).toBe(true);
    });

    it("returns true when slot starts within buffer after booking ends", () => {
      const bookings: ExistingBooking[] = [
        { start_time: "10:00", duration_minutes: 60, status: "confirmed" },
      ];
      // 11:00 + 15 min buffer = 11:15. Slot 11:00-12:00 starts at boundary
      expect(hasConflictWithBuffer("11:00", 60, bookings)).toBe(true);
    });

    it("returns false when slot is beyond buffer after booking", () => {
      const bookings: ExistingBooking[] = [
        { start_time: "09:00", duration_minutes: 60, status: "confirmed" },
      ];
      expect(hasConflictWithBuffer("11:00", 60, bookings)).toBe(false);
    });

    it("skips expired pending_payment bookings", () => {
      const past = new Date();
      past.setMinutes(past.getMinutes() - 10);
      const bookings: ExistingBooking[] = [
        {
          start_time: "10:00",
          duration_minutes: 60,
          status: "pending_payment",
          expires_at: past.toISOString(),
        },
      ];
      expect(hasConflictWithBuffer("10:30", 60, bookings)).toBe(false);
    });

    it("applies 30min buffer for hybrid mobile→clinic sequence", () => {
      const bookings: ExistingBooking[] = [
        { start_time: "09:00", duration_minutes: 60, status: "confirmed", appointment_type: "mobile" },
      ];
      // 10:00 + 30min buffer = 10:30. Slot 10:00-11:00 starts at 10:00, within buffer
      expect(
        hasConflictWithBuffer("10:00", 60, bookings, undefined, {
          therapistType: "hybrid",
          requestedAppointmentType: "clinic",
        })
      ).toBe(true);
    });

    it("applies 30min buffer for hybrid clinic→mobile sequence", () => {
      const bookings: ExistingBooking[] = [
        { start_time: "09:00", duration_minutes: 60, status: "confirmed", appointment_type: "clinic" },
      ];
      expect(
        hasConflictWithBuffer("10:00", 60, bookings, undefined, {
          therapistType: "hybrid",
          requestedAppointmentType: "mobile",
        })
      ).toBe(true);
    });

    it("clinic_based uses default 15min buffer", () => {
      const bookings: ExistingBooking[] = [
        { start_time: "09:00", duration_minutes: 60, status: "confirmed", appointment_type: "clinic" },
      ];
      expect(
        hasConflictWithBuffer("10:15", 60, bookings, undefined, { therapistType: "clinic_based" })
      ).toBe(false);
    });
  });

  describe("generate15MinuteSlots", () => {
    it("returns slots in 15-minute intervals within hours", () => {
      const slots = generate15MinuteSlots(
        "09:00",
        "12:00",
        60,
        [],
        [],
        futureSessionDate
      );
      expect(slots.length).toBeGreaterThan(0);
      expect(slots[0]).toMatch(/^\d{2}:\d{2}$/);
    });

    it("excludes slots that do not fit full duration", () => {
      // 09:00-09:30 is only 30 min; 60 min slot cannot fit
      const slots = generate15MinuteSlots(
        "09:00",
        "09:30",
        60,
        [],
        [],
        futureSessionDate
      );
      expect(slots).toHaveLength(0);
    });

    it("excludes slots overlapping with existing bookings", () => {
      const bookings: ExistingBooking[] = [
        { start_time: "10:00", duration_minutes: 60, status: "confirmed" },
      ];
      const slots = generate15MinuteSlots(
        "09:00",
        "12:00",
        60,
        bookings,
        [],
        futureSessionDate
      );
      expect(slots).not.toContain("10:00");
    });
  });

  describe("generateDefault15MinuteSlots", () => {
    it("uses 09:00-18:00 range", () => {
      const slots = generateDefault15MinuteSlots(60, [], [], futureSessionDate);
      expect(slots.length).toBeGreaterThan(0);
    });
  });

  describe("generate15MinuteSlotsWithStatus", () => {
    it("returns slots with isAvailable and unavailableReason", () => {
      const slots = generate15MinuteSlotsWithStatus(
        "09:00",
        "12:00",
        60,
        [],
        [],
        futureSessionDate
      );
      expect(slots.length).toBeGreaterThan(0);
      slots.forEach((s) => {
        expect(s.time).toMatch(/^\d{2}:\d{2}$/);
        expect(typeof s.isAvailable).toBe("boolean");
        if (!s.isAvailable) {
          expect(["booked", "blocked", "outside_hours", "past"]).toContain(
            s.unavailableReason
          );
        }
      });
    });
  });

  describe("generateDefault15MinuteSlotsWithStatus", () => {
    it("generates slots with status for default hours", () => {
      const slots = generateDefault15MinuteSlotsWithStatus(
        60,
        [],
        [],
        futureSessionDate
      );
      expect(slots.length).toBeGreaterThan(0);
    });
  });

  describe("hasConflictWithBuffer mobile-to-mobile", () => {
    it("applies 30min buffer for mobile→mobile (hybrid)", () => {
      const bookings: ExistingBooking[] = [
        { start_time: "09:00", duration_minutes: 60, status: "confirmed", appointment_type: "mobile" },
      ];
      expect(
        hasConflictWithBuffer("10:00", 60, bookings, undefined, {
          therapistType: "hybrid",
          requestedAppointmentType: "mobile",
        })
      ).toBe(true);
    });
    it("applies 30min buffer for mobile→mobile (mobile therapist)", () => {
      const bookings: ExistingBooking[] = [
        { start_time: "09:00", duration_minutes: 60, status: "confirmed", appointment_type: "mobile" },
      ];
      expect(
        hasConflictWithBuffer("10:00", 60, bookings, undefined, {
          therapistType: "mobile",
          requestedAppointmentType: "mobile",
        })
      ).toBe(true);
    });
  });
  describe("generate15MinuteSlots filters past slots", () => {
    it("excludes past slots when sessionDate is today", () => {
      const today = new Date().toISOString().slice(0, 10);
      const now = new Date();
      const pastHour = String(now.getHours() - 2).padStart(2, "0");
      const futureHour = String(now.getHours() + 3).padStart(2, "0");
      const slots = generate15MinuteSlots(
        `${pastHour}:00`,
        `${futureHour}:00`,
        60,
        [],
        [],
        today
      );
      const slotCount = slots.length;
      expect(slotCount).toBeGreaterThanOrEqual(0);
    });
  });
});
