-- Align notification_type enum with TREATMENT_EXCHANGE_NOTIFICATION_FLOWS.md
-- Exchange notifications were falling back to booking_confirmed when type wasn't in enum.
-- Adding these allows correct storage; frontend formatBookingNotificationPreview distinguishes pending vs confirmed.

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'treatment_exchange_request';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'exchange_request_received';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'exchange_request';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'exchange_request_accepted';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'exchange_request_declined';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'exchange_request_expired';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'exchange_slot_held';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'exchange_slot_released';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'exchange_session_confirmed';
