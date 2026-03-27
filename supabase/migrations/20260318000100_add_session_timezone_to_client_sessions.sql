-- Ensure session timezone is explicit on every booking (no guesswork in emails/calendar links).
-- Default is Europe/London for existing UK operations; adjust if you support multi-region sessions.

alter table public.client_sessions
  add column if not exists session_timezone text not null default 'Europe/London';

