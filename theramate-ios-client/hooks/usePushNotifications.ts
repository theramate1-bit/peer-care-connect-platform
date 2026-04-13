import { useEffect, useRef } from "react";
import { router } from "expo-router";
import * as Notifications from "expo-notifications";

import { resolveNotificationNavigationFromPushData } from "@/lib/notificationNavigation";
import { openNotificationAbsoluteUrl } from "@/lib/notificationUrlOpen";
import { useAuthStore } from "@/stores/authStore";
import {
  registerForPushNotificationsAsync,
  removeNotificationSubscriptions,
  subscribeToNotificationEvents,
  syncPushTokenForUser,
  type NotificationSubscriptions,
} from "@/lib/notifications";

function navigateFromPushData(rawData: unknown) {
  const nav = resolveNotificationNavigationFromPushData(
    rawData,
    useAuthStore.getState().userProfile?.user_role,
  );
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
        navigateFromPushData(response.notification.request.content.data);
      },
    });

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      navigateFromPushData(response.notification.request.content.data);
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
