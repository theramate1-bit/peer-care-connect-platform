import { supabase } from "@/lib/supabase";

export type AppNotification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string | null;
  /** Merged from `payload` / `metadata` / legacy `data` for routing. */
  data: unknown;
  is_read: boolean | null;
  created_at: string | null;
  source_type: string | null;
  source_id: string | null;
  related_entity_id: string | null;
  related_entity_type: string | null;
};

function rowToAppNotification(row: Record<string, unknown>): AppNotification {
  const payload = row.payload;
  const metadata = row.metadata;
  let merged: unknown = null;
  if (payload && typeof payload === "object") merged = payload;
  else if (metadata && typeof metadata === "object") merged = metadata;
  const read = row.read;
  return {
    id: String(row.id),
    user_id: String(row.user_id ?? row.recipient_id ?? ""),
    type: String(row.type ?? row.notification_type ?? ""),
    title: String(row.title ?? ""),
    message:
      (row.message as string | null) ??
      (row.body as string | null) ??
      null,
    data: merged,
    is_read:
      typeof read === "boolean"
        ? read
        : read === "true"
          ? true
          : read === "false"
            ? false
            : null,
    created_at: (row.created_at as string | null) ?? null,
    source_type: (row.source_type as string | null) ?? null,
    source_id: row.source_id != null ? String(row.source_id) : null,
    related_entity_id: row.related_entity_id != null ? String(row.related_entity_id) : null,
    related_entity_type: (row.related_entity_type as string | null) ?? null,
  };
}

export async function fetchUserNotifications(userId: string): Promise<{
  data: AppNotification[];
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .select(
        "id, user_id, recipient_id, type, notification_type, title, message, body, metadata, payload, read, read_at, created_at, source_type, source_id, related_entity_id, related_entity_type, dismissed_at",
      )
      .or(`user_id.eq.${userId},recipient_id.eq.${userId}`)
      .is("dismissed_at", null)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    const rows = (data || []) as Record<string, unknown>[];
    return {
      data: rows.map(rowToAppNotification),
      error: null,
    };
  } catch (e) {
    return { data: [], error: e instanceof Error ? e : new Error(String(e)) };
  }
}

export async function markNotificationRead(
  notificationId: string,
): Promise<{ ok: boolean; error: Error | null }> {
  try {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("notifications")
      .update({ read: true, read_at: now })
      .eq("id", notificationId);
    if (error) throw error;
    return { ok: true, error: null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e : new Error(String(e)) };
  }
}

export async function markAllNotificationsRead(
  userId: string,
): Promise<{ ok: boolean; error: Error | null }> {
  try {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("notifications")
      .update({ read: true, read_at: now })
      .or(`user_id.eq.${userId},recipient_id.eq.${userId}`)
      .or("read.is.null,read.eq.false");
    if (error) throw error;
    return { ok: true, error: null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e : new Error(String(e)) };
  }
}
