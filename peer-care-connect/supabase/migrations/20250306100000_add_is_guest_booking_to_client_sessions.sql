-- Add is_guest_booking to client_sessions so the practitioner diary can label guests vs clients.
--
-- After applying this migration, update in Supabase:
-- 1. create_booking_with_validation: add parameter p_is_guest_booking boolean DEFAULT false,
--    and set is_guest_booking = COALESCE(p_is_guest_booking, false) in the INSERT.
-- 2. get_practitioner_dashboard_data: include is_guest_booking in the upcoming_sessions result set.

alter table public.client_sessions
  add column if not exists is_guest_booking boolean not null default false;

comment on column public.client_sessions.is_guest_booking is 'True when the booking was made by a guest (no registered client account).';
