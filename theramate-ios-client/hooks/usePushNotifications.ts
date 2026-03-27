import { useEffect, useRef } from "react";
import { router } from "expo-router";
import * as Notifications from "expo-notifications";

import { useAuthStore } from "@/stores/authStore";
import {
  registerForPushNotificationsAsync,
  removeNotificationSubscriptions,
  subscribeToNotificationEvents,
  syncPushTokenForUser,
  type NotificationSubscriptions,
} from "@/lib/notifications";

function routeFromNotificationData(rawData: unknown): string | null {
  const data =
    rawData && typeof rawData === "object"
      ? (rawData as Record<string, unknown>)
      : {};

  const explicitRoute = typeof data.route === "string" ? data.route : null;
  if (explicitRoute) return explicitRoute;

  const screen = typeof data.screen === "string" ? data.screen : null;
  if (screen === "notifications" || screen === "inbox") {
    return "/notifications";
  }
  if (screen === "mobile_requests" || screen === "mobile-booking") {
    return "/(tabs)/profile/mobile-requests";
  }
  if (screen === "bookings" && typeof data.session_id === "string") {
    return `/(tabs)/bookings/${data.session_id}`;
  }
  if (screen === "messages" && typeof data.conversation_id === "string") {
    return `/(tabs)/messages/${data.conversation_id}`;
  }
  if (screen === "explore" && typeof data.practitioner_id === "string") {
    return `/(tabs)/explore/${data.practitioner_id}`;
  }

  if (typeof data.session_id === "string") {
    return `/(tabs)/bookings/${data.session_id}`;
  }
  if (typeof data.conversation_id === "string") {
    return `/(tabs)/messages/${data.conversation_id}`;
  }
  if (typeof data.practitioner_id === "string") {
    return `/(tabs)/explore/${data.practitioner_id}`;
  }

  return null;
}

export function usePushNotifications() {
  const authUser = useAuthStore((s) => s.authUser);
  const userProfile = useAuthStore((s) => s.userProfile);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const subsRef = useRef<NotificationSubscriptions | null>(null);

  useEffect(() => {
    subsRef.current = subscribeToNotificationEvents({
      onReceive: () => {},
      onResponse: (response) => {
        const path = routeFromNotificationData(
          response.notification.request.content.data,
        );
        if (path) {
          router.push(path as never);
        }
      },
    });

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      const path = routeFromNotificationData(
        response.notification.request.content.data,
      );
      if (path) {
        router.push(path as never);
      }
    });

    return () => {
      removeNotificationSubscriptions(subsRef.current);
      subsRef.current = null;
    };
  }, []);

  useEffect(() => {
    async function syncToken() {
      if (!authUser?.id) return;
      const token = await registerForPushNotificationsAsync();
      if (!token) return;

      const currentToken =
        userProfile?.preferences &&
        typeof userProfile.preferences === "object" &&
        "expo_push_token" in
          (userProfile.preferences as Record<string, unknown>)
          ? ((userProfile.preferences as Record<string, unknown>)
              .expo_push_token as string | undefined)
          : undefined;

      if (currentToken === token) return;

      const result = await syncPushTokenForUser({
        userId: authUser.id,
        token,
        existingPreferences: userProfile?.preferences ?? null,
      });

      if (result.ok) {
        await refreshProfile();
      }
    }

    void syncToken();
  }, [authUser?.id, userProfile?.preferences, refreshProfile]);
}
