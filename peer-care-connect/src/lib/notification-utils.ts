import { NavigateFunction } from "react-router-dom";

export type NotificationUserRole =
  | "client"
  | "sports_therapist"
  | "massage_therapist"
  | "osteopath"
  | "admin"
  | null
  | undefined;

type NotificationPayload = Record<string, unknown>;

export interface Notification {
  id: string;
  type: string;
  title: string;
  message?: string;
  body?: string;
  payload?: NotificationPayload | string | null;
  data?: NotificationPayload | string | null;
  source_type?: string | null;
  source_id?: string | null;
  recipient_id?: string | null;
  user_id?: string | null;
  read?: boolean;
  read_at?: string | null;
  dismissed_at?: string | null;
  created_at?: string | null;
}

export interface NormalizedNotification {
  id: string;
  type: string;
  family: "message" | "booking" | "mobile_request" | "exchange" | "payment" | "review" | "operations" | "unknown";
  title: string;
  message: string;
  data: NotificationPayload;
  source_type: string | null;
  source_id: string | null;
  user_id: string | null;
  read: boolean;
  dismissed_at: string | null;
  created_at: string | null;
}

const MESSAGE_TYPES = new Set(["message", "new_message"]);
const BOOKING_TYPES = new Set([
  "booking_confirmed",
  "booking_confirmation",
  "payment_confirmed",
  "session_reminder",
  "session_cancelled",
  "session_rescheduled",
  "booking_approved",
  "booking_approved_practitioner",
  "booking_declined",
  "booking_declined_practitioner",
  "booking_expired",
  "booking_expired_practitioner",
]);
const MOBILE_REQUEST_TYPES = new Set([
  "booking_request",
  "booking_approved",
  "booking_approved_practitioner",
  "booking_declined",
  "booking_declined_practitioner",
  "booking_expired",
  "booking_expired_practitioner",
]);
const EXCHANGE_TYPES = new Set([
  "treatment_exchange_request",
  "exchange_request",
  "exchange_request_received",
  "exchange_request_accepted",
  "exchange_request_declined",
  "exchange_request_expired",
  "exchange_request_cancelled",
  "exchange_slot_held",
  "exchange_slot_released",
  "exchange_session_confirmed",
  "exchange_reciprocal_booking_reminder",
  "exchange_reciprocal_expired",
  "exchange_reciprocal_reminder",
  "exchange_extension_requested",
  "exchange_extension_approved",
]);
const OPERATIONS_TYPES = new Set(["client_check_in", "client_check_out", "intake_form", "intake_completed"]);

function safeParsePayload(value: unknown): NotificationPayload {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as NotificationPayload;
      }
      return {};
    } catch {
      return {};
    }
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as NotificationPayload;
  }
  return {};
}

function normalizeType(rawType?: string | null): string {
  if (!rawType) return "unknown";
  const normalized = rawType.toLowerCase().trim();
  if (normalized === "message") return "new_message";
  if (normalized === "booking_confirmation") return "booking_confirmed";
  return normalized;
}

function looksLikeExchangeNotification(notification: Notification | NormalizedNotification): boolean {
  const normalized = "family" in notification ? notification : normalizeNotification(notification);
  const sourceType = (normalized.source_type ?? "").toLowerCase();
  return (
    normalized.family === "exchange" ||
    sourceType === "treatment_exchange_request" ||
    sourceType === "slot_hold" ||
    sourceType === "mutual_exchange_session" ||
    /treatment exchange|slot reserved for exchange|exchange session confirmed/i.test(normalized.title)
  );
}

function getFamily(type: string): NormalizedNotification["family"] {
  if (MESSAGE_TYPES.has(type)) return "message";
  if (EXCHANGE_TYPES.has(type)) return "exchange";
  if (MOBILE_REQUEST_TYPES.has(type)) return "mobile_request";
  if (BOOKING_TYPES.has(type)) return "booking";
  if (type === "payment_received" || type === "payment_confirmed") return "payment";
  if (type === "review_received") return "review";
  if (OPERATIONS_TYPES.has(type)) return "operations";
  return "unknown";
}

