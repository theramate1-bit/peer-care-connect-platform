/**
 * Loads client_sessions + practitioner and merges real session/location fields into email payload.
 * Ensures transactional emails show actual booking data even if the caller omitted fields.
 */
import { getBookingEmailLocationData } from "./booking-email-data.ts";

export const EMAIL_TYPES_WITH_SESSION_ENRICHMENT = new Set([
  "booking_confirmation_client",
  "booking_confirmation_practitioner",
  "payment_confirmation_client",
  "payment_received_practitioner",
  "session_reminder_24h",
  "session_reminder_2h",
  "session_reminder_1h",
  "cancellation",
  "rescheduling",
  "peer_booking_confirmed_client",
  "peer_booking_confirmed_practitioner",
  "peer_booking_cancelled_refunded",
  "peer_credits_deducted",
  "peer_credits_earned",
]);

function formatSessionTime(t: string | null | undefined): string | undefined {
  if (!t || typeof t !== "string") return undefined;
  const s = t.trim();
  if (s.length >= 5) return s.slice(0, 5);
  return s;
}

export async function enrichEmailDataFromSession(
  supabase: { from: (t: string) => any },
  emailType: string,
  data: Record<string, unknown> | undefined,
  siteBaseUrl = "https://theramate.co.uk",
): Promise<Record<string, unknown>> {
  const base = siteBaseUrl.replace(/\/$/, "");
  const d = { ...(data || {}) };
  const sessionId = d.sessionId;
  if (!sessionId || typeof sessionId !== "string") return d;
  if (!EMAIL_TYPES_WITH_SESSION_ENRICHMENT.has(emailType)) return d;

  const { data: session, error } = await supabase
    .from("client_sessions")
    .select(
      "id, client_email, client_name, therapist_id, session_date, start_time, duration_minutes, session_type, price, platform_fee_amount, practitioner_amount, guest_view_token, appointment_type, visit_address, payment_status, status, requires_approval, stripe_payment_intent_id, session_timezone",
    )
    .eq("id", sessionId)
    .maybeSingle();

  if (error || !session) {
    console.warn(
      "enrichEmailDataFromSession: session not found",
      sessionId,
      error?.message,
    );
    return d;
  }
  if (!session.therapist_id) return d;

  const { data: practitioner, error: pe } = await supabase
    .from("users")
    .select("email, first_name, last_name, location, clinic_address")
    .eq("id", session.therapist_id)
    .maybeSingle();

  if (pe || !practitioner) {
    console.warn(
      "enrichEmailDataFromSession: practitioner",
      session.therapist_id,
      pe?.message,
    );
    return d;
  }

  const locationData = getBookingEmailLocationData(
    {
      appointment_type: session.appointment_type,
      visit_address: session.visit_address,
    },
    {
      location: practitioner.location,
      clinic_address: practitioner.clinic_address,
    },
  );

  const practitionerName =
    [practitioner.first_name, practitioner.last_name]
      .filter(Boolean)
      .join(" ") || "Practitioner";

  const isPractitionerFacing =
    emailType === "booking_confirmation_practitioner" ||
    emailType === "payment_received_practitioner" ||
    emailType === "peer_booking_confirmed_practitioner";

  const directionsUrl = isPractitionerFacing
    ? locationData.directionsUrlForPractitioner
    : locationData.directionsUrlForClient;

  const bookingUrl =
    session.guest_view_token && session.client_email
      ? `${base}/booking/view/${session.id}?token=${encodeURIComponent(session.guest_view_token)}`
      : undefined;

  const sessionTime = formatSessionTime(session.start_time);

  if (emailType === "rescheduling") {
    return {
      ...d,
      sessionType: session.session_type ?? d.sessionType,
      practitionerName: practitionerName || d.practitionerName,
      sessionLocation: locationData.sessionLocation || d.sessionLocation,
      directionsUrl: directionsUrl ?? d.directionsUrl,
      visitAddress: locationData.visitAddress ?? d.visitAddress,
      locationKind: locationData.locationKind,
      bookingUrl: bookingUrl ?? d.bookingUrl,
      clientName: session.client_name ?? d.clientName,
      sessionDuration: session.duration_minutes ?? d.sessionDuration,
    };
  }

  return {
    ...d,
    sessionType: session.session_type ?? d.sessionType,
    sessionDate: session.session_date ?? d.sessionDate,
    sessionTime: sessionTime ?? d.sessionTime,
    sessionDuration: session.duration_minutes ?? d.sessionDuration,
    sessionPrice: session.price ?? d.sessionPrice,
    paymentAmount: session.price ?? d.paymentAmount,
    clientName: session.client_name ?? d.clientName,
    clientEmail: session.client_email ?? d.clientEmail,
    practitionerName,
    practitionerEmail: practitioner.email ?? d.practitionerEmail,
    sessionLocation: locationData.sessionLocation || d.sessionLocation,
    directionsUrl: directionsUrl ?? d.directionsUrl,
    visitAddress: locationData.visitAddress ?? d.visitAddress,
    locationKind: locationData.locationKind,
    bookingUrl: bookingUrl ?? d.bookingUrl,
    platformFee: session.platform_fee_amount ?? d.platformFee,
    practitionerAmount: session.practitioner_amount ?? d.practitionerAmount,
    paymentStatus: session.payment_status ?? d.paymentStatus,
    sessionStatus: session.status ?? d.sessionStatus,
    requiresApproval: session.requires_approval ?? d.requiresApproval,
    // Payment references should be real when available (used by strict validator for payment emails)
    paymentId: session.stripe_payment_intent_id ?? d.paymentId,
    sessionTimezone: session.session_timezone ?? d.sessionTimezone,
  };
}

