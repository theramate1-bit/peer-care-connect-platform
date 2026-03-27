import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";

import { supabase } from "@/lib/supabase";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function getProjectId(): string | undefined {
  const fromExpoConfig = Constants.expoConfig?.extra?.eas?.projectId as
    | string
    | undefined;
  const fromEasConfig = Constants.easConfig?.projectId;
  return fromExpoConfig || fromEasConfig;
}

export async function registerForPushNotificationsAsync(): Promise<
  string | null
> {
  if (!Device.isDevice) {
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#7A9E7E",
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  const projectId = getProjectId();
  if (!projectId) {
    return null;
  }

  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data;
}

export async function syncPushTokenForUser(params: {
  userId: string;
  token: string;
  existingPreferences: unknown;
}): Promise<{ ok: boolean; error?: string }> {
  const currentPrefs =
    params.existingPreferences && typeof params.existingPreferences === "object"
      ? (params.existingPreferences as Record<string, unknown>)
      : {};

  const nextPrefs: Record<string, unknown> = {
    ...currentPrefs,
    expo_push_token: params.token,
    push_platform: Platform.OS,
    push_updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("users")
    .update({ preferences: nextPrefs, updated_at: new Date().toISOString() })
    .eq("id", params.userId);

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export type NotificationSubscriptions = {
  notification: Notifications.Subscription;
  response: Notifications.Subscription;
};

export function subscribeToNotificationEvents(args: {
  onReceive?: (notification: Notifications.Notification) => void;
  onResponse?: (response: Notifications.NotificationResponse) => void;
}): NotificationSubscriptions {
  const notification = Notifications.addNotificationReceivedListener((evt) => {
    args.onReceive?.(evt);
  });
  const response = Notifications.addNotificationResponseReceivedListener(
    (evt) => {
      args.onResponse?.(evt);
    },
  );
  return { notification, response };
}

export function removeNotificationSubscriptions(
  subs: NotificationSubscriptions | null,
): void {
  if (!subs) return;
  Notifications.removeNotificationSubscription(subs.notification);
  Notifications.removeNotificationSubscription(subs.response);
}
