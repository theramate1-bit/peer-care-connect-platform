import { getDefaultMaxValue, getDefaultUnit } from "@/lib/metric-defaults";

describe("metric-defaults", () => {
  describe("getDefaultMaxValue", () => {
    it("returns 10 for pain_level", () => {
      expect(getDefaultMaxValue("pain_level")).toBe(10);
    });

    it("returns 5 for strength", () => {
      expect(getDefaultMaxValue("strength")).toBe(5);
    });

    it("returns 180 for mobility and flexibility", () => {
      expect(getDefaultMaxValue("mobility")).toBe(180);
      expect(getDefaultMaxValue("flexibility")).toBe(180);
    });

    it("returns 100 for function", () => {
      expect(getDefaultMaxValue("function")).toBe(100);
    });

    it("returns 10 for unknown type", () => {
      expect(getDefaultMaxValue("custom")).toBe(10);
      expect(getDefaultMaxValue("unknown")).toBe(10);
    });
  });

  describe("getDefaultUnit", () => {
    it("returns /10 for pain_level", () => {
      expect(getDefaultUnit("pain_level")).toBe("/10");
    });

    it("returns /5 for strength", () => {
      expect(getDefaultUnit("strength")).toBe("/5");
    });

    it("returns degrees for mobility and flexibility", () => {
      expect(getDefaultUnit("mobility")).toBe("degrees");
      expect(getDefaultUnit("flexibility")).toBe("degrees");
    });

    it("returns % for function", () => {
      expect(getDefaultUnit("function")).toBe("%");
    });

    it("returns empty for unknown type", () => {
      expect(getDefaultUnit("custom")).toBe("");
    });
  });
});
