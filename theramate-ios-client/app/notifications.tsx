import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, ChevronLeft } from "lucide-react-native";
import { formatDistanceToNowStrict } from "date-fns";

import { AppStackHeader } from "@/components/navigation/AppStackHeader";
import { Button } from "@/components/ui/Button";
import { Colors } from "@/constants/colors";
import { defaultSignedInProfileHref } from "@/lib/navigation";
import { tabPath } from "@/contexts/TabRootContext";
import { getMainAppHref } from "@/lib/postAuthRoute";
import { resolveNotificationNavigation } from "@/lib/notificationNavigation";
import { openNotificationAbsoluteUrl } from "@/lib/notificationUrlOpen";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/stores/authStore";
import {
  fetchUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from "@/lib/api/notifications";

function payloadRecord(item: AppNotification): Record<string, unknown> {
  const d = item.data;
  if (d && typeof d === "object" && !Array.isArray(d)) {
    return d as Record<string, unknown>;
  }
  return {};
}

function NotificationItem({
  item,
  onPress,
}: {
  item: AppNotification;
  onPress: () => void;
}) {
  const created = item.created_at ? new Date(item.created_at) : null;
  const when = created ? `${formatDistanceToNowStrict(created)} ago` : "";
  const unread = item.is_read !== true;
  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-white border border-cream-200 rounded-xl p-4 mb-3"
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-charcoal-900 font-semibold">
            {item.title || "Notification"}
          </Text>
          {item.message ? (
            <Text className="text-charcoal-600 mt-1">{item.message}</Text>
          ) : null}
          {when ? (
            <Text className="text-charcoal-400 text-xs mt-2">{when}</Text>
          ) : null}
        </View>
        {unread ? (
          <View className="w-2.5 h-2.5 rounded-full bg-sage-500 mt-1" />
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export default function NotificationsInboxScreen() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  const {
    data = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["notifications_inbox", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await fetchUserNotifications(userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const readAll = async () => {
    if (!userId) return;
    const result = await markAllNotificationsRead(userId);
    if (result.ok) {
      await queryClient.invalidateQueries({
        queryKey: ["notifications_inbox", userId],
      });
    }
  };

  const openNotification = async (item: AppNotification) => {
    if (item.is_read !== true) {
      await markNotificationRead(item.id);
      await queryClient.invalidateQueries({
        queryKey: ["notifications_inbox", userId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["practitioner_dashboard", userId],
      });
    }
    const p = payloadRecord(item);
    const nav = resolveNotificationNavigation({
      payload: p,
      sourceType: item.source_type,
      sourceId: item.source_id,
      relatedEntityType: item.related_entity_type,
      relatedEntityId: item.related_entity_id,
      role: useAuthStore.getState().userProfile?.user_role,
    });
    if (nav?.kind === "route") {
      router.push(nav.path as never);
      return;
    }
    if (nav?.kind === "url") {
      openNotificationAbsoluteUrl(
        nav.url,
        useAuthStore.getState().userProfile?.user_role,
      );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
      <AppStackHeader
        title="Notifications"
        fallbackHref={defaultSignedInProfileHref()}
        right={
          <TouchableOpacity onPress={() => void readAll()} className="px-2 py-1">
            <Text className="text-sage-600 font-medium">Mark read</Text>
          </TouchableOpacity>
        }
      />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={Colors.sage[500]} />
        </View>
      ) : isError ? (
        <View className="flex-1 px-6 pt-10">
          <Text className="text-charcoal-700 text-center">
            {error instanceof Error
              ? error.message
              : "Could not load notifications."}
          </Text>
          <Button
            variant="primary"
            className="mt-5"
            onPress={() => void refetch()}
          >
            Retry
          </Button>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          className="px-6 pt-4"
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshing={isFetching && !isLoading}
          onRefresh={() => void refetch()}
          renderItem={({ item }) => (
            <NotificationItem
              item={item}
              onPress={() => void openNotification(item)}
            />
          )}
          ListEmptyComponent={
            <View className="py-16 items-center">
              <Bell size={40} color={Colors.charcoal[300]} />
              <Text className="text-charcoal-500 mt-3">
                No notifications yet.
              </Text>
              <Button
                variant="outline"
                className="mt-4"
                onPress={() => {
                  const root = getMainAppHref(
                    useAuthStore.getState().userProfile?.user_role,
                  );
                  router.push(
                    tabPath(root, "profile/notifications") as never,
                  );
                }}
              >
                Notification preferences
              </Button>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
