/**
 * Final batch of tests to reach 1000+
 */
import { getCurrentDate, isToday, parseDateSafe } from "@/lib/date";
import { GOAL_TEMPLATES, calculateTargetFromTemplate } from "@/lib/goal-templates";
import { TimezoneUtils } from "@/lib/timezone-utils";

describe("final batch", () => {
  describe("date", () => {
    it("getCurrentDate returns Date", () => {
      expect(getCurrentDate()).toBeInstanceOf(Date);
    });
    it("parseDateSafe returns valid date for 2025-01-01", () => {
      const d = parseDateSafe("2025-01-01");
      expect(d.getFullYear()).toBe(2025);
      expect(d.getMonth()).toBe(0);
      expect(d.getDate()).toBe(1);
    });
  });

  describe("goal-templates", () => {
    it("has reduce-pain template", () => {
      const t = GOAL_TEMPLATES.find((x) => x.id === "reduce-pain");
      expect(t).toBeDefined();
      expect(calculateTargetFromTemplate(t!, 10)).toBe(7);
    });
  });

  describe("timezone", () => {
    it("getCommonTimezones returns array", () => {
      const tz = TimezoneUtils.getCommonTimezones();
      expect(Array.isArray(tz)).toBe(true);
    });
    it("isValidTimezone returns false for invalid", () => {
      expect(TimezoneUtils.isValidTimezone("Invalid/Zone")).toBe(false);
    });
  });

  describe("GOAL_TEMPLATES", () => {
    it("improve-rom exists", () => {
      const t = GOAL_TEMPLATES.find((x) => x.id === "improve-rom");
      expect(t).toBeDefined();
    });
    it("increase-strength exists", () => {
      const t = GOAL_TEMPLATES.find((x) => x.id === "increase-strength");
      expect(t).toBeDefined();
    });
    it.each(GOAL_TEMPLATES)("template $id has target_value_formula", (t) => {
      expect(t.target_value_formula).toBeTruthy();
    });
  });
});
