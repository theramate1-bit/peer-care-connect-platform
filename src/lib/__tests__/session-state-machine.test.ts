import {
  canTransition,
  validateTransition,
  getValidNextStatuses,
  isTerminalStatus,
  canStartSession,
  canCompleteSession,
} from "@/lib/session-state-machine";

describe("session-state-machine", () => {
  describe("canTransition", () => {
    it("allows scheduled -> confirmed, cancelled, no_show", () => {
      expect(canTransition("scheduled", "confirmed")).toBe(true);
      expect(canTransition("scheduled", "cancelled")).toBe(true);
      expect(canTransition("scheduled", "no_show")).toBe(true);
    });

    it("disallows scheduled -> in_progress by default", () => {
      expect(canTransition("scheduled", "in_progress")).toBe(false);
    });

    it("allows confirmed -> in_progress", () => {
      expect(canTransition("confirmed", "in_progress")).toBe(true);
    });

    it("disallows completed -> any", () => {
      expect(canTransition("completed", "scheduled")).toBe(false);
      expect(canTransition("completed", "cancelled")).toBe(false);
    });
  });

  describe("validateTransition", () => {
    it("allows scheduled -> in_progress for peer booking", () => {
      expect(validateTransition("scheduled", "in_progress", { isPeerBooking: true })).toEqual({
        valid: true,
      });
    });

    it("allows scheduled -> in_progress when payment completed", () => {
      expect(validateTransition("scheduled", "in_progress", { paymentStatus: "completed" })).toEqual({
        valid: true,
      });
    });

    it("rejects invalid transition with error message", () => {
      const r = validateTransition("completed", "scheduled");
      expect(r.valid).toBe(false);
      expect(r.error).toContain("Invalid transition");
    });
  });

  describe("getValidNextStatuses", () => {
    it("returns next statuses for scheduled", () => {
      expect(getValidNextStatuses("scheduled")).toEqual(["confirmed", "cancelled", "no_show"]);
    });

    it("returns empty for terminal statuses", () => {
      expect(getValidNextStatuses("completed")).toEqual([]);
      expect(getValidNextStatuses("cancelled")).toEqual([]);
    });
  });

  describe("isTerminalStatus", () => {
    it("returns true for completed, cancelled, no_show", () => {
      expect(isTerminalStatus("completed")).toBe(true);
      expect(isTerminalStatus("cancelled")).toBe(true);
      expect(isTerminalStatus("no_show")).toBe(true);
    });

    it("returns false for scheduled, confirmed, in_progress", () => {
      expect(isTerminalStatus("scheduled")).toBe(false);
      expect(isTerminalStatus("in_progress")).toBe(false);
    });
  });

  describe("canStartSession", () => {
    it("requires scheduled or confirmed status", () => {
      expect(canStartSession("scheduled", "completed").valid).toBe(true);
      expect(canStartSession("completed", "completed").valid).toBe(false);
    });

    it("requires payment completed unless peer booking or free", () => {
      expect(canStartSession("scheduled", "pending").valid).toBe(false);
      expect(canStartSession("scheduled", "pending", { isPeerBooking: true }).valid).toBe(true);
      expect(canStartSession("scheduled", "pending", { price: 0 }).valid).toBe(true);
    });
  });

  describe("canCompleteSession", () => {
    it("requires in_progress status", () => {
      expect(canCompleteSession("in_progress", "paid").valid).toBe(true);
      expect(canCompleteSession("scheduled", "paid").valid).toBe(false);
    });
    it("allows completion regardless of payment status", () => {
      expect(canCompleteSession("in_progress", "pending").valid).toBe(true);
    });
  });

  describe("validateTransition all valid paths", () => {
    it("scheduled -> confirmed", () => {
      expect(validateTransition("scheduled", "confirmed").valid).toBe(true);
    });
    it("scheduled -> cancelled", () => {
      expect(validateTransition("scheduled", "cancelled").valid).toBe(true);
    });
    it("confirmed -> in_progress", () => {
      expect(validateTransition("confirmed", "in_progress").valid).toBe(true);
    });
    it("in_progress -> completed", () => {
      expect(validateTransition("in_progress", "completed").valid).toBe(true);
    });
  });

  describe("canStartSession payment", () => {
    it("allows paid status", () => {
      expect(canStartSession("confirmed", "paid").valid).toBe(true);
    });
  });
});
