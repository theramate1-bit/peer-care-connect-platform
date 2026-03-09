-- Add missing columns to payments table for Edge Function compatibility
-- This migration adds idempotency_key, payment_type, and ensures metadata column exists

-- Add idempotency_key column for idempotency checks
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- Add payment_type column to distinguish between payment types
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS payment_type TEXT CHECK (payment_type IN ('session_payment', 'subscription', 'refund', 'transfer', 'other') OR payment_type IS NULL);

-- Add metadata column if it doesn't exist (JSONB for storing additional payment data)
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Create index on idempotency_key for efficient lookups (used in Edge Function line 176)
CREATE INDEX IF NOT EXISTS idx_payments_idempotency_key 
ON public.payments(idempotency_key) 
WHERE idempotency_key IS NOT NULL;

-- Note: payment_status ENUM already includes 'succeeded' value (verified via execute_sql)
-- The Edge Function can use 'succeeded' status value

-- Ensure payment_type ENUM includes 'session_payment' (used by Edge Function)
-- payment_type is an ENUM, so we need to add the value if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'payment_type'
    AND e.enumlabel = 'session_payment'
  ) THEN
    ALTER TYPE payment_type ADD VALUE 'session_payment';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN public.payments.idempotency_key IS 'Unique key used for idempotency checks to prevent duplicate payments';
COMMENT ON COLUMN public.payments.payment_type IS 'Type of payment: session_payment, subscription, refund, transfer, or other';
COMMENT ON COLUMN public.payments.metadata IS 'Additional payment metadata stored as JSONB, including checkout URLs and other details';

-- Create index on payment_type for filtering queries
CREATE INDEX IF NOT EXISTS idx_payments_payment_type 
ON public.payments(payment_type) 
WHERE payment_type IS NOT NULL;
