-- Add exchange_reciprocal_booking_reminder to notification_type enum for reciprocal booking reminder notifications.
-- Without this, create_notification falls back to booking_confirmed when the type is unknown.
-- Note: ALTER TYPE ADD VALUE cannot run inside a transaction block in some PostgreSQL versions.

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'exchange_reciprocal_booking_reminder';
