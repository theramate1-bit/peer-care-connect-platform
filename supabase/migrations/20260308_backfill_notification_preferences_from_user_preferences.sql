-- Backfill channel-level notification preferences for existing users.
-- This preserves existing rows and only inserts missing user_id records.

INSERT INTO public.notification_preferences (
  user_id,
  email,
  email_reminders,
  sms,
  in_app,
  push,
  email_address,
  phone_number,
  created_at,
  updated_at
)
SELECT
  u.id AS user_id,
  COALESCE((u.preferences ->> 'emailNotifications')::boolean, true) AS email,
  COALESCE((u.preferences ->> 'calendarReminders')::boolean, true) AS email_reminders,
  COALESCE((u.preferences ->> 'smsNotifications')::boolean, false) AS sms,
  COALESCE((u.preferences ->> 'receiveInAppNotifications')::boolean, true) AS in_app,
  COALESCE((u.preferences ->> 'receiveInAppNotifications')::boolean, true) AS push,
  u.email AS email_address,
  u.phone AS phone_number,
  NOW() AS created_at,
  NOW() AS updated_at
FROM public.users u
INNER JOIN auth.users au ON au.id = u.id
ON CONFLICT (user_id) DO NOTHING;
