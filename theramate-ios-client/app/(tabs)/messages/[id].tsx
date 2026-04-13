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
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

import { tabPath, useTabRoot } from "@/contexts/TabRootContext";
import { goBackOrReplace } from "@/lib/navigation";
import { ChevronLeft, Paperclip, Send } from "lucide-react-native";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import {
  getMessages,
  sendMessage,
  markMessagesAsRead,
} from "@/lib/api/messages";
import * as DocumentPicker from "expo-document-picker";
import {
  fetchMessageAttachmentsForMessages,
  getMessageAttachmentSignedUrl,
  uploadMessageAttachment,
  type MessageAttachmentRow,
} from "@/lib/api/messageAttachments";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Colors } from "@/constants/colors";
import type { ConversationMessageRow } from "@/lib/api/messages";
import { openHostedWebSession } from "@/lib/openHostedWeb";

export default function ConversationThreadScreen() {
  const tabRoot = useTabRoot();
  /** Tabs use an absolute tab bar; without bottom padding it covers the composer and steals taps. */
  const tabBarHeight = useBottomTabBarHeight();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId, isInitialized, isAuthenticated } = useAuth();
  const composerPlaceholder =
    tabRoot === "/(practitioner)/(ptabs)"
      ? "Message your client…"
      : "Message your practitioner…";
  const peerFallback =
    tabRoot === "/(practitioner)/(ptabs)" ? "Client" : "Therapist";
  const [peerName, setPeerName] = useState("Messages");
  const [messages, setMessages] = useState<ConversationMessageRow[]>([]);
  const [attachments, setAttachments] = useState<MessageAttachmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [attachBusy, setAttachBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id || !userId) return;
    setLoading(true);
    setLoadError(null);
    const { data, error } = await getMessages(id, { limit: 80, offset: 0 }, userId);
    if (error) {
      setMessages([]);
      setAttachments([]);
      setLoadError(
        error instanceof Error ? error.message : "Could not load messages.",
      );
    } else if (data) {
      setMessages(data);
      const ids = data.map((m) => m.id);
      const { data: atts } = await fetchMessageAttachmentsForMessages(ids);
      setAttachments(atts);
    }
    setLoading(false);
  }, [id, userId]);

  useEffect(() => {
    if (!id) return;
    if (!userId) {
      if (isInitialized) setLoading(false);
      return;
    }
    void load();
  }, [id, userId, isInitialized, load]);

  useEffect(() => {
    if (!id || !userId) return;

    let cancelled = false;

    (async () => {
      const { data: conv } = await supabase
        .from("conversations")
        .select("participant1_id, participant2_id")
        .eq("id", id)
        .single();
      if (cancelled || !conv) return;
      const c = conv as { participant1_id: string; participant2_id: string | null };
      const otherId =
        c.participant1_id === userId ? c.participant2_id : c.participant1_id;
      if (!otherId) return;
      const { data: u } = await supabase
        .from("users")
        .select("first_name, last_name")
        .eq("id", otherId)
        .single();
      if (cancelled || !u) return;
      const row = u as { first_name: string | null; last_name: string | null };
      setPeerName(
        `${row.first_name || ""} ${row.last_name || ""}`.trim() || peerFallback,
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
        () => {
          // Messages are stored encrypted in `messages`. Re-fetch via RPC for decrypted content.
          load().catch(() => {});
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "message_attachments",
        },
        (payload) => {
          const row = payload.new as MessageAttachmentRow;
          if (!row?.message_id) return;
          setAttachments((prev) => {
            if (prev.some((a) => a.id === row.id)) return prev;
            return [...prev, row];
          });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [id, userId, peerFallback]);

  const onSend = async () => {
    const text = input.trim();
    if (!text || !id || !userId) return;
    setSending(true);
    const { data, error } = await sendMessage(id, userId, text);
    setSending(false);
    if (error) {
      Alert.alert(
        "Message not sent",
        error instanceof Error ? error.message : "Please try again.",
      );
      return;
    }
    setInput("");
    if (data) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev;
        return [...prev, data];
      });
    } else {
      void load();
    }
  };

  const onPickAttachment = async () => {
    if (!id || !userId || attachBusy) return;
    let pick: Awaited<ReturnType<typeof DocumentPicker.getDocumentAsync>>;
    try {
      pick = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert(
        "File picker not available",
        msg.includes("native module") || msg.includes("NativeModule")
          ? "Run a fresh native build (pods + rebuild). The document picker is native."
          : msg,
      );
      return;
    }
    if (pick.canceled || !pick.assets?.length) return;
    const a = pick.assets[0];
    if (!a.uri || !a.name) return;

    setAttachBusy(true);
    try {
      // Create a message first (so attachment has a message_id)
      const { data: msgRow, error: msgErr } = await sendMessage(
        id,
        userId,
        `📎 ${a.name}`,
      );
      if (msgErr || !msgRow) {
        Alert.alert("Error", msgErr?.message || "Could not create message.");
        return;
      }
      setMessages((prev) => [...prev, msgRow]);

      const res = await uploadMessageAttachment({
        conversationId: id,
        messageId: msgRow.id,
        fileUri: a.uri,
        fileName: a.name,
        mimeType: a.mimeType ?? null,
      });
      if (!res.ok) {
        Alert.alert("Upload failed", res.error?.message || "Try again.");
        return;
      }
      const { data: atts } = await fetchMessageAttachmentsForMessages([
        msgRow.id,
      ]);
      if (atts.length) {
        setAttachments((prev) => [...prev, ...atts]);
      }
    } finally {
      setAttachBusy(false);
    }
  };

  const onOpenAttachment = async (objectPath: string) => {
    const { url, error } = await getMessageAttachmentSignedUrl(objectPath);
    if (error || !url) {
      Alert.alert("Could not open file", error?.message || "");
      return;
    }
    openHostedWebSession({ kind: "signed_document", url });
  };

  if (isInitialized && !isAuthenticated) {
    return (
      <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
        <View className="flex-row items-center px-4 pt-2 pb-3 border-b border-cream-200">
          <TouchableOpacity
            onPress={() => goBackOrReplace(tabPath(tabRoot, "messages"))}
            className="p-2 -ml-2"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <ChevronLeft size={28} color={Colors.charcoal[800]} />
          </TouchableOpacity>
          <Text className="text-charcoal-900 font-semibold text-lg ml-2">
            Messages
          </Text>
        </View>
        <View className="flex-1 px-6 justify-center">
          <Text className="text-charcoal-600 text-center leading-6">
            Sign in to open this conversation.
          </Text>
          <Button
            variant="primary"
            className="mt-8"
            onPress={() => router.push("/login" as never)}
          >
            Sign in
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <View className="flex-row items-center px-4 pt-2 pb-3 border-b border-cream-200">
          <TouchableOpacity
            onPress={() => goBackOrReplace(tabPath(tabRoot, "messages"))}
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
        ) : loadError ? (
          <View className="flex-1 px-6 pt-8">
            <Text className="text-charcoal-600 text-center leading-6">
              {loadError}
            </Text>
            <Button
              variant="primary"
              className="mt-6"
              onPress={() => void load()}
            >
              <Text className="text-white font-semibold">Retry</Text>
            </Button>
          </View>
        ) : (
          <FlatList
            className="flex-1 px-4 pt-4"
            data={messages}
            keyExtractor={(m) => m.id}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            renderItem={({ item }) => {
              const mine = item.sender_id === userId;
              const atts = attachments.filter((a) => a.message_id === item.id);
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

                  {atts.length ? (
                    <View className="mt-2">
                      {atts.map((att) => (
                        <TouchableOpacity
                          key={att.id}
                          onPress={() => void onOpenAttachment(att.encrypted_file_path)}
                          className={`px-3 py-2 rounded-xl border ${
                            mine ? "border-sage-500" : "border-cream-200"
                          }`}
                        >
                          <Text className={mine ? "text-sage-700" : "text-charcoal-700"}>
                            {att.file_name}
                          </Text>
                          <Text className="text-charcoal-400 text-xs mt-1">
                            {(att.file_size / 1024).toFixed(0)} KB
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : null}
                </View>
              );
            }}
            ListEmptyComponent={
              <Text className="text-charcoal-400 text-center mt-8 px-4">
                {tabRoot === "/(practitioner)/(ptabs)"
                  ? "No messages yet. Say hello or share a quick update with your client."
                  : "No messages yet. Say hello to your practitioner."}
              </Text>
            }
            contentContainerStyle={{ paddingBottom: 16 }}
          />
        )}

        <View
          className="flex-row items-end px-4 pt-3 border-t border-cream-200 bg-cream-50"
          style={{
            paddingBottom: Math.max(tabBarHeight, 12) + 8,
          }}
        >
          <TouchableOpacity
            onPress={() => void onPickAttachment()}
            disabled={!userId || attachBusy}
            className="mr-2 p-3 bg-cream-100 rounded-xl"
            style={{ opacity: !userId || attachBusy ? 0.5 : 1 }}
          >
            {attachBusy ? (
              <ActivityIndicator color={Colors.sage[500]} size="small" />
            ) : (
              <Paperclip size={20} color={Colors.charcoal[700]} />
            )}
          </TouchableOpacity>
          <TextInput
            className="flex-1 bg-cream-100 rounded-xl px-4 py-3 text-charcoal-900 max-h-32"
            placeholder={composerPlaceholder}
            placeholderTextColor={Colors.charcoal[400]}
            value={input}
            onChangeText={setInput}
            multiline
            editable={!!userId}
            textAlignVertical="top"
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
