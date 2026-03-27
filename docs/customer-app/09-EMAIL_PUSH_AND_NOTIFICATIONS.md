# Email, push, and in-app notifications (customer)

## Email

- **Sending** is **server-side** (Supabase Edge Functions such as `send-email`, booking-related functions).
- **Customer apps** do not embed Resend keys; they **trigger** state changes (bookings, cancellations) that the backend turns into email.
- **Logs:** `email_logs` table — useful for support debugging.

**Product references:** [`../development/email-data-enrichment.md`](../development/email-data-enrichment.md), [`../features/notifications-overview.md`](../features/notifications-overview.md)

## In-app notifications

- **Web route:** `/notifications` → `pages/Notifications.tsx`
- **Table:** `notifications` (RLS-scoped to user).
- Native should implement a **notifications** surface or integrate with **push** (below).

## Push (native)

- **Expo:** `expo-notifications` is already a dependency in `theramate-ios-client/package.json`.
- **Work:** register device tokens, store per user (if not already in schema), trigger from Edge Functions or backend when events occur — **align** with what triggers email to avoid duplicate or conflicting messages.

## Notification preferences

- **Table:** `notification_preferences`
- Customer-facing toggles should eventually mirror web **`SettingsPrivacyTools`** / notification settings where product requires parity.

## Deep links from email

Booking confirmations and reminders often link to:

- `/booking/view/:sessionId`
- `/booking/find`
- `/review`

Ensure **native** handles these URLs if the user has the app installed (Universal Links / App Links).
