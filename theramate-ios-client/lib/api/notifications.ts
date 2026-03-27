import { supabase } from "@/lib/supabase";

export type AppNotification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string | null;
  data: unknown;
  is_read: boolean | null;
  created_at: string | null;
};

export async function fetchUserNotifications(userId: string): Promise<{
  data: AppNotification[];
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("id, user_id, type, title, message, data, is_read, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return { data: (data || []) as AppNotification[], error: null };
  } catch (e) {
    return { data: [], error: e instanceof Error ? e : new Error(String(e)) };
  }
}

export async function markNotificationRead(
  notificationId: string,
): Promise<{ ok: boolean; error: Error | null }> {
  try {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
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
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .or("is_read.is.null,is_read.eq.false");
    if (error) throw error;
    return { ok: true, error: null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e : new Error(String(e)) };
  }
}
