/**
 * Extended tests for block time utils
 */
import { isTimeOverlapping } from "@/lib/block-time-utils";

describe("block-time extended", () => {
  describe("isTimeOverlapping edge cases", () => {
    it.each([
      [
        "block entirely before booking",
        ["2025-01-15T08:00", "2025-01-15T09:00", "2025-01-15T10:00", "2025-01-15T11:00"],
        false,
      ],
      [
        "block entirely after booking",
        ["2025-01-15T11:00", "2025-01-15T12:00", "2025-01-15T09:00", "2025-01-15T10:00"],
        false,
      ],
      [
        "block same as booking",
        ["2025-01-15T09:00", "2025-01-15T10:00", "2025-01-15T09:00", "2025-01-15T10:00"],
        true,
      ],
    ])("%s", (_label, [bs, be, bks, bke], expected) => {
      expect(
        isTimeOverlapping(
          new Date(bs),
          new Date(be),
          new Date(bks),
          new Date(bke)
        )
      ).toBe(expected);
    });
  });
});
