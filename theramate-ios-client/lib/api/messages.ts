/**
 * Messages API
 * API functions for messaging operations
 */

import { supabase, realtimeHelpers } from '../supabase';

export type ConversationListRow = {
  conversation_id: string;
  other_participant_id: string;
  other_participant_name: string;
  other_participant_role: string | null;
  last_message_content: string | null;
  last_message_at: string | null;
  unread_count: number | null;
  guest_email: string | null;
  pending_account_creation: boolean | null;
};

export type ConversationMessageRow = {
  id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  message_type: string | null;
  created_at: string | null;
  read_at: string | null;
};

/**
 * Get user's conversations
 */
export async function getConversations(userId: string) {
  const { data, error } = await supabase.rpc("get_user_conversations", {
    p_user_id: userId,
    p_limit: 200,
    p_offset: 0,
  });

  return { data: (data || []) as ConversationListRow[], error };
}

/**
 * Get or create conversation between two users
 */
export async function getOrCreateConversation(userId1: string, userId2: string) {
  const twoArg = await supabase.rpc("get_or_create_conversation", {
    p_user1_id: userId1,
    p_user2_id: userId2,
  });
  if (!twoArg.error) {
    return { data: twoArg.data as string | null, error: null, created: null };
  }

  const msg = (twoArg.error.message || "").toLowerCase();
  const noMatchingFn =
    msg.includes("could not find the function") ||
    msg.includes("function public.get_or_create_conversation") ||
    twoArg.error.code === "42883";

  if (!noMatchingFn) {
    return { data: null, error: twoArg.error, created: null };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const self = user?.id;
  if (!self) {
    return {
      data: null,
      error: new Error("Not authenticated"),
      created: null,
    };
  }
  const other =
    self === userId1 ? userId2 : self === userId2 ? userId1 : null;
  if (!other) {
    return {
      data: null,
      error: new Error("Conversation participants must include signed-in user"),
      created: null,
    };
  }

  const oneArg = await supabase.rpc("get_or_create_conversation", {
    p_other_user_id: other,
  });
  return {
    data: oneArg.data as string | null,
    error: oneArg.error,
    created: null,
  };
}

/**
 * Get messages for a conversation.
 * Pass `viewerUserId` (same as the signed-in user) so membership checks match the
 * Zustand session — `getUser()` alone can lag or return null right after refresh.
 */
export async function getMessages(
  conversationId: string,
  options: { limit?: number; offset?: number } = {},
  viewerUserId?: string | null,
) {
  const { limit = 50, offset = 0 } = options;
  const uid =
    viewerUserId ??
    (await supabase.auth.getUser()).data.user?.id ??
    null;
  if (!uid) {
    return {
      data: [] as ConversationMessageRow[],
      error: new Error("Not authenticated"),
    };
  }
  const { data, error } = await supabase.rpc("get_conversation_messages", {
    p_conversation_id: conversationId,
    p_user_id: uid,
    p_limit: limit,
    p_offset: offset,
  });

  return { data: (data || []) as ConversationMessageRow[], error };
}

/**
 * Send a message
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string
) {
  const { data: messageId, error } = await supabase.rpc("send_message", {
    p_conversation_id: conversationId,
    p_sender_id: senderId,
    p_content: content,
    p_message_type: "text",
  });

  if (error || !messageId) return { data: null, error };

  // Re-fetch and take the newest row (RPC order may be ASC or DESC).
  const { data: rows, error: refErr } = await getMessages(
    conversationId,
    { limit: 120, offset: 0 },
    senderId,
  );
  if (refErr) return { data: null, error: refErr };
  const list = rows || [];
  if (list.length === 0) return { data: null, error: null };
  const sorted = [...list].sort(
    (a, b) =>
      new Date(a.created_at || 0).getTime() -
      new Date(b.created_at || 0).getTime(),
  );
  return { data: sorted[sorted.length - 1] ?? null, error: null };
}

/**
 * Mark messages as read
 */
export async function markMessagesAsRead(conversationId: string, userId: string) {
  try {
    const { data: rows, error: lastErr } = await getMessages(
      conversationId,
      { limit: 50, offset: 0 },
      userId,
    );
    if (lastErr) throw lastErr;
    const list = rows || [];
    const sorted = [...list].sort(
      (a, b) =>
        new Date(a.created_at || 0).getTime() -
        new Date(b.created_at || 0).getTime(),
    );
    const last = sorted[sorted.length - 1];
    const now = new Date().toISOString();

    // Update existing participant row; if missing, insert a minimal record.
    const { data: existing, error: findErr } = await supabase
      .from("conversation_participants")
      .select("id")
      .eq("conversation_id", conversationId)
      .eq("user_id", userId)
      .maybeSingle();
    if (findErr) throw findErr;

    if (existing?.id) {
      const { error } = await supabase
        .from("conversation_participants")
        .update({
          last_read_at: now,
          last_read_message_id: last?.id ?? null,
        })
        .eq("id", (existing as { id: string }).id);
      return { error };
    }

    const c = globalThis.crypto;
    const id = c?.randomUUID ? c.randomUUID() : `${Date.now()}-${Math.random()}`;
    const { error } = await supabase.from("conversation_participants").insert({
      id,
      conversation_id: conversationId,
      user_id: userId,
      last_read_at: now,
      last_read_message_id: last?.id ?? null,
    });
    return { error };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error(String(e)) };
  }
}

/**
 * Get unread message count for a user
 */
export async function getUnreadCount(userId: string) {
  const { data, error } = await supabase.rpc("get_user_conversations", {
    p_user_id: userId,
    p_limit: 200,
    p_offset: 0,
  });
  if (error) return { count: 0, error };
  const rows = (data || []) as ConversationListRow[];
  const count = rows.reduce((acc, r) => acc + (r.unread_count ?? 0), 0);
  return { count, error: null };
}

/**
 * Subscribe to new messages in a conversation
 */
export function subscribeToMessages(
  conversationId: string,
  onMessage: (message: unknown) => void
) {
  return realtimeHelpers.subscribeToMessages(conversationId, (payload) => {
    if (payload.new) {
      onMessage(payload.new as unknown);
    }
  });
}

/**
 * Unsubscribe from messages
 */
export function unsubscribeFromMessages(
  channel: ReturnType<typeof supabase.channel>
) {
  realtimeHelpers.unsubscribe(channel);
}

