import { describe, expect, it } from "@jest/globals";

import {
  clinicBookingIdempotencyKey,
  isMobilePaymentAlreadyComplete,
  mobileCheckoutIdempotencyKey,
  resolveClinicSessionIdFromRpc,
} from "@/lib/bookingPaymentIdempotency";

describe("bookingPaymentIdempotency", () => {
  it("builds stable clinic keys", () => {
    expect(
      clinicBookingIdempotencyKey({
        clientId: "c1",
        therapistId: "t1",
        sessionDate: "2026-06-01",
        startTime: "10:00",
      }),
    ).toBe("c1-t1-2026-06-01-10:00");
  });

  it("builds stable mobile checkout keys per request", () => {
    expect(mobileCheckoutIdempotencyKey("req-abc")).toBe(
      "mobile_checkout_req-abc",
    );
  });

  it("resolves DUPLICATE_REQUEST to same session id", () => {
    const r = resolveClinicSessionIdFromRpc({
      success: false,
      error_code: "DUPLICATE_REQUEST",
      error_message: "Already processed",
      session_id: "sess-1",
    });
    expect(r).toEqual({ ok: true, sessionId: "sess-1" });
  });

  it("maps conflict codes", () => {
    const r = resolveClinicSessionIdFromRpc({
      success: false,
      error_code: "CONFLICT_BOOKING",
      error_message: "Slot taken",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.conflict).toBe(true);
  });

  it("detects completed mobile payment statuses", () => {
    expect(isMobilePaymentAlreadyComplete("held")).toBe(true);
    expect(isMobilePaymentAlreadyComplete("pending")).toBe(false);
  });
});
