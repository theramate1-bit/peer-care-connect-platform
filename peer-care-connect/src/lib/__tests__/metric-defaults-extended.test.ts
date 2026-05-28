/**
 * Extended tests for metric defaults
 */
import { getDefaultMaxValue, getDefaultUnit } from "@/lib/metric-defaults";

describe("metric-defaults extended", () => {
  describe("getDefaultMaxValue", () => {
    it.each(["pain_level", "strength", "mobility", "flexibility", "function"])(
      "returns number for %s",
      (type) => {
        expect(typeof getDefaultMaxValue(type)).toBe("number");
        expect(getDefaultMaxValue(type)).toBeGreaterThan(0);
      }
    );
  });

  describe("getDefaultUnit", () => {
    it.each(["pain_level", "strength", "mobility", "flexibility", "function"])(
      "returns string for %s",
      (type) => {
        expect(typeof getDefaultUnit(type)).toBe("string");
      }
    );
  });
});
