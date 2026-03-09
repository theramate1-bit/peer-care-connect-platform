-- Create credits table for user credit balance tracking
-- This table stores user credit balances and transaction history

CREATE TABLE IF NOT EXISTS public.credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_credits_user_id ON public.credits(user_id);
CREATE INDEX IF NOT EXISTS idx_credits_balance ON public.credits(balance);

-- Enable RLS
ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own credits" 
ON public.credits 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own credits" 
ON public.credits 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert credits" 
ON public.credits 
FOR INSERT 
WITH CHECK (true);

-- Create updated_at trigger
CREATE TRIGGER update_credits_updated_at
BEFORE UPDATE ON public.credits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert credits record for existing users
INSERT INTO public.credits (user_id, balance)
SELECT id, 0
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.credits)
ON CONFLICT (user_id) DO NOTHING;
