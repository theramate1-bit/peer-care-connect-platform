/**
 * Extended tests for cancellation policy (pure functions)
 */
import {
  CancellationPolicyService,
  type CancellationPolicy,
} from "@/lib/cancellation-policy";

describe("cancellation-policy extended", () => {
  const defaultPolicy: CancellationPolicy = {
    advance_notice_hours: 24,
    full_refund_hours: 24,
    partial_refund_hours: 12,
    partial_refund_percent: 50,
    no_refund_hours: 12,
  };

  describe("formatPolicy", () => {
    it("formats policy with 24h full refund", () => {
      const formatted = CancellationPolicyService.formatPolicy(defaultPolicy);
      expect(formatted).toContain("Full refund");
      expect(formatted).toContain("No refund");
    });
  });

  describe("getPolicySummary", () => {
    it("returns non-empty string", () => {
      const summary = CancellationPolicyService.getPolicySummary(defaultPolicy);
      expect(summary.length).toBeGreaterThan(0);
      expect(summary).toContain("refund");
    });
  });
});
