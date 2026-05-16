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

export interface NotificationPreferencesUpsertInput {
  userId: string;
  preferences: ProfilePreferencesViewModel;
  email?: string | null;
  phone?: string | null;
  updatedAt?: string;
}

export function loadProfilePreferences(
  userPrefs: unknown,
  notificationPrefs?: NotificationPreferenceRow | null,
): ProfilePreferencesViewModel;

export function buildUsersPreferencesUpdate(
  preferences: ProfilePreferencesViewModel,
  existingPreferences?: unknown,
): Record<string, unknown>;

export function buildNotificationPreferencesUpsert(
  input: NotificationPreferencesUpsertInput,
): {
  user_id: string;
  email: boolean;
  sms: boolean;
  in_app: boolean;
  email_reminders: boolean;
  email_address: string | null;
  phone_number: string | null;
  updated_at: string;
};