function pickString(data: NotificationPayload, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return null;
}

export function normalizeNotification(input: Notification): NormalizedNotification {
  const data = safeParsePayload(input.payload ?? input.data);
  const looksLikeMessage =
    (input.source_type ?? "").toLowerCase() === "message" ||
    typeof data["conversation_id"] === "string" ||
    typeof data["message_id"] === "string" ||
    (input.title ?? "").toLowerCase().includes("new message");
  // DB may use notification_type; frontend expects type
  const rawType = input.type ?? (input as { notification_type?: string }).notification_type;
  const type = looksLikeMessage ? "new_message" : normalizeType(rawType);
  return {
    id: input.id,
    type,
    family: getFamily(type),
    title: input.title || "Notification",
    message: input.message || input.body || "",
    data,
    source_type: input.source_type ?? null,
    source_id: input.source_id ?? null,
    user_id: input.user_id ?? input.recipient_id ?? null,
    read: input.read_at != null || input.read === true,
    dismissed_at: input.dismissed_at ?? null,
    created_at: input.created_at ?? null,
  };
}

export function parseNotificationRows(rows: Notification[]): NormalizedNotification[] {
  return rows.map(normalizeNotification).filter((row) => row.dismissed_at == null).sort((a, b) => {
    if (!a.read && b.read) return -1;
    if (a.read && !b.read) return 1;
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
    return bTime - aTime;
  });
}

export function cleanNotificationMessage(notification: Notification | NormalizedNotification): string {
  const normalized = "family" in notification ? notification : normalizeNotification(notification);
  const practitionerName = pickString(normalized.data, "practitionerName", "practitioner_name");
  const message = normalized.message.replace("with undefined", practitionerName ? `with ${practitionerName}` : "with Practitioner");
  return message.replace(/(\d{1,2}):(\d{2}):(\d{2})/g, "$1:$2");
}

