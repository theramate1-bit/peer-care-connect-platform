export interface ProfilePreferencesViewModel {
  emailNotifications: boolean;
  smsNotifications: boolean;
  calendarReminders: boolean;
  marketingEmails: boolean;
  profileVisible: boolean;
  showContactInfo: boolean;
  autoAcceptBookings: boolean;
  receiveInAppNotifications: boolean;
  platformUpdates: boolean;
}

export interface NotificationPreferenceRow {
  email?: boolean | null;
  sms?: boolean | null;
  in_app?: boolean | null;
  email_reminders?: boolean | null;
}

const defaults: ProfilePreferencesViewModel = {
  emailNotifications: true,
  smsNotifications: false,
  calendarReminders: true,
  marketingEmails: false,
  profileVisible: true,
  showContactInfo: false,
  autoAcceptBookings: false,
  receiveInAppNotifications: true,
  platformUpdates: false,
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object";

const toBool = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;

export function loadProfilePreferences(
  userPrefs: unknown,
  notificationPrefs?: NotificationPreferenceRow | null,
): ProfilePreferencesViewModel {
  const user = isObject(userPrefs) ? userPrefs : {};
  const nested = isObject(user.notification_preferences)
    ? (user.notification_preferences as Record<string, unknown>)
    : {};

  return {
    emailNotifications: toBool(
      notificationPrefs?.email,
      toBool(
        user.emailNotifications,
        toBool(
          nested.email_notifications,
          toBool(user.notify_booking_updates, defaults.emailNotifications),
        ),
      ),
    ),
    smsNotifications: toBool(
      notificationPrefs?.sms,
      toBool(
        user.smsNotifications,
        toBool(nested.sms_notifications, defaults.smsNotifications),
      ),
    ),
    calendarReminders: toBool(
      notificationPrefs?.email_reminders,
      toBool(
        user.calendarReminders,
        toBool(
          nested.session_reminders,
          toBool(user.notify_reminders, defaults.calendarReminders),
        ),
      ),
    ),
    marketingEmails: toBool(
      user.marketingEmails,
      toBool(
        nested.marketing_emails,
        toBool(user.notify_marketing, defaults.marketingEmails),
      ),
    ),
    profileVisible: toBool(
      user.profileVisible,
      toBool(user.profile_visible, defaults.profileVisible),
    ),
    showContactInfo: toBool(
      user.showContactInfo,
      toBool(user.show_contact_info, defaults.showContactInfo),
    ),
    autoAcceptBookings: toBool(
      user.autoAcceptBookings,
      defaults.autoAcceptBookings,
    ),
    receiveInAppNotifications: toBool(
      notificationPrefs?.in_app,
      toBool(
        user.receiveInAppNotifications,
        toBool(user.notify_messages, defaults.receiveInAppNotifications),
      ),
    ),
    platformUpdates: toBool(user.platformUpdates, defaults.platformUpdates),
  };
}

export function buildUsersPreferencesUpdate(
  preferences: ProfilePreferencesViewModel,
  existingPreferences: unknown = {},
) {
  const existing = isObject(existingPreferences) ? existingPreferences : {};
  return {
    ...existing,
    emailNotifications: !!preferences.emailNotifications,
    smsNotifications: !!preferences.smsNotifications,
    calendarReminders: !!preferences.calendarReminders,
    marketingEmails: !!preferences.marketingEmails,
    profileVisible: !!preferences.profileVisible,
    showContactInfo: !!preferences.showContactInfo,
    autoAcceptBookings: !!preferences.autoAcceptBookings,
    receiveInAppNotifications: !!preferences.receiveInAppNotifications,
    platformUpdates: !!preferences.platformUpdates,
  };
}

export function buildNotificationPreferencesUpsert(input: {
  userId: string;
  preferences: ProfilePreferencesViewModel;
  email?: string | null;
  phone?: string | null;
}) {
  return {
    user_id: input.userId,
    email: !!input.preferences.emailNotifications,
    sms: !!input.preferences.smsNotifications,
    in_app: !!input.preferences.receiveInAppNotifications,
    email_reminders: !!input.preferences.calendarReminders,
    email_address: input.email ?? null,
    phone_number: input.phone ?? null,
    updated_at: new Date().toISOString(),
  };
}
