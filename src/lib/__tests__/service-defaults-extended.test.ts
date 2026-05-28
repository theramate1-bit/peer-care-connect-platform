/**
 * Extended tests for service defaults
 */
import { SERVICE_DEFAULTS } from "@/lib/service-defaults";

describe("service-defaults extended", () => {
  const serviceKeys = ["sports_injury_assessment", "deep_tissue", "structural_osteopathy"] as const;

  describe("SERVICE_DEFAULTS", () => {
    it.each(serviceKeys)("has config for %s", (key) => {
      expect(SERVICE_DEFAULTS[key]).toBeDefined();
      expect(SERVICE_DEFAULTS[key].defaultDurationMinutes).toBeDefined();
    });
  });
});
