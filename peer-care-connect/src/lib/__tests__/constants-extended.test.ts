/**
 * Extended tests for constants
 */
import { PAIN_AREAS, JOINTS, MOVEMENTS, STRENGTH_GRADES } from "@/lib/constants";

describe("constants extended", () => {
  describe("PAIN_AREAS", () => {
    it.each(["Head", "Neck", "Knee", "Foot", "Hand"])("contains %s", (area) => {
      expect(PAIN_AREAS).toContain(area);
    });
  });

  describe("JOINTS", () => {
    it.each(["Shoulder", "Elbow", "Wrist", "Hip", "Ankle"])("contains %s", (joint) => {
      expect(JOINTS).toContain(joint);
    });
  });

  describe("MOVEMENTS", () => {
    it("Knee has Flexion and Extension", () => {
      expect(MOVEMENTS["Knee"]).toContain("Flexion");
      expect(MOVEMENTS["Knee"]).toContain("Extension");
    });
  });

  describe("STRENGTH_GRADES", () => {
    it("has 8 grades", () => {
      expect(STRENGTH_GRADES).toHaveLength(8);
    });
    it.each(STRENGTH_GRADES)("grade $value has label", (g) => {
      expect(g.label).toBeTruthy();
      expect(g.value).toBeTruthy();
    });
  });
});
