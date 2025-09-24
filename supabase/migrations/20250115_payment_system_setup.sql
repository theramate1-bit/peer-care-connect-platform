-- Payment System Database Setup
-- This migration creates all necessary tables and fields for the payment system

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('starter', 'practitioner', 'clinic')),
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
  stripe_subscription_id TEXT,
  subscription_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create platform_revenue table
CREATE TABLE IF NOT EXISTS public.platform_revenue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.client_sessions(id) ON DELETE CASCADE,
  practitioner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  total_amount DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) NOT NULL,
  practitioner_amount DECIMAL(10,2) NOT NULL,
  stripe_session_id TEXT,
  payment_date TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add payment-related fields to client_sessions table
ALTER TABLE public.client_sessions 
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'completed', 'failed')),
ADD COLUMN IF NOT EXISTS stripe_session_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS platform_fee_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS practitioner_amount DECIMAL(10,2);

-- Add Stripe account ID to therapist_profiles for Connect payments
ALTER TABLE public.therapist_profiles 
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;

-- Enable RLS on new tables
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_revenue ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for subscriptions
CREATE POLICY "Users can view their own subscriptions" ON public.subscriptions
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own subscriptions" ON public.subscriptions
FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for platform_revenue
CREATE POLICY "Practitioners can view their revenue" ON public.platform_revenue
FOR SELECT USING (auth.uid() = practitioner_id);

CREATE POLICY "Clients can view their payment history" ON public.platform_revenue
FOR SELECT USING (auth.uid() = client_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON public.subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_platform_revenue_practitioner ON public.platform_revenue(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_platform_revenue_session ON public.platform_revenue(session_id);
CREATE INDEX IF NOT EXISTS idx_client_sessions_payment_status ON public.client_sessions(payment_status);
CREATE INDEX IF NOT EXISTS idx_client_sessions_stripe_session ON public.client_sessions(stripe_session_id);

-- Create updated_at trigger for subscriptions
CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscriptions_updated_at();

-- Insert sample subscription plans (optional)
INSERT INTO public.subscriptions (user_id, plan, billing_cycle, status, subscription_end) 
SELECT 
  u.id, 
  'starter', 
  'monthly', 
  'active', 
  NULL
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.subscriptions s WHERE s.user_id = u.id
)
ON CONFLICT DO NOTHING;
