/**
 * Messages — conversation list from Supabase.
 */

import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { MessageCircle, Search } from "lucide-react-native";
import { PressableCard } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import { useConversations } from "@/hooks/useConversations";
import type { ConversationSummary } from "@/lib/api/conversations";
import { MainTabHeader } from "@/components/navigation/AppStackHeader";
import { tabPath, useTabRoot } from "@/contexts/TabRootContext";
import { isPractitionerPortalRole } from "@/lib/authRoles";

function formatTime(dateString: string | null) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) {
    return date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  if (diffDays === 1) {
    return "Yesterday";
  }
  if (diffDays < 7) {
    return date.toLocaleDateString("en-GB", { weekday: "short" });
  }
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function ConversationItem({
  conversation,
}: {
  conversation: ConversationSummary;
}) {
  const tabRoot = useTabRoot();
  return (
    <PressableCard
      variant="default"
      padding="md"
      className="mb-2"
      onPress={() =>
        router.push(tabPath(tabRoot, `messages/${conversation.id}`) as never)
      }
    >
      <View className="flex-row items-center">
        <View className="relative">
          <Avatar name={conversation.otherParticipantName} size="lg" />
          {conversation.unreadCount > 0 && (
            <View className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-sage-500 rounded-full items-center justify-center">
              <Text className="text-white text-xs font-bold">
                {conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}
              </Text>
            </View>
          )}
        </View>

        <View className="flex-1 ml-3">
          <View className="flex-row items-center justify-between">
            <Text
              className={`font-semibold ${
                conversation.unreadCount > 0
                  ? "text-charcoal-900"
                  : "text-charcoal-700"
              }`}
            >
              {conversation.otherParticipantName}
            </Text>
            <Text className="text-charcoal-400 text-xs">
              {formatTime(conversation.lastMessageAt)}
            </Text>
          </View>

          <Text
            className={`text-sm mt-1 ${
              conversation.unreadCount > 0
                ? "text-charcoal-700 font-medium"
                : "text-charcoal-500"
            }`}
            numberOfLines={1}
          >
            {conversation.lastMessage ?? "No messages yet"}
          </Text>
        </View>
      </View>
    </PressableCard>
  );
}

export default function MessagesScreen() {
  const tabRoot = useTabRoot();
  const { userId, isAuthenticated, isInitialized, userProfile } = useAuth();
  const isPractitionerUi =
    tabRoot === "/(practitioner)/(ptabs)" ||
    isPractitionerPortalRole(userProfile?.user_role);
  const {
    data: conversations,
    isPending,
    isError,
    error: conversationsError,
    refetch,
    isRefetching,
  } = useConversations(userId);

  const onRefresh = React.useCallback(async () => {
    await refetch();
  }, [refetch]);

  if (isInitialized && !isAuthenticated) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: Colors.cream[50] }}
        edges={["top"]}
      >
        <MainTabHeader title="Messages" />
        <View className="flex-1 items-center justify-center px-8 pb-24">
          <MessageCircle size={48} color={Colors.charcoal[300]} />
          <Text className="text-charcoal-900 font-semibold text-lg mt-6 text-center">
            Sign in to message
          </Text>
          <Text className="text-charcoal-500 mt-2 text-center leading-6">
            {isPractitionerUi
              ? "Sign in with your practitioner account to message clients and reply from Sessions or your diary."
              : "Create an account or sign in to chat with practitioners after you book."}
          </Text>
          <Button
            variant="primary"
            className="mt-8"
            onPress={() => router.push("/login" as never)}
          >
            Sign in
          </Button>
          <Button
            variant="outline"
            className="mt-3"
            onPress={() => router.push("/register" as never)}
          >
            {isPractitionerUi ? "Create practitioner account" : "Create account"}
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: Colors.cream[50] }}
      edges={["top"]}
    >
      <MainTabHeader
        title="Messages"
        right={
          <TouchableOpacity className="p-2 bg-cream-100 rounded-lg" disabled>
            <Search size={20} color={Colors.charcoal[600]} />
          </TouchableOpacity>
        }
      />

      {isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={Colors.sage[500]} />
        </View>
      ) : isError ? (
        <View className="flex-1 px-6 py-10">
          <Text className="text-charcoal-700 text-center">
            {conversationsError instanceof Error
              ? conversationsError.message
              : "Could not load conversations."}
          </Text>
          <TouchableOpacity
            onPress={() => void refetch()}
            className="mt-6 self-center bg-sage-500 px-6 py-3 rounded-xl"
          >
            <Text className="text-white font-semibold">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={conversations ?? []}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={onRefresh}
              tintColor={Colors.sage[500]}
            />
          }
          renderItem={({ item }) => (
            <View style={{ paddingHorizontal: 24 }}>
              <ConversationItem conversation={item} />
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="items-center justify-center py-16 px-6">
              <MessageCircle size={48} color={Colors.charcoal[300]} />
              <Text className="text-charcoal-500 mt-4 text-center">
                No messages yet
              </Text>
              <Text className="text-charcoal-400 mt-2 text-center text-sm">
                {isPractitionerUi
                  ? "Threads appear when clients message you or when you start a chat from a session or client profile."
                  : "Conversations show up when you message a practitioner from booking or their profile."}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
