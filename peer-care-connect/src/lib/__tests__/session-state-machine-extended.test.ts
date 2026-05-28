/**
 * Extended tests for session-state-machine - parameterized and edge cases
 */
import {
  canTransition,
  validateTransition,
  getValidNextStatuses,
  isTerminalStatus,
  canStartSession,
  canCompleteSession,
} from "@/lib/session-state-machine";

describe("session-state-machine extended", () => {
  const allStatuses = ["scheduled", "confirmed", "in_progress", "completed", "cancelled", "no_show"] as const;

  describe("canTransition matrix", () => {
    it.each([
      ["scheduled", "confirmed", true],
      ["scheduled", "cancelled", true],
      ["scheduled", "no_show", true],
      ["scheduled", "in_progress", false],
      ["confirmed", "in_progress", true],
      ["confirmed", "cancelled", true],
      ["in_progress", "completed", true],
      ["in_progress", "cancelled", true],
      ["completed", "scheduled", false],
      ["cancelled", "scheduled", false],
    ] as const)("from %s to %s = %s", (from, to, expected) => {
      expect(canTransition(from, to)).toBe(expected);
    });
  });

  describe("getValidNextStatuses for each status", () => {
    it("scheduled has 3 next statuses", () => {
      expect(getValidNextStatuses("scheduled")).toHaveLength(3);
    });
    it("confirmed has 3 next statuses", () => {
      expect(getValidNextStatuses("confirmed")).toHaveLength(3);
    });
    it("in_progress has 2 next statuses", () => {
      expect(getValidNextStatuses("in_progress")).toHaveLength(2);
    });
    it("completed has 0 next statuses", () => {
      expect(getValidNextStatuses("completed")).toHaveLength(0);
    });
    it("cancelled has 0 next statuses", () => {
      expect(getValidNextStatuses("cancelled")).toHaveLength(0);
    });
    it("no_show has 0 next statuses", () => {
      expect(getValidNextStatuses("no_show")).toHaveLength(0);
    });
  });

  describe("canStartSession payment variants", () => {
    it("rejects when status is cancelled", () => {
      expect(canStartSession("cancelled", "paid").valid).toBe(false);
    });
    it("allows paid status for confirmed", () => {
      expect(canStartSession("confirmed", "paid").valid).toBe(true);
    });
    it("allows completed status for confirmed", () => {
      expect(canStartSession("confirmed", "completed").valid).toBe(true);
    });
  });

  describe("validateTransition with paymentStatus", () => {
    it("allows scheduled->in_progress when paymentStatus is paid", () => {
      expect(validateTransition("scheduled", "in_progress", { paymentStatus: "paid" }).valid).toBe(true);
    });
  });

  describe("getValidNextStatuses scheduled", () => {
    it("includes confirmed, cancelled, no_show", () => {
      const next = getValidNextStatuses("scheduled");
      expect(next).toContain("confirmed");
      expect(next).toContain("cancelled");
      expect(next).toContain("no_show");
    });
  });

  describe("isTerminalStatus for all statuses", () => {
    it.each(["completed", "cancelled", "no_show"])("%s is terminal", (status) => {
      expect(isTerminalStatus(status as any)).toBe(true);
    });
    it.each(["scheduled", "confirmed", "in_progress"])("%s is not terminal", (status) => {
      expect(isTerminalStatus(status as any)).toBe(false);
    });
  });
});
