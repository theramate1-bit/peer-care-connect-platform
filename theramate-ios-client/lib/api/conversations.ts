/**
 * Conversation list summaries for the Messages tab (last message + unread).
 */

import { supabase } from "@/lib/supabase";

export type ConversationSummary = {
  id: string;
  otherParticipantName: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
};

type ConvRow = {
  id: string;
  participant_1_id: string;
  participant_2_id: string;
  last_message_at: string | null;
  unread_count_1: number | null;
  unread_count_2: number | null;
};

function formatName(first: string | null, last: string | null): string {
  const n = `${first || ""} ${last || ""}`.trim();
  return n || "Therapist";
}

export async function fetchConversationSummaries(userId: string): Promise<{
  data: ConversationSummary[];
  error: Error | null;
}> {
  try {
    const { data: convs, error } = await supabase
      .from("conversations")
      .select(
        "id, participant_1_id, participant_2_id, last_message_at, unread_count_1, unread_count_2",
      )
      .or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`)
      .order("last_message_at", { ascending: false, nullsFirst: false });

    if (error) throw error;

    const rows = (convs || []) as ConvRow[];
    if (rows.length === 0) {
      return { data: [], error: null };
    }

    const otherIds = rows.map((r) =>
      r.participant_1_id === userId ? r.participant_2_id : r.participant_1_id,
    );
    const uniqueOther = [...new Set(otherIds)];

    const { data: usersData, error: usersErr } = await supabase
      .from("users")
      .select("id, first_name, last_name")
      .in("id", uniqueOther);
    if (usersErr) throw usersErr;

    type URow = {
      id: string;
      first_name: string | null;
      last_name: string | null;
    };
    const nameById = new Map<string, string>();
    for (const u of (usersData || []) as URow[]) {
      nameById.set(u.id, formatName(u.first_name, u.last_name));
    }

    const lastByConv = await Promise.all(
      rows.map(async (r) => {
        const { data: last } = await supabase
          .from("messages")
          .select("content, created_at")
          .eq("conversation_id", r.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        const row = last as {
          content: string;
          created_at: string | null;
        } | null;
        return {
          conversationId: r.id,
          content: row?.content ?? null,
          created_at: row?.created_at ?? null,
        };
      }),
    );

    const lastMap = new Map(lastByConv.map((x) => [x.conversationId, x]));

    const summaries: ConversationSummary[] = rows.map((r) => {
      const otherId =
        r.participant_1_id === userId ? r.participant_2_id : r.participant_1_id;
      const unread =
        r.participant_1_id === userId
          ? (r.unread_count_1 ?? 0)
          : (r.unread_count_2 ?? 0);
      const last = lastMap.get(r.id);
      return {
        id: r.id,
        otherParticipantName: nameById.get(otherId) ?? "Conversation",
        lastMessage: last?.content ?? null,
        lastMessageAt: last?.created_at ?? r.last_message_at,
        unreadCount: unread,
      };
    });

    return { data: summaries, error: null };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    return { data: [], error: err };
  }
}
