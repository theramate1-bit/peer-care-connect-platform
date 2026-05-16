/**
 * Blocked time — parity with web `BlockTimeManager.tsx` (calendar_events).
 */

import {
  addDays,
  addMonths,
  endOfDay,
  format,
  parseISO,
  startOfDay,
} from "date-fns";

import { supabase } from "@/lib/supabase";

export type RecurrenceType = "none" | "daily" | "weekly" | "monthly";

export type BlockTimeRow = {
  id: string;
  user_id: string;
  start_time: string;
  end_time: string;
  event_type: "block" | "unavailable";
  title: string;
  description?: string | null;
  status: string;
  provider?: string | null;
};

/** Upcoming block/unavailable rows (matches web `fetchBlocks`). */
export async function fetchUpcomingBlocks(userId: string): Promise<{
  data: BlockTimeRow[];
  error: Error | null;
}> {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("calendar_events")
      .select("*")
      .eq("user_id", userId)
      .in("event_type", ["block", "unavailable"])
      .eq("status", "confirmed")
      .gt("end_time", now)
      .order("start_time", { ascending: true });

    if (error) throw error;
    return { data: (data || []) as BlockTimeRow[], error: null };
  } catch (e) {
    return {
      data: [],
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}

/** Same algorithm as web `generateRecurringEvents`. */
export function generateRecurringEvents(
  startTime: Date,
  endTime: Date,
  recurrenceType: RecurrenceType,
  endDate: Date,
): Array<{ start: Date; end: Date }> {
  const events: Array<{ start: Date; end: Date }> = [];
  let current = new Date(startTime);

  while (current <= endDate) {
    events.push({
      start: new Date(current),
      end: new Date(
        endTime.getTime() + (current.getTime() - startTime.getTime()),
      ),
    });

    switch (recurrenceType) {
      case "daily":
        current = addDays(current, 1);
        break;
      case "weekly":
        current = addDays(current, 7);
        break;
      case "monthly":
        current = addMonths(current, 1);
        break;
      default:
        break;
    }
  }

  return events;
}

type BlockInsert = {
  user_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  event_type: "block" | "unavailable";
  status: "confirmed";
  provider: "internal";
};

export async function insertBlocksBatch(
  rows: BlockInsert[],
): Promise<{ ok: boolean; error: Error | null }> {
  try {
    if (rows.length === 0) return { ok: true, error: null };
    const { error } = await supabase.from("calendar_events").insert(rows);
    if (error) throw error;
    return { ok: true, error: null };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}

export async function insertSingleBlock(
  row: BlockInsert,
): Promise<{ ok: boolean; error: Error | null }> {
  return insertBlocksBatch([row]);
}

export async function updateBlock(params: {
  blockId: string;
  userId: string;
  row: Omit<BlockInsert, "user_id">;
}): Promise<{ ok: boolean; error: Error | null }> {
  try {
    const { error } = await supabase
      .from("calendar_events")
      .update({
        title: params.row.title,
        description: params.row.description,
        start_time: params.row.start_time,
        end_time: params.row.end_time,
        event_type: params.row.event_type,
        status: params.row.status,
        provider: params.row.provider,
      })
      .eq("id", params.blockId)
      .eq("user_id", params.userId);
    if (error) throw error;
    return { ok: true, error: null };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}

export async function deleteBlock(params: {
  blockId: string;
  userId: string;
}): Promise<{ ok: boolean; error: Error | null }> {
  try {
    const { error } = await supabase
      .from("calendar_events")
      .delete()
      .eq("id", params.blockId)
      .eq("user_id", params.userId);
    if (error) throw error;
    return { ok: true, error: null };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}

export function formatBlockTimeRange(block: BlockTimeRow): string {
  const start = parseISO(block.start_time);
  const end = parseISO(block.end_time);
  const isAllDay =
    format(start, "HH:mm") === "00:00" && format(end, "HH:mm") === "23:59";
  if (isAllDay) {
    return format(start, "MMM d, yyyy") + " (All day)";
  }
  return `${format(start, "MMM d, yyyy")} ${format(start, "HH:mm")} – ${format(end, "HH:mm")}`;
}

export function buildBlockInsertBase(
  userId: string,
): Pick<BlockInsert, "user_id" | "status" | "provider"> {
  return {
    user_id: userId,
    status: "confirmed",
    provider: "internal",
  };
}

export { startOfDay, endOfDay, format, parseISO };
