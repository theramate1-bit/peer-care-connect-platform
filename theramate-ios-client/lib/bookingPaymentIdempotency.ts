/**
 * Pure helpers for clinic/mobile booking payment idempotency (testable without Supabase).
 */

export type BookingRpcShape = {
  success?: boolean;
  session_id?: string;
  error_code?: string;
  error_message?: string;
};

export function clinicBookingIdempotencyKey(params: {
  clientId: string;
  therapistId: string;
  sessionDate: string;
  startTime: string;
}): string {
  return `${params.clientId}-${params.therapistId}-${params.sessionDate}-${params.startTime}`;
}

export function mobileCheckoutIdempotencyKey(requestId: string): string {
  return `mobile_checkout_${requestId}`;
}

/** Resolve session id from create_booking_with_validation, including duplicate submit. */
export function resolveClinicSessionIdFromRpc(
  result: BookingRpcShape | null | undefined,
):
  | { ok: true; sessionId: string }
  | { ok: false; error: string; conflict?: boolean } {
  if (!result) {
    return { ok: false, error: "Failed to create booking" };
  }
  if (result.success && result.session_id) {
    return { ok: true, sessionId: result.session_id };
  }
  const code = result.error_code || "";
  const msg = result.error_message || "Failed to create booking";
  if (code === "DUPLICATE_REQUEST" && result.session_id) {
    return { ok: true, sessionId: result.session_id };
  }
  if (code === "CONFLICT_BOOKING" || code === "CONFLICT_BLOCKED") {
    return { ok: false, error: msg, conflict: true };
  }
  return { ok: false, error: msg };
}

export function isMobilePaymentAlreadyComplete(
  paymentStatus: string | null | undefined,
): boolean {
  const pay = (paymentStatus || "").toLowerCase();
  return (
    pay === "held" ||
    pay === "paid" ||
    pay === "succeeded" ||
    pay === "captured"
  );
}
