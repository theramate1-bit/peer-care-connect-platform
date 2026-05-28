-- Add performance indexes for credit system queries
-- These indexes will significantly improve query performance as data grows

-- Composite index for user + transaction type queries (most common filter)
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_type 
ON public.credit_transactions(user_id, transaction_type);

-- Index for session-related transaction lookups
CREATE INDEX IF NOT EXISTS idx_credit_transactions_session 
ON public.credit_transactions(session_id) 
WHERE session_id IS NOT NULL;

-- Composite index for user + period queries in credit allocations
CREATE INDEX IF NOT EXISTS idx_credit_allocations_user_period 
ON public.credit_allocations(user_id, period_start, period_end);

-- Index for subscription lookups in credit allocations
CREATE INDEX IF NOT EXISTS idx_credit_allocations_subscription 
ON public.credit_allocations(subscription_id);

-- Index for peer booking queries
CREATE INDEX IF NOT EXISTS idx_client_sessions_peer_booking 
ON public.client_sessions(therapist_id, is_peer_booking, status) 
WHERE is_peer_booking = true;

-- Index for peer booking by client
CREATE INDEX IF NOT EXISTS idx_client_sessions_peer_client 
ON public.client_sessions(client_id, is_peer_booking, session_date) 
WHERE is_peer_booking = true;

-- Index for credit transaction date range queries
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_date 
ON public.credit_transactions(user_id, created_at DESC);

-- Add helpful comments
COMMENT ON INDEX idx_credit_transactions_user_type IS 
'Optimizes queries filtering by user and transaction type (e.g., "show all earnings")';

COMMENT ON INDEX idx_credit_transactions_session IS 
'Optimizes lookups of transactions related to specific sessions';

COMMENT ON INDEX idx_credit_allocations_user_period IS 
'Optimizes queries for user allocations within date ranges';

COMMENT ON INDEX idx_client_sessions_peer_booking IS 
'Optimizes queries for peer treatment sessions by practitioner';

COMMENT ON INDEX idx_client_sessions_peer_client IS 
'Optimizes queries for peer treatment sessions by client';

