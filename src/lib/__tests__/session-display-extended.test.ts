/**
 * Extended tests for session display status
 */
import {
  getDisplaySessionStatus,
  getDisplaySessionStatusLabel,
  isPractitionerSessionVisible,
  isClientSessionVisible,
} from "@/lib/session-display-status";

describe("session-display extended", () => {
  describe("getDisplaySessionStatus", () => {
    it.each([
      ["completed", "completed"],
      ["cancelled", "cancelled"],
      ["declined", "declined"],
      ["expired", "expired"],
    ] as const)("%s stays %s", (status, expected) => {
      expect(getDisplaySessionStatus({ status })).toBe(expected);
    });
  });

  describe("getDisplaySessionStatusLabel", () => {
    it("formats no_show as No Show", () => {
      expect(getDisplaySessionStatusLabel({ status: "no_show" })).toBe("No Show");
    });
  });

  describe("isPractitionerSessionVisible", () => {
    it("returns true for in_progress", () => {
      expect(isPractitionerSessionVisible({ status: "in_progress" })).toBe(true);
    });
  });

  describe("isClientSessionVisible", () => {
    it("returns true for completed", () => {
      expect(isClientSessionVisible({ status: "completed" })).toBe(true);
    });
  });
});
