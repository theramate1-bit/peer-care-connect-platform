import test from "node:test";
import assert from "node:assert/strict";
import {
  buildNotificationPreferencesUpsert,
  buildUsersPreferencesUpdate,
  loadProfilePreferences,
} from "./index.js";

test("loadProfilePreferences handles legacy mobile + nested notification keys", () => {
  const preferences = loadProfilePreferences(
    {
      notify_booking_updates: false,
      notify_messages: false,
      notify_reminders: false,
      notify_marketing: true,
      profile_visible: false,
      show_contact_info: true,
    },
    null,
  );

  assert.deepEqual(preferences, {
    emailNotifications: false,
    smsNotifications: false,
    calendarReminders: false,
    marketingEmails: true,
    profileVisible: false,
    showContactInfo: true,
    autoAcceptBookings: false,
    receiveInAppNotifications: false,
    platformUpdates: false,
  });
});

test("notification table values take precedence", () => {
  const preferences = loadProfilePreferences(
    {
      emailNotifications: false,
      smsNotifications: false,
      calendarReminders: false,
      receiveInAppNotifications: false,
    },
    {
      email: true,
      sms: true,
      email_reminders: true,
      in_app: true,
    },
  );

  assert.equal(preferences.emailNotifications, true);
  assert.equal(preferences.smsNotifications, true);
  assert.equal(preferences.calendarReminders, true);
  assert.equal(preferences.receiveInAppNotifications, true);
});

test("builders generate canonical users preferences and notification upsert", () => {
  const model = loadProfilePreferences(
    {
      emailNotifications: true,
      smsNotifications: true,
      calendarReminders: true,
      marketingEmails: false,
      profileVisible: true,
      showContactInfo: false,
      autoAcceptBookings: true,
      receiveInAppNotifications: true,
      platformUpdates: true,
    },
    null,
  );
  const usersPrefs = buildUsersPreferencesUpdate(model, { existing: "keep" });
  const upsert = buildNotificationPreferencesUpsert({
    userId: "user-1",
    preferences: model,
    email: "x@test.com",
    phone: "123",
    updatedAt: "2026-01-01T00:00:00.000Z",
  });

  assert.equal(usersPrefs.existing, "keep");
  assert.equal(usersPrefs.emailNotifications, true);
  assert.equal(usersPrefs.profileVisible, true);
  assert.equal(usersPrefs.showContactInfo, false);
  assert.equal(upsert.user_id, "user-1");
  assert.equal(upsert.email, true);
  assert.equal(upsert.sms, true);
  assert.equal(upsert.in_app, true);
  assert.equal(upsert.email_reminders, true);
  assert.equal(upsert.updated_at, "2026-01-01T00:00:00.000Z");
});
