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
  "exchange_slot_held",
  "exchange_slot_released",
  "exchange_session_confirmed",
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
  const type = looksLikeMessage ? "new_message" : normalizeType(input.type);
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
    read: input.read ?? input.read_at != null,
    created_at: input.created_at ?? null,
  };
}

export function parseNotificationRows(rows: Notification[]): NormalizedNotification[] {
  return rows.map(normalizeNotification).sort((a, b) => {
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

export function resolveNotificationDestination(
  notification: Notification | NormalizedNotification,
  userRole: NotificationUserRole
): { targetUrl: string; fallbackUrl: string } {
  const normalized = "family" in notification ? notification : normalizeNotification(notification);
  const isClient = userRole === "client";

  const sessionId =
    pickString(normalized.data, "session_id", "sessionId") ??
    (normalized.source_type === "session" || normalized.source_type === "booking" ? normalized.source_id : null);
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

  if (normalized.family === "exchange") {
    return {
      targetUrl: requestId ? `/practice/exchange-requests?request=${requestId}` : "/practice/exchange-requests",
      fallbackUrl: "/practice/exchange-requests",
    };
  }

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
