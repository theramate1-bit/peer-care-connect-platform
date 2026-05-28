jest.mock("@/lib/logger", () => ({
  logger: { warn: jest.fn(), debug: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

import {
  isTimeOverlapping,
  isTimeSlotBlocked,
  type BlockedTime,
} from "@/lib/block-time-utils";

describe("block-time-utils", () => {
  describe("isTimeOverlapping", () => {
    it("returns true when ranges overlap (booking starts during block)", () => {
      const blockStart = new Date("2025-01-15T09:00:00");
      const blockEnd = new Date("2025-01-15T10:00:00");
      const bookingStart = new Date("2025-01-15T09:30:00");
      const bookingEnd = new Date("2025-01-15T10:30:00");
      expect(isTimeOverlapping(blockStart, blockEnd, bookingStart, bookingEnd)).toBe(true);
    });

    it("returns true when block is fully inside booking", () => {
      const blockStart = new Date("2025-01-15T09:30:00");
      const blockEnd = new Date("2025-01-15T10:00:00");
      const bookingStart = new Date("2025-01-15T09:00:00");
      const bookingEnd = new Date("2025-01-15T11:00:00");
      expect(isTimeOverlapping(blockStart, blockEnd, bookingStart, bookingEnd)).toBe(true);
    });

    it("returns false when booking ends before block starts", () => {
      const blockStart = new Date("2025-01-15T10:00:00");
      const blockEnd = new Date("2025-01-15T11:00:00");
      const bookingStart = new Date("2025-01-15T09:00:00");
      const bookingEnd = new Date("2025-01-15T10:00:00");
      expect(isTimeOverlapping(blockStart, blockEnd, bookingStart, bookingEnd)).toBe(false);
    });

    it("returns false when booking starts after block ends", () => {
      const blockStart = new Date("2025-01-15T09:00:00");
      const blockEnd = new Date("2025-01-15T10:00:00");
      const bookingStart = new Date("2025-01-15T10:00:00");
      const bookingEnd = new Date("2025-01-15T11:00:00");
      expect(isTimeOverlapping(blockStart, blockEnd, bookingStart, bookingEnd)).toBe(false);
    });

    it("returns true when booking touches block at boundary (exclusive end)", () => {
      const blockStart = new Date("2025-01-15T09:00:00");
      const blockEnd = new Date("2025-01-15T10:00:00");
      const bookingStart = new Date("2025-01-15T09:30:00");
      const bookingEnd = new Date("2025-01-15T10:00:00");
      expect(isTimeOverlapping(blockStart, blockEnd, bookingStart, bookingEnd)).toBe(true);
    });
  });

  describe("isTimeSlotBlocked", () => {
    const baseBlock: BlockedTime = {
      id: "b1",
      user_id: "u1",
      start_time: "2025-01-15T09:00:00.000Z",
      end_time: "2025-01-15T10:00:00.000Z",
      event_type: "block",
      title: "Test Block",
    };

    it("returns false when no blocks", () => {
      expect(isTimeSlotBlocked("10:00", 60, [], "2025-01-15")).toBe(false);
    });

    it("returns false when blocks is null", () => {
      expect(isTimeSlotBlocked("10:00", 60, null as any, "2025-01-15")).toBe(false);
    });

    it("returns false when slot does not overlap block", () => {
      const blocks: BlockedTime[] = [
        { ...baseBlock, start_time: "2025-01-15T09:00:00.000Z", end_time: "2025-01-15T09:30:00.000Z" },
      ];
      expect(isTimeSlotBlocked("10:00", 60, blocks, "2025-01-15")).toBe(false);
    });

    it("returns true when slot overlaps block", () => {
      const blocks: BlockedTime[] = [
        { ...baseBlock, start_time: "2025-01-15T09:00:00.000Z", end_time: "2025-01-15T10:30:00.000Z" },
      ];
      expect(isTimeSlotBlocked("10:00", 60, blocks, "2025-01-15")).toBe(true);
    });

    it("returns false for invalid slot time", () => {
      expect(isTimeSlotBlocked("25:00", 60, [baseBlock], "2025-01-15")).toBe(false);
      expect(isTimeSlotBlocked("10:99", 60, [baseBlock], "2025-01-15")).toBe(false);
    });

    it("returns false for invalid session date", () => {
      expect(isTimeSlotBlocked("10:00", 60, [baseBlock], "invalid")).toBe(false);
      expect(isTimeSlotBlocked("10:00", 60, [baseBlock], "")).toBe(false);
    });
  });
});
