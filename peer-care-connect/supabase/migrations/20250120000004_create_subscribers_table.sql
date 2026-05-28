-- Create subscribers table for subscription management
-- This table is used by the Edge Functions to track subscription status

CREATE TABLE IF NOT EXISTS public.subscribers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  subscribed BOOLEAN DEFAULT FALSE NOT NULL,
  subscription_tier TEXT,
  subscription_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to view their own subscription
CREATE POLICY "Authenticated users can view their own subscription" ON public.subscribers
  FOR SELECT USING (auth.uid() = user_id);

-- Policy for authenticated users to update their own subscription
CREATE POLICY "Authenticated users can update their own subscription" ON public.subscribers
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy for service role to insert/update subscriptions (for Edge Functions)
CREATE POLICY "Service role can manage subscriptions" ON public.subscribers
  FOR ALL USING (auth.role() = 'service_role');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscribers_email ON public.subscribers(email);
CREATE INDEX IF NOT EXISTS idx_subscribers_user_id ON public.subscribers(user_id);
CREATE INDEX IF NOT EXISTS idx_subscribers_subscribed ON public.subscribers(subscribed);

-- Add comments for documentation
COMMENT ON TABLE public.subscribers IS 'Subscription status tracking for all users';
COMMENT ON COLUMN public.subscribers.email IS 'User email address';
COMMENT ON COLUMN public.subscribers.user_id IS 'Reference to auth.users.id';
COMMENT ON COLUMN public.subscribers.stripe_customer_id IS 'Stripe customer ID for payment processing';
COMMENT ON COLUMN public.subscribers.subscribed IS 'Whether the user has an active subscription';
COMMENT ON COLUMN public.subscribers.subscription_tier IS 'Subscription tier: practitioner, clinic, enterprise';
COMMENT ON COLUMN public.subscribers.subscription_end IS 'When the subscription ends (null for free plans)';
