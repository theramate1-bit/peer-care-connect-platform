-- Add stripe_connect_account_id to users table for quick lookup
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_stripe_connect 
ON public.users(stripe_connect_account_id);

-- Add checkout_session_id, platform_fee_amount, and practitioner_amount to payments table
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS checkout_session_id TEXT,
ADD COLUMN IF NOT EXISTS platform_fee_amount INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS practitioner_amount INTEGER DEFAULT 0;

-- Create index for checkout session lookups
CREATE INDEX IF NOT EXISTS idx_payments_checkout_session 
ON public.payments(checkout_session_id);
