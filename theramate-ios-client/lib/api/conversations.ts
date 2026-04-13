/**
 * Conversation list summaries for the Messages tab (last message + unread).
 */

import { supabase } from "@/lib/supabase";
import type { ConversationListRow } from "@/lib/api/messages";

export type ConversationSummary = {
  id: string;
  otherParticipantName: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
};

export async function fetchConversationSummaries(userId: string): Promise<{
  data: ConversationSummary[];
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase.rpc("get_user_conversations", {
      p_user_id: userId,
      p_limit: 200,
      p_offset: 0,
    });
    if (error) throw error;

    const rows = (data || []) as ConversationListRow[];
    const summaries: ConversationSummary[] = rows.map((r) => ({
      id: r.conversation_id,
      otherParticipantName: r.other_participant_name || "Conversation",
      lastMessage: r.last_message_content ?? null,
      lastMessageAt: r.last_message_at ?? null,
      unreadCount: r.unread_count ?? 0,
    }));

    return { data: summaries, error: null };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    return { data: [], error: err };
  }
}
