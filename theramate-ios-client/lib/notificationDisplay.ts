/**
 * In-app notification copy — aligns with TREATMENT_EXCHANGE_NOTIFICATION_FLOWS.md (web parity).
 */

import type { AppNotification } from "@/lib/api/notifications";

function payloadRecord(item: AppNotification): Record<string, unknown> {
  const d = item.data;
  if (d && typeof d === "object" && !Array.isArray(d)) {
    return d as Record<string, unknown>;
  }
  return {};
}

function pickStr(p: Record<string, unknown>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = p[k];
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return null;
}

export function isExchangeNotification(item: AppNotification): boolean {
  const type = (item.type || "").toLowerCase();
  const st = (item.source_type || "").toLowerCase();
  return (
    type.includes("exchange") ||
    st.includes("exchange") ||
    st.includes("treatment_exchange") ||
    st.includes("slot_hold")
  );
}

/** Pending swap — must not show "Confirmed" in preview copy. */
export function isPendingExchangeNotification(item: AppNotification): boolean {
  const type = (item.type || "").toLowerCase();
  const st = (item.source_type || "").toLowerCase();
  if (
    type === "treatment_exchange_request" ||
    type === "exchange_request" ||
    type === "exchange_request_received" ||
    type === "exchange_slot_held"
  ) {
    return true;
  }
  return st === "treatment_exchange_request" || st === "slot_hold";
}

export function notificationCategoryBadge(
  item: AppNotification,
): string | null {
  if (isExchangeNotification(item)) return "Treatment exchange";
  const type = (item.type || "").toLowerCase();
  const p = payloadRecord(item);
  const appt = (
    pickStr(p, "appointment_type", "appointmentType", "session_type") || ""
  ).toLowerCase();
  if (type.includes("mobile") || appt === "mobile") return "Mobile visit";
  if (appt === "clinic") return "Clinic";
  return null;
}

function peerNameFromPayload(p: Record<string, unknown>): string | null {
  return pickStr(
    p,
    "requesterName",
    "requester_name",
    "recipientName",
    "recipient_name",
    "practitionerName",
    "practitioner_name",
    "otherPractitionerName",
    "other_practitioner_name",
  );
}

/** Replace misleading "Client" in exchange/peer lines when payload has a practitioner name. */
function replaceAnonymousClientLabel(
  text: string,
  peerName: string | null,
  isExchange: boolean,
): string {
  if (!peerName || !isExchange) return text;
  if (!/\bclient\b/i.test(text)) return text;
  return text.replace(/\bClient\b/g, peerName);
}

function stripFalseConfirmedSuffix(text: string): string {
  return text
    .replace(/\s*·\s*confirmed\s*$/i, "")
    .replace(/\s*-\s*confirmed\s*$/i, "")
    .trim();
}

export type NotificationDisplay = {
  title: string;
  message: string | null;
  badge: string | null;
};

export function formatNotificationForInbox(
  item: AppNotification,
): NotificationDisplay {
  const p = payloadRecord(item);
  const isExchange = isExchangeNotification(item);
  const pending = isPendingExchangeNotification(item);
  const peerName = peerNameFromPayload(p);

  let title = (item.title || "Notification").trim();
  let message = item.message?.trim() ?? null;

  if (message) {
    message = replaceAnonymousClientLabel(message, peerName, isExchange);
    if (pending) {
      message = stripFalseConfirmedSuffix(message);
      if (/\bconfirmed\b/i.test(message)) {
        message = message.replace(/\s*·\s*confirmed/gi, "").trim();
      }
    }
  }

  if (pending && /\bconfirmed\b/i.test(title)) {
    title = title.replace(/\s*confirmed\s*/gi, " ").trim() || title;
  }

  return {
    title,
    message,
    badge: notificationCategoryBadge(item),
  };
}
