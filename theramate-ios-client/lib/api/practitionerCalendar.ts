/**
 * Practitioner calendar blocks (`calendar_events`) for diary / schedule views.
 */

import { supabase } from "@/lib/supabase";

export type CalendarBlockEvent = {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  event_type: string | null;
  status: string | null;
  provider: string | null;
};

export async function fetchPractitionerCalendarEvents(params: {
  userId: string;
  rangeStart: string;
  rangeEnd: string;
}): Promise<{ data: CalendarBlockEvent[]; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from("calendar_events")
      .select("id, title, start_time, end_time, event_type, status, provider")
      .eq("user_id", params.userId)
      // Overlap filter (not full containment) to avoid dropping events crossing range edges.
      .lt("start_time", params.rangeEnd)
      .gt("end_time", params.rangeStart)
      .order("start_time", { ascending: true });

    if (error) throw error;

    return {
      data: (data || []) as CalendarBlockEvent[],
      error: null,
    };
  } catch (e) {
    return {
      data: [],
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}

/** Manual blocked time (`provider: internal`, `event_type: block`). */
export async function insertPractitionerCalendarBlock(params: {
  userId: string;
  title: string;
  startTimeIso: string;
  endTimeIso: string;
  description?: string | null;
}): Promise<{ ok: boolean; error: Error | null; id?: string }> {
  try {
    const { data, error } = await supabase
      .from("calendar_events")
      .insert({
        user_id: params.userId,
        event_type: "block",
        title: params.title.trim() || "Blocked",
        description: params.description?.trim() || null,
        start_time: params.startTimeIso,
        end_time: params.endTimeIso,
        provider: "internal",
        status: "confirmed",
      })
      .select("id")
      .single();
    if (error) throw error;
    return {
      ok: true,
      error: null,
      id: (data as { id: string } | null)?.id,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}

export async function deletePractitionerCalendarEvent(params: {
  eventId: string;
}): Promise<{ ok: boolean; error: Error | null }> {
  try {
    const { error } = await supabase
      .from("calendar_events")
      .delete()
      .eq("id", params.eventId);
    if (error) throw error;
    return { ok: true, error: null };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}
