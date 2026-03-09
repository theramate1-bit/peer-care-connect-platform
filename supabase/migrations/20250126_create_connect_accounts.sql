-- Create connect_accounts table for Stripe Connect account tracking
CREATE TABLE IF NOT EXISTS public.connect_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  stripe_account_id TEXT UNIQUE NOT NULL,
  account_status TEXT DEFAULT 'pending' CHECK (account_status IN ('pending', 'active', 'restricted', 'rejected')),
  charges_enabled BOOLEAN DEFAULT false,
  payouts_enabled BOOLEAN DEFAULT false,
  details_submitted BOOLEAN DEFAULT false,
  business_type TEXT DEFAULT 'individual' CHECK (business_type IN ('individual', 'company')),
  country TEXT DEFAULT 'GB',
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_connect_accounts_user_id ON public.connect_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_connect_accounts_stripe_id ON public.connect_accounts(stripe_account_id);
CREATE INDEX IF NOT EXISTS idx_connect_accounts_status ON public.connect_accounts(account_status);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_connect_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER connect_accounts_updated_at
  BEFORE UPDATE ON public.connect_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_connect_accounts_updated_at();

-- Enable RLS
ALTER TABLE public.connect_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own connect account
CREATE POLICY "Users can view their own connect account"
  ON public.connect_accounts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Platform (service role) can manage all accounts
CREATE POLICY "Platform can manage all connect accounts"
  ON public.connect_accounts
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Update users table to ensure stripe_connect_account_id column exists
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT;

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_users_stripe_connect 
ON public.users(stripe_connect_account_id);

-- Sync existing connect_accounts to users.stripe_connect_account_id
UPDATE public.users u
SET stripe_connect_account_id = ca.stripe_account_id
FROM public.connect_accounts ca
WHERE u.id = ca.user_id
AND u.stripe_connect_account_id IS NULL;