/** Enrich mobile booking_request_practitioner from mobile_booking_requests row */
export async function enrichEmailDataFromMobileRequest(
  supabase: { from: (t: string) => any },
  emailType: string,
  data: Record<string, unknown> | undefined,
): Promise<Record<string, unknown>> {
  const d = { ...(data || {}) };
  const supportedMobileRequestTypes = new Set([
    "booking_request_practitioner",
    "mobile_request_accepted_client",
    "mobile_request_declined_client",
    "mobile_request_expired_client",
  ]);
  if (!supportedMobileRequestTypes.has(emailType)) return d;
  const requestId = d.requestId;
  if (!requestId || typeof requestId !== "string") return d;

  let row: Record<string, unknown> | null = null;
  const sel = await supabase
    .from("mobile_booking_requests")
    .select(
      "id, client_id, practitioner_id, service_type, requested_date, requested_start_time, client_address, total_price_pence, duration_minutes",
    )
    .eq("id", requestId)
    .maybeSingle();

  if (sel.error) {
    const fallback = await supabase
      .from("mobile_booking_requests")
      .select(
        "id, client_id, practitioner_id, service_type, requested_date, requested_start_time, client_address, total_price_pence",
      )
      .eq("id", requestId)
      .maybeSingle();
    if (fallback.error || !fallback.data) {
      console.warn(
        "enrichEmailDataFromMobileRequest: row not found",
        requestId,
        sel.error?.message,
      );
      return d;
    }
    row = fallback.data as Record<string, unknown>;
  } else {
    row = sel.data as Record<string, unknown> | null;
  }

  if (!row) {
    return d;
  }

  let clientName = d.clientName;
  let practitionerName = d.practitionerName;
  let practitionerEmail = d.practitionerEmail;
  if (row.client_id && (!clientName || clientName === "Client")) {
    const { data: client } = await supabase
      .from("users")
      .select("first_name, last_name")
      .eq("id", row.client_id)
      .maybeSingle();
    if (client) {
      const n = [client.first_name, client.last_name]
        .filter(Boolean)
        .join(" ")
        .trim();
      if (n) clientName = n;
    }
  }
  if (row.practitioner_id && (!practitionerName || !practitionerEmail)) {
    const { data: practitioner } = await supabase
      .from("users")
      .select("first_name, last_name, email")
      .eq("id", row.practitioner_id)
      .maybeSingle();
    if (practitioner) {
      const n = [practitioner.first_name, practitioner.last_name]
        .filter(Boolean)
        .join(" ")
        .trim();
      if (n && !practitionerName) practitionerName = n;
      if (practitioner.email && !practitionerEmail)
        practitionerEmail = practitioner.email;
    }
  }

  const requestedTime =
    typeof row.requested_start_time === "string"
      ? row.requested_start_time.slice(0, 5)
      : row.requested_start_time;

  const pricePence = row.total_price_pence as number | null | undefined;
  const pricePounds =
    pricePence != null && Number.isFinite(Number(pricePence))
      ? Number(pricePence) / 100
      : undefined;

  return {
    ...d,
    requestId: row.id || d.requestId,
    clientName: clientName || d.clientName,
    practitionerName: practitionerName || d.practitionerName,
    practitionerEmail: practitionerEmail || d.practitionerEmail,
    serviceType: row.service_type || d.serviceType,
    requestedDate: row.requested_date || d.requestedDate,
    requestedTime: requestedTime || d.requestedTime,
    clientAddress:
      row.client_address && String(row.client_address).trim()
        ? row.client_address
        : d.clientAddress,
    sessionPrice: pricePounds ?? d.sessionPrice,
    sessionDuration:
      row.duration_minutes != null && row.duration_minutes !== ""
        ? row.duration_minutes
        : d.sessionDuration,
  };
}
