/**
 * Tests for CancellationPolicyService
 * Uses mocked Supabase to test fallback default policy
 */

jest.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: jest.fn(),
  },
}));

import { CancellationPolicyService, type CancellationPolicy } from "@/lib/cancellation-policy";
import { supabase } from "@/integrations/supabase/client";

const mockRpc = supabase.rpc as jest.Mock;

describe("CancellationPolicyService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getPolicy", () => {
    it("returns default policy when RPC fails with PGRST202", async () => {
      mockRpc.mockRejectedValue({ code: "PGRST202" });

      const policy = await CancellationPolicyService.getPolicy("practitioner-1");

      expect(policy).toEqual({
        advance_notice_hours: 24,
        full_refund_hours: 24,
        partial_refund_hours: 12,
        partial_refund_percent: 50,
        no_refund_hours: 12,
      });
    });

    it("returns custom policy when RPC succeeds", async () => {
      const customPolicy: CancellationPolicy = {
        advance_notice_hours: 48,
        full_refund_hours: 48,
        partial_refund_hours: 24,
        partial_refund_percent: 50,
        no_refund_hours: 12,
      };
      mockRpc.mockResolvedValue({ data: [customPolicy], error: null });

      const policy = await CancellationPolicyService.getPolicy("practitioner-1");

      expect(policy).toEqual(customPolicy);
      expect(mockRpc).toHaveBeenCalledWith("get_cancellation_policy", {
        p_practitioner_id: "practitioner-1",
      });
    });

    it("returns default policy when RPC returns empty array", async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      const policy = await CancellationPolicyService.getPolicy("practitioner-1");

      expect(policy.full_refund_hours).toBe(24);
      expect(policy.partial_refund_percent).toBe(50);
    });
  });
});
