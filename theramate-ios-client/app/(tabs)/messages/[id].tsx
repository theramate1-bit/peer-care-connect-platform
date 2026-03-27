/**
 * Conversation thread — messages from Supabase + realtime inserts.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft, Send } from "lucide-react-native";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import {
  getMessages,
  sendMessage,
  markMessagesAsRead,
} from "@/lib/api/messages";
import { Avatar } from "@/components/ui/Avatar";
import { Colors } from "@/constants/colors";
import type { Message } from "@/types/database";

export default function ConversationThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId } = useAuth();
  const [peerName, setPeerName] = useState("Messages");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data, error } = await getMessages(id, { limit: 80 });
    if (!error && data) setMessages(data as Message[]);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!id || !userId) return;

    let cancelled = false;

    (async () => {
      const { data: conv } = await supabase
        .from("conversations")
        .select("participant_1_id, participant_2_id")
        .eq("id", id)
        .single();
      if (cancelled || !conv) return;
      const c = conv as { participant_1_id: string; participant_2_id: string };
      const otherId =
        c.participant_1_id === userId ? c.participant_2_id : c.participant_1_id;
      const { data: u } = await supabase
        .from("users")
        .select("first_name, last_name")
        .eq("id", otherId)
        .single();
      if (cancelled || !u) return;
      const row = u as { first_name: string | null; last_name: string | null };
      setPeerName(
        `${row.first_name || ""} ${row.last_name || ""}`.trim() || "Therapist",
      );
    })();

    markMessagesAsRead(id, userId).catch(() => {});

    const channel = supabase
      .channel(`thread:${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${id}`,
        },
        (payload) => {
          const row = payload.new as Message;
          if (row) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === row.id)) return prev;
              return [...prev, row];
            });
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [id, userId]);

  const onSend = async () => {
    const text = input.trim();
    if (!text || !id || !userId) return;
    setSending(true);
    const { data, error } = await sendMessage(id, userId, text);
    setSending(false);
    if (!error && data) {
      setInput("");
      setMessages((prev) => [...prev, data as Message]);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <View className="flex-row items-center px-4 pt-2 pb-3 border-b border-cream-200">
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 -ml-2"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <ChevronLeft size={28} color={Colors.charcoal[800]} />
          </TouchableOpacity>
          <Avatar name={peerName} size="md" className="ml-1" />
          <Text
            className="text-charcoal-900 font-semibold text-lg ml-3 flex-1"
            numberOfLines={1}
          >
            {peerName}
          </Text>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={Colors.sage[500]} />
          </View>
        ) : (
          <FlatList
            className="flex-1 px-4 pt-4"
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={({ item }) => {
              const mine = item.sender_id === userId;
              return (
                <View
                  className={`mb-3 max-w-[85%] ${mine ? "self-end" : "self-start"}`}
                >
                  <View
                    className={`rounded-2xl px-4 py-3 ${
                      mine ? "bg-sage-500" : "bg-cream-200"
                    }`}
                  >
                    <Text className={mine ? "text-white" : "text-charcoal-900"}>
                      {item.content}
                    </Text>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <Text className="text-charcoal-400 text-center mt-8">
                No messages yet. Say hello!
              </Text>
            }
            contentContainerStyle={{ paddingBottom: 16 }}
          />
        )}

        <View className="flex-row items-end px-4 py-3 border-t border-cream-200 bg-cream-50">
          <TextInput
            className="flex-1 bg-cream-100 rounded-xl px-4 py-3 text-charcoal-900 max-h-32"
            placeholder="Type a message…"
            placeholderTextColor={Colors.charcoal[400]}
            value={input}
            onChangeText={setInput}
            multiline
            editable={!!userId}
          />
          <TouchableOpacity
            onPress={onSend}
            disabled={sending || !input.trim()}
            className="ml-2 p-3 bg-sage-500 rounded-xl"
            style={{ opacity: sending || !input.trim() ? 0.5 : 1 }}
          >
            {sending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Send size={22} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
