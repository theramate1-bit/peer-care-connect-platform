import {
  ratingTier,
  type SendExchangeRequestInput,
} from "@/lib/api/treatmentExchangeDiscovery";
import { formatExchangeConflictMessage } from "@/lib/api/practitionerExchange";

jest.mock("@/lib/supabase", () => ({
  supabase: {
    rpc: jest.fn(),
    from: jest.fn(),
  },
}));

jest.mock("@/lib/api/credits", () => ({
  fetchMyCredits: jest.fn(),
}));

import { supabase } from "@/lib/supabase";
import { fetchMyCredits } from "@/lib/api/credits";
import { sendTreatmentExchangeRequest } from "@/lib/api/treatmentExchangeDiscovery";

const mockRpc = supabase.rpc as jest.Mock;
const mockFetchMyCredits = fetchMyCredits as jest.Mock;

describe("formatExchangeConflictMessage", () => {
  it("maps booking conflicts to friendly copy", () => {
    expect(
      formatExchangeConflictMessage(
        "CONFLICT_BOOKING: This time slot is already booked.",
      ),
    ).toMatch(/already booked/i);
  });

  it("maps blocked diary to friendly copy", () => {
    expect(formatExchangeConflictMessage("CONFLICT_BLOCKED: blocked")).toMatch(
      /blocked/i,
    );
  });

  it("maps hold and pending exchange conflicts", () => {
    expect(formatExchangeConflictMessage("CONFLICT_HOLD: held")).toMatch(
      /held/i,
    );
    expect(
      formatExchangeConflictMessage("CONFLICT_EXCHANGE_PENDING: pending"),
    ).toMatch(/pending/i);
  });
});

describe("ratingTier", () => {
  it("maps null/under 2 to tier 0", () => {
    expect(ratingTier(null)).toBe(0);
    expect(ratingTier(0)).toBe(0);
    expect(ratingTier(1.9)).toBe(0);
  });

  it("maps 2–3.99 to tier 1", () => {
    expect(ratingTier(2)).toBe(1);
    expect(ratingTier(3.5)).toBe(1);
  });

  it("maps 4+ to tier 2", () => {
    expect(ratingTier(4)).toBe(2);
    expect(ratingTier(5)).toBe(2);
  });
});

describe("sendTreatmentExchangeRequest", () => {
  const baseInput: SendExchangeRequestInput = {
    requesterId: "req-1",
    recipientUserId: "rec-1",
    sessionDate: "2026-06-01",
    startTime: "10:00",
    durationMinutes: 60,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fails fast when credits are insufficient", async () => {
    mockFetchMyCredits.mockResolvedValue({
      data: { current_balance: 30, balance: 30 },
      error: null,
    });

    const res = await sendTreatmentExchangeRequest({
      ...baseInput,
      durationMinutes: 60,
    });

    expect(res.ok).toBe(false);
    expect(res.requestId).toBeNull();
    expect(res.error?.message).toMatch(/Insufficient credits/i);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("calls create_treatment_exchange_request RPC when credits suffice", async () => {
    mockFetchMyCredits.mockResolvedValue({
      data: { current_balance: 120, balance: 120 },
      error: null,
    });
    mockRpc.mockResolvedValue({ data: "new-req-id", error: null });

    const res = await sendTreatmentExchangeRequest({
      ...baseInput,
      startTime: "10:00",
      sessionType: " Sports massage ",
      notes: "  Tuesday works  ",
    });

    expect(res.ok).toBe(true);
    expect(res.requestId).toBe("new-req-id");
    expect(mockRpc).toHaveBeenCalledWith(
      "create_treatment_exchange_request",
      expect.objectContaining({
        p_recipient_id: "rec-1",
        p_session_date: "2026-06-01",
        p_start_time: "10:00:00",
        p_duration_minutes: 60,
        p_session_type: "Sports massage",
        p_requester_notes: "Tuesday works",
      }),
    );
  });
});
