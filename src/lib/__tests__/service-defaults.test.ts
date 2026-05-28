import { SERVICE_DEFAULTS } from "@/lib/service-defaults";

describe("service-defaults", () => {
  it("has sports therapist service defaults", () => {
    expect(SERVICE_DEFAULTS["sports_injury_assessment"]).toBeDefined();
    expect(SERVICE_DEFAULTS["sports_injury_assessment"].defaultDurationMinutes).toBe(60);
    expect(SERVICE_DEFAULTS["sports_injury_assessment"].typicalDurationRange).toEqual({
      min: 45,
      max: 90,
    });
  });

  it("has massage therapist service defaults", () => {
    expect(SERVICE_DEFAULTS["deep_tissue"]).toBeDefined();
    expect(SERVICE_DEFAULTS["sports_massage"]).toBeDefined();
    expect(SERVICE_DEFAULTS["swedish_massage"]).toBeDefined();
  });

  it("each entry has value, label, defaultDurationMinutes, typicalDurationRange", () => {
    Object.values(SERVICE_DEFAULTS).forEach((s) => {
      expect(s.value).toBeTruthy();
      expect(s.label).toBeTruthy();
      expect(typeof s.defaultDurationMinutes).toBe("number");
      expect(s.typicalDurationRange.min).toBeLessThanOrEqual(s.typicalDurationRange.max);
    });
  });
});
