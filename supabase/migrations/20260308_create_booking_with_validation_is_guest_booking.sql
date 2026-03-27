-- Ensure create_booking_with_validation accepts p_is_guest_booking and sets client_sessions.is_guest_booking.
-- Required for practitioner diary to label Guest vs Client correctly (see GUEST_VS_CLIENT_AUDIT_BACKLOG).
--
-- This migration was applied via Supabase MCP; the RPC in the database has been updated to:
-- 1. Add parameter: p_is_guest_booking boolean DEFAULT false
-- 2. In INSERT INTO client_sessions: add column is_guest_booking and value COALESCE(p_is_guest_booking, false)
--
-- If you need to re-apply manually: run the same logic as in the audit fix (DO block that gets
-- pg_get_functiondef, replaces the signature and INSERT list, then EXECUTE), or update the function
-- in Supabase SQL editor to add the parameter and the is_guest_booking column/value in the INSERT.

SELECT 1;
