/**
 * Enforces that production emails only render with real data (no placeholders).
 * This runs after DB enrichment inside send-email.
 */
type Dict = Record<string, unknown>;

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isFiniteNumber(v: unknown): boolean {
  if (typeof v === "number") return Number.isFinite(v);
  if (typeof v === "string" && v.trim()) return Number.isFinite(Number(v));
  return false;
}

function get(d: Dict, k: string): unknown {
  return d[k];
}

function requireString(d: Dict, k: string, missing: string[]) {
  if (!isNonEmptyString(get(d, k))) missing.push(k);
}

function requireNumber(d: Dict, k: string, missing: string[]) {
  if (!isFiniteNumber(get(d, k))) missing.push(k);
}

function requireOneOfStrings(d: Dict, keys: string[], missing: string[]) {
  const ok = keys.some((k) => isNonEmptyString(get(d, k)));
  if (!ok) missing.push(keys.join(" | "));
}

export function assertNoFallbackEmailData(
  emailType: string,
  emailData: Dict,
): void {
  const missing: string[] = [];

  // Core session-based emails must have sessionId so we can enrich and stay truthful.
  const sessionBased = new Set([
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
    "peer_credits_deducted",
    "peer_credits_earned",
    "peer_booking_cancelled_refunded",
  ]);

  if (sessionBased.has(emailType)) {
    requireString(emailData, "sessionId", missing);
    requireString(emailData, "sessionType", missing);
    requireString(emailData, "sessionDate", missing);
    requireString(emailData, "sessionTime", missing);
    requireNumber(emailData, "sessionDuration", missing);
    requireString(emailData, "sessionTimezone", missing);
  }

  switch (emailType) {
    case "booking_confirmation_client":
    case "payment_confirmation_client":
    case "session_reminder_24h":
    case "session_reminder_2h":
    case "session_reminder_1h":
    case "cancellation":
    case "rescheduling":
    case "peer_booking_confirmed_client":
    case "peer_credits_deducted":
    case "peer_credits_earned":
    case "peer_booking_cancelled_refunded":
      requireString(emailData, "practitionerName", missing);
      break;

    case "booking_confirmation_practitioner":
    case "payment_received_practitioner":
    case "peer_booking_confirmed_practitioner":
      requireString(emailData, "clientName", missing);
      requireString(emailData, "clientEmail", missing);
      break;
  }

  // Money-related emails must have numeric amounts (no placeholders).
  if (emailType === "payment_confirmation_client") {
    requireNumber(emailData, "paymentAmount", missing);
    requireString(emailData, "paymentId", missing);
  }
  if (emailType === "payment_received_practitioner") {
    requireNumber(emailData, "paymentAmount", missing);
    requireNumber(emailData, "platformFee", missing);
    requireNumber(emailData, "practitionerAmount", missing);
    requireString(emailData, "paymentId", missing);
  }

  // Location must be real for clinic; mobile must have visit address.
  // We do NOT allow "to be confirmed" placeholders in production.
  const locationKind = get(emailData, "locationKind");
  if (sessionBased.has(emailType)) {
    requireString(emailData, "locationKind", missing);
    requireString(emailData, "sessionLocation", missing);

    if (locationKind === "mobile") {
      requireString(emailData, "visitAddress", missing);
      // directionsUrl can be absent for client mobile, but practitioner mobile should have it.
      if (
        emailType === "booking_confirmation_practitioner" ||
        emailType === "peer_booking_confirmed_practitioner"
      ) {
        requireString(emailData, "directionsUrl", missing);
      }
    } else if (locationKind === "clinic") {
      // Client clinic emails should have directions.
      if (
        emailType === "booking_confirmation_client" ||
        emailType === "session_reminder_24h" ||
        emailType === "session_reminder_2h" ||
        emailType === "session_reminder_1h" ||
        emailType === "payment_confirmation_client"
      ) {
        requireString(emailData, "directionsUrl", missing);
      }
    }
  }

  // Mobile booking request emails require requestId and concrete request details.
  if (emailType === "booking_request_practitioner") {
    requireString(emailData, "requestId", missing);
    requireString(emailData, "clientName", missing);
    requireString(emailData, "serviceType", missing);
    requireString(emailData, "requestedDate", missing);
    requireOneOfStrings(emailData, ["requestedTime"], missing);
    requireString(emailData, "clientAddress", missing);
    requireNumber(emailData, "sessionPrice", missing);
    requireNumber(emailData, "sessionDuration", missing);
  }
  if (
    emailType === "mobile_request_accepted_client" ||
    emailType === "mobile_request_declined_client" ||
    emailType === "mobile_request_expired_client"
  ) {
    requireString(emailData, "requestId", missing);
    requireString(emailData, "serviceType", missing);
    requireString(emailData, "requestedDate", missing);
    requireString(emailData, "requestedTime", missing);
    requireString(emailData, "practitionerName", missing);
  }

  // Guest message must contain sender name + link.
  if (emailType === "message_notification_guest") {
    requireString(emailData, "practitionerName", missing);
    requireString(emailData, "viewMessageUrl", missing);
  }

  // Welcome emails: at least a first name is expected.
  if (emailType === "welcome_client" || emailType === "welcome_practitioner") {
    requireString(emailData, "recipientName", missing);
  }

  if (missing.length > 0) {
    const err = new Error(
      `Missing required email data for ${emailType}: ${missing.join(", ")}`,
    );
    // @ts-ignore attach fields for upstream logging
    err.missing = missing;
    throw err;
  }
}