/** Short, scannable preview for dropdown - title + optional one-line subtitle */
export function formatNotificationPreview(
  notification: Notification | NormalizedNotification
): { title: string; subtitle: string | null } {
  const normalized = "family" in notification ? notification : normalizeNotification(notification);
  const d = normalized.data as Record<string, unknown> | undefined;
  const pick = (...keys: string[]) => {
    if (!d || typeof d !== "object") return null;
    for (const k of keys) {
      const v = d[k];
      if (typeof v === "string" && v.trim()) return v;
    }
    return null;
  };

  let name = pick("practitionerName", "practitioner_name", "recipientName", "requesterName", "client_name", "clientName");
  if (!name && normalized.message) {
    const declinedMatch = normalized.message.match(/^([A-Za-z][A-Za-z\s'-]{1,40}?)\s+has\s+declined/i);
    if (declinedMatch) name = declinedMatch[1].trim();
  }
  const dateStr = pick("sessionDate", "session_date", "requestedDate", "requested_session_date");
  const timeStr = pick("startTime", "start_time", "requestedStartTime", "requested_start_time");
  const timeShort = timeStr ? timeStr.replace(/(\d{1,2}):(\d{2}):(\d{2})/, "$1:$2").slice(0, 5) : null;
  const dateFormatted = dateStr
    ? (() => {
        try {
          const dt = new Date(dateStr);
          return dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: dt.getFullYear() !== new Date().getFullYear() ? "2-digit" : undefined });
        } catch {
          return dateStr;
        }
      })()
    : null;

  if (normalized.family === "exchange" || looksLikeExchangeNotification(normalized)) {
    const when = [dateFormatted, timeShort].filter(Boolean).join(" · ") || null;
    const sub = name && when ? `${name} · ${when}` : name || when;
    switch (normalized.type) {
      case "exchange_request_declined":
        return { title: "Request declined", subtitle: sub };
      case "exchange_request_accepted":
        return { title: "Request accepted", subtitle: sub };
      case "exchange_request_expired":
        return { title: "Request expired", subtitle: when };
      case "exchange_session_confirmed":
        return { title: "Exchange confirmed", subtitle: sub };
      case "exchange_reciprocal_reminder":
        return { title: "Book return soon", subtitle: sub };
      case "exchange_extension_requested":
        return { title: "Extension requested", subtitle: sub };
      case "exchange_extension_approved":
        return { title: "Extension approved", subtitle: sub };
      case "exchange_reciprocal_expired":
        return { title: "Exchange expired", subtitle: sub };
      case "treatment_exchange_request":
      case "exchange_request_received":
      case "exchange_slot_held":
        return { title: "New request", subtitle: sub };
      default:
        return { title: normalized.title || "Treatment exchange", subtitle: sub };
    }
  }

  if (normalized.family === "message") {
    return { title: normalized.title || "New message", subtitle: normalized.message?.slice(0, 50) ?? null };
  }

  if (normalized.family === "mobile_request") {
    const short = name ? `${name} · Mobile` : "Mobile request";
    return { title: normalized.title || "Request", subtitle: short };
  }

  return {
    title: normalized.title || "Notification",
    subtitle: normalized.message ? cleanNotificationMessage(normalized).slice(0, 60) : null,
  };
}

/** Structured preview for booking notifications - who, when, badge - for scannable UI */
export interface BookingNotificationPreview {
  who: string;
  when: string;
  badge?: "Mobile" | "Exchange" | "Clinic";
  fallback?: string; /** Short fallback when structured data unavailable */
}

/** Try to extract client/person name from notification message when payload lacks it */
function extractNameFromMessage(message: string): string | null {
  if (!message || message.length < 3) return null;
  // "X has requested a mobile session" → X is the requester
  const requested = message.match(/^([A-Za-z][A-Za-z\s'-]{1,40})\s+has\s+requested/i);
  if (requested) return requested[1].trim();
  // "session with X on" or "with X on YYYY" (exclude "a client", "the client")
  const withMatch = message.match(/(?:session\s+)?with\s+(?!a\s+client|the\s+client|client\b)([A-Za-z][A-Za-z\s'-]{1,40}?)\s+on\s+\d{4}/i);
  if (withMatch) return withMatch[1].trim();
  return null;
}

/** Try to extract date and time from message when payload lacks them (e.g. "on 2026-03-24 at 10:15") */
function extractDateAndTimeFromMessage(message: string): { dateStr: string | null; timeStr: string | null } {
  if (!message) return { dateStr: null, timeStr: null };
  const isoDate = message.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  const timeMatch = message.match(/\bat\s+(\d{1,2}:\d{2}(?::\d{2})?)\b/i) ?? message.match(/\b(\d{1,2}:\d{2})\b/);
  const timeStr = timeMatch ? timeMatch[1].replace(/(\d{1,2}):(\d{2}):(\d{2})/, "$1:$2").slice(0, 5) : null;
  return { dateStr: isoDate ? isoDate[1] : null, timeStr };
}

export function formatBookingNotificationPreview(
  notification: Notification | NormalizedNotification
): BookingNotificationPreview {
  const normalized = "family" in notification ? notification : normalizeNotification(notification);
  const d = normalized.data;

  const clientName = pickString(d, "client_name", "clientName", "practitionerName", "practitioner_name");
  const sessionDate = pickString(d, "session_date", "sessionDate");
  const sessionTime = pickString(d, "session_time", "sessionTime", "start_time", "startTime");
  const requestedDate = pickString(d, "requested_date", "requestedDate");
  const requestedTime = pickString(d, "requested_start_time", "requestedStartTime");

  let dateStr = sessionDate || requestedDate;
  let timeStr = (sessionTime || requestedTime || "")
    .replace(/(\d{1,2}):(\d{2}):(\d{2})/, "$1:$2")
    .trim()
    .slice(0, 5) || "";

  // When payload lacks date/time, try to extract from message (e.g. clinic "Session with X on 2026-03-24 at 10:15 is confirmed")
  if ((!dateStr || !timeStr) && normalized.message) {
    const extracted = extractDateAndTimeFromMessage(normalized.message);
    if (extracted.dateStr) dateStr = dateStr || extracted.dateStr;
    if (extracted.timeStr) timeStr = timeStr || extracted.timeStr;
  }

  const extractedName = !clientName && normalized.message ? extractNameFromMessage(normalized.message) : null;
  const who = clientName || extractedName || "Client";
  let when = "";
  if (dateStr && timeStr) {
    try {
      const d = new Date(dateStr);
      const label = d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        ...(d.getFullYear() !== new Date().getFullYear() ? { year: "2-digit" } : {}),
      });
      when = `${label} · ${timeStr.length === 5 ? timeStr : timeStr.slice(0, 5)}`;
    } catch {
      when = `${dateStr} ${timeStr}`.trim();
    }
  } else if (dateStr) {
    try {
      const d = new Date(dateStr);
      when = d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        ...(d.getFullYear() !== new Date().getFullYear() ? { year: "2-digit" } : {}),
      });
    } catch {
      when = dateStr;
    }
  }

  const isMobile =
    normalized.family === "mobile_request" ||
    normalized.source_type === "mobile_booking_request";
  const isExchange =
    normalized.family === "exchange" ||
    (normalized.source_type ?? "").toLowerCase().includes("exchange");

  // Pending exchange requests must NOT show "Confirmed" - only accepted/confirmed exchange sessions do.
  // Source of truth: source_type. Old DB rows may have fallen back to booking_confirmed before enum had exchange types.
  const isPendingExchangeBySource =
    normalized.source_type === "treatment_exchange_request" || normalized.source_type === "slot_hold";
  const isPendingExchangeByType = [
    "treatment_exchange_request",
    "exchange_request",
    "exchange_request_received",
    "exchange_slot_held",
  ].includes(normalized.type);
  const isPendingExchangeByTitle =
    /new treatment exchange request|slot reserved for exchange|slot released/i.test(normalized.title ?? "");
  const isPendingExchangeRequest =
    isExchange && (isPendingExchangeByType || isPendingExchangeBySource || isPendingExchangeByTitle);

  const isConfirmed =
    !isPendingExchangeRequest &&
    (normalized.type === "booking_confirmed" ||
      normalized.type === "booking_confirmation" ||
      normalized.type === "exchange_session_confirmed" ||
      normalized.title?.toLowerCase().includes("confirmed"));

  let badge: BookingNotificationPreview["badge"];
  if (isMobile) badge = "Mobile";
  else if (isExchange) badge = "Exchange";
  else if (isConfirmed) badge = "Clinic";

  // Append " · Confirmed" only for actually confirmed bookings (never for pending exchange requests)
  const whenDisplay =
    when && isConfirmed ? `${when} · Confirmed` : when;

  const fallback =
    !when && normalized.message
      ? cleanNotificationMessage(normalized).slice(0, 60) + (normalized.message.length > 60 ? "…" : "")
      : undefined;

  return {
    who: who.trim() || "Client",
    when: (whenDisplay || when || "").trim() || fallback || "",
    badge,
    fallback: when ? undefined : fallback,
  };
}

export function resolveNotificationDestination(
  notification: Notification | NormalizedNotification,
  userRole: NotificationUserRole
): { targetUrl: string; fallbackUrl: string } {
  const normalized = "family" in notification ? notification : normalizeNotification(notification);
  const isClient = userRole === "client";

  const sessionId =
    pickString(normalized.data, "session_id", "sessionId") ??
    (["session", "booking", "mutual_exchange_session"].includes(normalized.source_type ?? "")
      ? normalized.source_id
      : null);
  const requestId =
    pickString(normalized.data, "request_id", "requestId") ??
    (normalized.source_type === "mobile_booking_request" || normalized.source_type === "treatment_exchange_request"
      ? normalized.source_id
      : null);
  const conversationId =
    pickString(normalized.data, "conversation_id", "conversationId") ??
    ((normalized.source_type === "conversation" || normalized.source_type === "messages_conversation")
      ? normalized.source_id
      : null);
  const messageId =
    pickString(normalized.data, "message_id", "messageId") ??
    (normalized.source_type === "message" ? normalized.source_id : null);

  // Treatment exchange: context-aware redirect (never diary/schedule)
  if (looksLikeExchangeNotification(normalized)) {
    const isConfirmedExchange =
      normalized.type === "exchange_session_confirmed" ||
      (normalized.type === "booking_confirmed" && normalized.source_type === "mutual_exchange_session");
    if (!isClient && isConfirmedExchange && sessionId) {
      return {
        targetUrl: `/practice/sessions/${sessionId}`,
        fallbackUrl: "/practice/exchange-requests",
      };
    }
    const exchangeRequestId =
      requestId ??
      pickString(normalized.data, "requestId") ??
      (normalized.source_type === "treatment_exchange_request" || normalized.source_type === "slot_hold"
        ? normalized.source_id
        : null);
    return {
      targetUrl: exchangeRequestId ? `/practice/exchange-requests?request=${exchangeRequestId}` : "/practice/exchange-requests",
      fallbackUrl: "/practice/exchange-requests",
    };
  }

  if (normalized.family === "message") {
    if (!conversationId) return { targetUrl: "/messages", fallbackUrl: "/messages" };
    const params = new URLSearchParams({ conversation: conversationId });
    if (messageId) params.set("messageId", messageId);
    return { targetUrl: `/messages?${params.toString()}`, fallbackUrl: "/messages" };
  }

  if (normalized.family === "booking") {
    if (isClient) {
      return {
        targetUrl: sessionId ? `/client/sessions?sessionId=${sessionId}` : "/client/sessions",
        fallbackUrl: "/client/sessions",
      };
    }
    return {
      targetUrl: sessionId ? `/practice/sessions/${sessionId}` : "/practice/schedule",
      fallbackUrl: "/practice/schedule",
    };
  }

  if (normalized.family === "mobile_request") {
    if (!isClient && normalized.type === "booking_request") {
      return {
        targetUrl: requestId ? `/practice/mobile-requests?requestId=${requestId}` : "/practice/mobile-requests",
        fallbackUrl: "/practice/mobile-requests",
      };
    }
    if (isClient && sessionId) {
      return {
        targetUrl: `/client/sessions?sessionId=${sessionId}`,
        fallbackUrl: "/client/sessions",
      };
    }
    if (isClient) {
      return {
        targetUrl: requestId ? `/client/mobile-requests?requestId=${requestId}` : "/client/mobile-requests",
        fallbackUrl: "/client/mobile-requests",
      };
    }
    return {
      targetUrl: requestId ? `/practice/mobile-requests?requestId=${requestId}` : "/practice/mobile-requests",
      fallbackUrl: "/practice/mobile-requests",
    };
  }

  // Note: Exchange notifications handled earlier (before message) to ensure correct routing

  if (normalized.type === "payment_received") {
    return { targetUrl: "/practice/billing", fallbackUrl: "/practice/billing" };
  }
  if (normalized.type === "review_received") {
    return { targetUrl: "/reviews", fallbackUrl: "/reviews" };
  }
  if (normalized.family === "operations") {
    return { targetUrl: "/practice/clients", fallbackUrl: "/practice/clients" };
  }

  return { targetUrl: "/notifications", fallbackUrl: "/notifications" };
}

export function handleNotificationNavigation(
  notification: Notification | NormalizedNotification,
  navigate: NavigateFunction,
  markAsRead?: (id: string) => void | Promise<void>,
  userRole?: NotificationUserRole
): void {
  const normalized = "family" in notification ? notification : normalizeNotification(notification);
  const destination = resolveNotificationDestination(normalized, userRole);

  const go = async () => {
    // Runtime recovery for malformed historical message notifications:
    // if conversation_id is missing but message_id exists, resolve conversation via DB.
    if (normalized.family === "message") {
      const hasConversation = typeof destination.targetUrl === "string" && destination.targetUrl.includes("conversation=");
      if (!hasConversation) {
        const messageIdFromData =
          pickString(normalized.data, "message_id", "messageId") ??
          (normalized.source_type === "message" ? normalized.source_id : null);

        if (messageIdFromData) {
          try {
            const { supabase } = await import("@/integrations/supabase/client");
            const { data } = await supabase
              .from("messages")
              .select("conversation_id")
              .eq("id", messageIdFromData)
              .maybeSingle();

            if (data?.conversation_id) {
              const params = new URLSearchParams({ conversation: data.conversation_id });
              params.set("messageId", messageIdFromData);
              navigate(`/messages?${params.toString()}`);
              return;
            }
          } catch {
            // Non-blocking fallback below.
          }
        }
      }
    }

    navigate(destination.targetUrl || destination.fallbackUrl || "/notifications");
  };

  void (async () => {
    if (!normalized.read && normalized.id && markAsRead) {
      try {
        await markAsRead(normalized.id);
      } catch {
        // Do not block navigation when read update fails.
      }
    }
    await go();
  })();
}

export async function createInAppNotification(input: {
  recipientId: string;
  type: string;
  title: string;
  body: string;
  payload?: NotificationPayload;
  sourceType?: string | null;
  sourceId?: string | null;
}): Promise<void> {
  const { supabase } = await import("@/integrations/supabase/client");

  // Respect in-app notification preference before inserting.
  try {
    const { data: channelPrefs } = await supabase
      .from("notification_preferences")
      .select("in_app")
      .eq("user_id", input.recipientId)
      .maybeSingle();

    if (channelPrefs && channelPrefs.in_app === false) {
      return;
    }

    if (!channelPrefs) {
      const { data: user } = await supabase
        .from("users")
        .select("preferences")
        .eq("id", input.recipientId)
        .maybeSingle();
      const prefs = (user as { preferences?: Record<string, unknown> | null } | null)?.preferences ?? null;
      if (prefs && typeof prefs === "object" && prefs.receiveInAppNotifications === false) {
        return;
      }
    }
  } catch {
    // Non-blocking: if preference lookup fails, continue to avoid losing critical notifications.
  }

  await supabase.rpc("create_notification", {
    p_recipient_id: input.recipientId,
    p_type: input.type,
    p_title: input.title,
    p_body: input.body,
    p_payload: input.payload ?? {},
    p_source_type: input.sourceType ?? null,
    p_source_id: input.sourceId ?? null,
  });
}

export async function markNotificationsRead(notificationIds: string[], recipientId?: string | null): Promise<void> {
  if (notificationIds.length === 0) return;
  const { supabase } = await import("@/integrations/supabase/client");
  const timestamp = new Date().toISOString();

  const { error: rpcError } = await supabase.rpc("mark_notifications_read", {
    p_ids: notificationIds,
  });

  if (!rpcError) {
    // Keep legacy boolean column aligned with read_at until the schema is cleaned up.
    const query = supabase
      .from("notifications")
      .update({ read: true })
      .in("id", notificationIds);

    const { error: boolError } = recipientId ? await query.eq("recipient_id", recipientId) : await query;
    if (!boolError) return;
  }

  let fallbackQuery = supabase
    .from("notifications")
    .update({ read_at: timestamp, read: true })
    .in("id", notificationIds);

  if (recipientId) {
    fallbackQuery = fallbackQuery.eq("recipient_id", recipientId);
  }

  const { error: updateError } = await fallbackQuery;
  if (updateError) throw updateError;
}

export async function markNotificationRead(notificationId: string, recipientId?: string | null): Promise<void> {
  await markNotificationsRead([notificationId], recipientId);
}

export async function dismissNotification(notificationId: string, recipientId?: string | null): Promise<void> {
  const { supabase } = await import("@/integrations/supabase/client");
  const timestamp = new Date().toISOString();

  let query = supabase
    .from("notifications")
    .update({
      dismissed_at: timestamp,
      read_at: timestamp,
      read: true,
    })
    .eq("id", notificationId);

  if (recipientId) {
    query = query.eq("recipient_id", recipientId);
  }

  const { error } = await query;
  if (error) throw error;
}
