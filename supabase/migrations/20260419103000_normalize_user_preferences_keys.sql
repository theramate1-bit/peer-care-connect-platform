-- Normalize legacy preference keys into canonical camelCase keys used by web + mobile.
-- This keeps unrelated JSON keys intact and only writes canonical notification/privacy flags.

WITH source AS (
  SELECT
    id,
    COALESCE(preferences, '{}'::jsonb) AS prefs
  FROM public.users
),
normalized AS (
  SELECT
    id,
    prefs
    || jsonb_build_object(
      'emailNotifications',
      COALESCE(
        CASE WHEN prefs->>'emailNotifications' IN ('true', 'false') THEN (prefs->>'emailNotifications')::boolean END,
        CASE WHEN prefs#>>'{notification_preferences,email_notifications}' IN ('true', 'false') THEN (prefs#>>'{notification_preferences,email_notifications}')::boolean END,
        CASE WHEN prefs->>'notify_booking_updates' IN ('true', 'false') THEN (prefs->>'notify_booking_updates')::boolean END,
        TRUE
      ),
      'smsNotifications',
      COALESCE(
        CASE WHEN prefs->>'smsNotifications' IN ('true', 'false') THEN (prefs->>'smsNotifications')::boolean END,
        CASE WHEN prefs#>>'{notification_preferences,sms_notifications}' IN ('true', 'false') THEN (prefs#>>'{notification_preferences,sms_notifications}')::boolean END,
        FALSE
      ),
      'calendarReminders',
      COALESCE(
        CASE WHEN prefs->>'calendarReminders' IN ('true', 'false') THEN (prefs->>'calendarReminders')::boolean END,
        CASE WHEN prefs#>>'{notification_preferences,session_reminders}' IN ('true', 'false') THEN (prefs#>>'{notification_preferences,session_reminders}')::boolean END,
        CASE WHEN prefs->>'notify_reminders' IN ('true', 'false') THEN (prefs->>'notify_reminders')::boolean END,
        TRUE
      ),
      'marketingEmails',
      COALESCE(
        CASE WHEN prefs->>'marketingEmails' IN ('true', 'false') THEN (prefs->>'marketingEmails')::boolean END,
        CASE WHEN prefs#>>'{notification_preferences,marketing_emails}' IN ('true', 'false') THEN (prefs#>>'{notification_preferences,marketing_emails}')::boolean END,
        CASE WHEN prefs->>'notify_marketing' IN ('true', 'false') THEN (prefs->>'notify_marketing')::boolean END,
        FALSE
      ),
      'receiveInAppNotifications',
      COALESCE(
        CASE WHEN prefs->>'receiveInAppNotifications' IN ('true', 'false') THEN (prefs->>'receiveInAppNotifications')::boolean END,
        CASE WHEN prefs->>'notify_messages' IN ('true', 'false') THEN (prefs->>'notify_messages')::boolean END,
        TRUE
      ),
      'profileVisible',
      COALESCE(
        CASE WHEN prefs->>'profileVisible' IN ('true', 'false') THEN (prefs->>'profileVisible')::boolean END,
        CASE WHEN prefs->>'profile_visible' IN ('true', 'false') THEN (prefs->>'profile_visible')::boolean END,
        TRUE
      ),
      'showContactInfo',
      COALESCE(
        CASE WHEN prefs->>'showContactInfo' IN ('true', 'false') THEN (prefs->>'showContactInfo')::boolean END,
        CASE WHEN prefs->>'show_contact_info' IN ('true', 'false') THEN (prefs->>'show_contact_info')::boolean END,
        FALSE
      ),
      'autoAcceptBookings',
      COALESCE(
        CASE WHEN prefs->>'autoAcceptBookings' IN ('true', 'false') THEN (prefs->>'autoAcceptBookings')::boolean END,
        FALSE
      ),
      'platformUpdates',
      COALESCE(
        CASE WHEN prefs->>'platformUpdates' IN ('true', 'false') THEN (prefs->>'platformUpdates')::boolean END,
        FALSE
      )
    ) AS canonical_prefs
  FROM source
)
UPDATE public.users AS u
SET preferences = n.canonical_prefs
FROM normalized AS n
WHERE u.id = n.id;
