
-- Create payment_intents table
CREATE TABLE IF NOT EXISTS payment_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES client_sessions(id) ON DELETE CASCADE,
  client_id UUID REFERENCES auth.users(id),
  practitioner_id UUID REFERENCES auth.users(id),
  amount INTEGER NOT NULL, -- Amount in smallest currency unit (e.g. pence)
  currency TEXT DEFAULT 'gbp',
  status TEXT DEFAULT 'initiated',
  client_secret TEXT,
  stripe_payment_intent_id TEXT,
  idempotency_key TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_intents_session_id ON payment_intents(session_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_client_id ON payment_intents(client_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_practitioner_id ON payment_intents(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_idempotency_key ON payment_intents(idempotency_key);

-- RLS Policies
ALTER TABLE payment_intents ENABLE ROW LEVEL SECURITY;

-- Allow anyone to create an intent (needed for guest checkout)
CREATE POLICY "Enable insert for all users" ON payment_intents
  FOR INSERT WITH CHECK (true);

-- Allow users to view their own intents
CREATE POLICY "Users can view their own payment intents" ON payment_intents
  FOR SELECT USING (
    auth.uid() = client_id OR 
    auth.uid() = practitioner_id
  );

-- Allow updates (e.g. for status changes)
CREATE POLICY "Users can update their own payment intents" ON payment_intents
  FOR UPDATE USING (auth.uid() = client_id);
