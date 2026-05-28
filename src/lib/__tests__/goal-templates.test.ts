import {
  GOAL_TEMPLATES,
  calculateTargetFromTemplate,
  getTargetDateFromTemplate,
  type GoalTemplate,
} from "@/lib/goal-templates";

describe("goal-templates", () => {
  describe("GOAL_TEMPLATES", () => {
    it("has expected template ids", () => {
      const ids = GOAL_TEMPLATES.map((t) => t.id);
      expect(ids).toContain("reduce-pain");
      expect(ids).toContain("improve-rom");
      expect(ids).toContain("increase-strength");
    });

    it("each template has required fields", () => {
      GOAL_TEMPLATES.forEach((t) => {
        expect(t.id).toBeTruthy();
        expect(t.name).toBeTruthy();
        expect(t.target_value_formula).toBeTruthy();
      });
    });
  });

  describe("calculateTargetFromTemplate", () => {
    it("applies multiplication formula", () => {
      const reducePain = GOAL_TEMPLATES.find((t) => t.id === "reduce-pain")!;
      expect(calculateTargetFromTemplate(reducePain, 10)).toBe(7);
    });

    it("applies addition formula", () => {
      const increaseStrength = GOAL_TEMPLATES.find((t) => t.id === "increase-strength")!;
      expect(calculateTargetFromTemplate(increaseStrength, 3)).toBe(4);
    });
  });

  describe("getTargetDateFromTemplate", () => {
    it("returns date target_date_days in future", () => {
      const template: GoalTemplate = {
        id: "test",
        name: "Test",
        description: "",
        target_value_formula: "current * 1",
        target_date_days: 7,
        metric_type_suggestions: [],
        example: "",
      };
      const result = getTargetDateFromTemplate(template);
      const expected = new Date();
      expected.setDate(expected.getDate() + 7);
      expect(result).toBe(expected.toISOString().split("T")[0]);
    });
    it("handles zero target_date_days", () => {
      const template: GoalTemplate = {
        id: "t",
        name: "T",
        description: "",
        target_value_formula: "current",
        target_date_days: 0,
        metric_type_suggestions: [],
        example: "",
      };
      const result = getTargetDateFromTemplate(template);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
  describe("calculateTargetFromTemplate edge cases", () => {
    it("handles formula with subtraction", () => {
      const improveRom = GOAL_TEMPLATES.find((t) => t.id === "improve-rom");
      if (improveRom) {
        const r = calculateTargetFromTemplate(improveRom, 5);
        expect(typeof r).toBe("number");
      }
    });
  });
});
