-- Add notifications table to supabase_realtime publication so that:
-- 1. useRealtimeSubscription('notifications', ...) in TherapistDashboard receives INSERT/UPDATE/DELETE events
-- 2. New mobile booking requests appear in realtime without page refresh
-- 3. Dismissed notifications (UPDATE) sync across tabs
-- 4. Accept/Decline flow updates other open dashboard tabs

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
