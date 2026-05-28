import {
  PAIN_AREAS,
  JOINTS,
  STRENGTH_GRADES,
  STRENGTH_VALUE_MAP,
  MOVEMENTS,
} from "@/lib/constants";

describe("constants", () => {
  describe("PAIN_AREAS", () => {
    it("contains expected body regions", () => {
      expect(PAIN_AREAS).toContain("Head");
      expect(PAIN_AREAS).toContain("Neck");
      expect(PAIN_AREAS).toContain("Shoulder");
      expect(PAIN_AREAS).toContain("Lower Back");
      expect(PAIN_AREAS).toContain("Knee");
    });
    it("is a non-empty array", () => {
      expect(PAIN_AREAS.length).toBeGreaterThan(0);
    });
  });

  describe("JOINTS", () => {
    it("contains spine variants", () => {
      expect(JOINTS).toContain("Spine (Lumbar)");
      expect(JOINTS).toContain("Spine (Thoracic)");
    });
    it("is a non-empty array", () => {
      expect(JOINTS.length).toBeGreaterThan(0);
    });
  });

  describe("STRENGTH_GRADES", () => {
    it("has grades 0-5", () => {
      const values = STRENGTH_GRADES.map((g) => g.value);
      expect(values).toContain("0");
      expect(values).toContain("5");
    });
  });

  describe("STRENGTH_VALUE_MAP", () => {
    it("maps string grades to numbers", () => {
      expect(STRENGTH_VALUE_MAP["0"]).toBe(0);
      expect(STRENGTH_VALUE_MAP["5"]).toBe(5);
    });
    it("handles intermediate grades", () => {
      expect(STRENGTH_VALUE_MAP["4-"]).toBe(3.5);
      expect(STRENGTH_VALUE_MAP["4+"]).toBe(4.5);
    });
  });

  describe("MOVEMENTS", () => {
    it("has movements for each joint", () => {
      expect(MOVEMENTS["Shoulder"]).toBeDefined();
      expect(MOVEMENTS["Knee"]).toContain("Flexion");
    });
    it("JOINTS keys exist in MOVEMENTS", () => {
      JOINTS.forEach((joint) => {
        expect(MOVEMENTS[joint]).toBeDefined();
        expect(Array.isArray(MOVEMENTS[joint])).toBe(true);
      });
    });
  });
  describe("STRENGTH_VALUE_MAP", () => {
    it("covers all STRENGTH_GRADES values", () => {
      STRENGTH_GRADES.forEach((g) => {
        expect(STRENGTH_VALUE_MAP[g.value]).toBeDefined();
      });
    });
  });
  describe("PAIN_AREAS", () => {
    it("has no duplicates", () => {
      const set = new Set(PAIN_AREAS);
      expect(set.size).toBe(PAIN_AREAS.length);
    });
  });
});
