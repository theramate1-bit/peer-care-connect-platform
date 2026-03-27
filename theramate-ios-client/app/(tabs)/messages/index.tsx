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
import Animated, { FadeInDown } from "react-native-reanimated";
import { MessageCircle, Search } from "lucide-react-native";
import { PressableCard } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import { useConversations } from "@/hooks/useConversations";
import type { ConversationSummary } from "@/lib/api/conversations";

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
  return (
    <PressableCard
      variant="default"
      padding="md"
      className="mb-2"
      onPress={() => router.push(`/(tabs)/messages/${conversation.id}`)}
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
  const { userId } = useAuth();
  const {
    data: conversations,
    isPending,
    refetch,
    isRefetching,
  } = useConversations(userId);

  const onRefresh = React.useCallback(async () => {
    await refetch();
  }, [refetch]);

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
      <Animated.View
        entering={FadeInDown.delay(100).duration(500)}
        className="px-6 pt-4 pb-4"
      >
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-charcoal-900 text-2xl font-bold">Messages</Text>
          <TouchableOpacity className="p-2 bg-cream-100 rounded-lg" disabled>
            <Search size={20} color={Colors.charcoal[600]} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={Colors.sage[500]} />
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
          renderItem={({ item, index }) => (
            <Animated.View
              entering={FadeInDown.delay(200 + index * 50).duration(400)}
              className="px-6"
            >
              <ConversationItem conversation={item} />
            </Animated.View>
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
                Conversations appear here when you message a therapist
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
