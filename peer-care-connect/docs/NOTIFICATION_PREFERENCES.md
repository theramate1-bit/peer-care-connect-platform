# Notification preferences

Account preferences control which notifications users receive by **email** and **in-platform messages**. They are stored in `users.preferences` (JSONB) in Supabase.

## Preference keys

- **Practitioner shape** (Profile.tsx, AuthContext): top-level camelCase in `users.preferences`.
  - `emailNotifications` – booking confirmations and changes (email).
  - `calendarReminders` – reminders and alerts.
  - `receiveInAppNotifications` – in-platform messages and notifications.
  - `platformUpdates` – product news and feature updates.
  - `marketingEmails`, `smsNotifications`, `profileVisible`, `showContactInfo`, `autoAcceptBookings` – other settings.

- **Client shape** (ClientProfile.tsx): nested under `users.preferences.notification_preferences` (snake_case).
  - `email_notifications` – booking confirmations and updates (email).
  - `session_reminders` – reminders and alerts.
  - `sms_notifications` – text messages.
  - `marketing_emails` – platform updates and marketing.

## Triggers and enforcement

- **SessionNotifications.sendNotification** (in-app messages): the **recipient** is the client (`trigger.clientId`). Before sending, we load `users.preferences` for that user and call `shouldSendInAppNotification(preferences)`. We send only if the recipient has not disabled in-app notifications (`receiveInAppNotifications` or, for clients, `notification_preferences.email_notifications` as proxy). When the caller cannot read the recipient’s preferences (e.g. RLS when practitioner books for a client), we skip sending. Full cross-user enforcement would require an Edge Function or RPC with service role.
- **Email**: When email sending is implemented, use the same preference fetch and only send when the recipient’s email preference for that category is true.

## Trigger → category mapping

| Trigger            | Category              | Preference (in-app)        |
|--------------------|-----------------------|----------------------------|
| booking_created    | Booking confirmations | receiveInAppNotifications / notification_preferences.email_notifications |
| 24h_reminder, 2h_reminder, 1h_reminder | Reminders | session_reminders / calendarReminders (future) |
| session_confirmed, session_cancelled, etc. | Booking/changes | same as above |

All session-related in-app messages currently use the same “in-app” preference; per-trigger gating can be added later if needed.
