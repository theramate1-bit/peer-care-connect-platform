const DEFAULTS = {
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

const isObject = (value) => value != null && typeof value === "object";

const toBoolean = (value, fallback) =>
  typeof value === "boolean" ? value : fallback;

function readLegacyNotificationPreferences(userPrefs) {
  if (!isObject(userPrefs)) return {};
  const nested = userPrefs.notification_preferences;
  if (!isObject(nested)) return {};
  return {
    emailNotifications:
      typeof nested.email_notifications === "boolean"
        ? nested.email_notifications
        : undefined,
    smsNotifications:
      typeof nested.sms_notifications === "boolean"
        ? nested.sms_notifications
        : undefined,
    calendarReminders:
      typeof nested.session_reminders === "boolean"
        ? nested.session_reminders
        : undefined,
    marketingEmails:
      typeof nested.marketing_emails === "boolean"
        ? nested.marketing_emails
        : undefined,
  };
}

function readMobileLegacyPreferences(userPrefs) {
  if (!isObject(userPrefs)) return {};
  return {
    emailNotifications:
      typeof userPrefs.notify_booking_updates === "boolean"
        ? userPrefs.notify_booking_updates
        : undefined,
    receiveInAppNotifications:
      typeof userPrefs.notify_messages === "boolean"
        ? userPrefs.notify_messages
        : undefined,
    calendarReminders:
      typeof userPrefs.notify_reminders === "boolean"
        ? userPrefs.notify_reminders
        : undefined,
    marketingEmails:
      typeof userPrefs.notify_marketing === "boolean"
        ? userPrefs.notify_marketing
        : undefined,
  };
}

export function loadProfilePreferences(userPrefs, notificationPrefs) {
  const user = isObject(userPrefs) ? userPrefs : {};
  const notif = isObject(notificationPrefs) ? notificationPrefs : {};
  const nested = readLegacyNotificationPreferences(user);
  const mobileLegacy = readMobileLegacyPreferences(user);

  return {
    emailNotifications: toBoolean(
      notif.email,
      toBoolean(
        user.emailNotifications,
        toBoolean(
          nested.emailNotifications,
          toBoolean(
            mobileLegacy.emailNotifications,
            DEFAULTS.emailNotifications,
          ),
        ),
      ),
    ),
    smsNotifications: toBoolean(
      notif.sms,
      toBoolean(
        user.smsNotifications,
        toBoolean(nested.smsNotifications, DEFAULTS.smsNotifications),
      ),
    ),
    calendarReminders: toBoolean(
      notif.email_reminders,
      toBoolean(
        user.calendarReminders,
        toBoolean(
          nested.calendarReminders,
          toBoolean(mobileLegacy.calendarReminders, DEFAULTS.calendarReminders),
        ),
      ),
    ),
    marketingEmails: toBoolean(
      user.marketingEmails,
      toBoolean(
        nested.marketingEmails,
        toBoolean(mobileLegacy.marketingEmails, DEFAULTS.marketingEmails),
      ),
    ),
    profileVisible: toBoolean(
      user.profileVisible,
      toBoolean(user.profile_visible, DEFAULTS.profileVisible),
    ),
    showContactInfo: toBoolean(
      user.showContactInfo,
      toBoolean(user.show_contact_info, DEFAULTS.showContactInfo),
    ),
    autoAcceptBookings: toBoolean(
      user.autoAcceptBookings,
      DEFAULTS.autoAcceptBookings,
    ),
    receiveInAppNotifications: toBoolean(
      notif.in_app,
      toBoolean(
        user.receiveInAppNotifications,
        toBoolean(
          mobileLegacy.receiveInAppNotifications,
          DEFAULTS.receiveInAppNotifications,
        ),
      ),
    ),
    platformUpdates: toBoolean(user.platformUpdates, DEFAULTS.platformUpdates),
  };
}

export function buildUsersPreferencesUpdate(
  preferences,
  existingPreferences = {},
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

export function buildNotificationPreferencesUpsert({
  userId,
  preferences,
  email = null,
  phone = null,
  updatedAt,
}) {
  return {
    user_id: userId,
    email: !!preferences.emailNotifications,
    sms: !!preferences.smsNotifications,
    in_app: !!preferences.receiveInAppNotifications,
    email_reminders: !!preferences.calendarReminders,
    email_address: email,
    phone_number: phone,
    updated_at: updatedAt || new Date().toISOString(),
  };
}
