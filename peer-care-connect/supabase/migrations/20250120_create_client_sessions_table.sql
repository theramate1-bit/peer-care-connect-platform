-- Create client_sessions table for marketplace bookings and practitioner management
-- This table bridges the marketplace booking flow with practitioner dashboard sections

CREATE TABLE IF NOT EXISTS public.client_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    therapist_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    client_name TEXT NOT NULL,
    client_email TEXT NOT NULL,
    client_phone TEXT,
    session_date DATE NOT NULL,
    start_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    session_type TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    notes TEXT,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
    credit_cost INTEGER DEFAULT 0,
    stripe_session_id TEXT,
    stripe_payment_intent_id TEXT,
    platform_fee_amount DECIMAL(10,2),
    practitioner_amount DECIMAL(10,2),
    follow_up_date DATE,
    has_recording BOOLEAN DEFAULT false,
    recording_consent BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_client_sessions_therapist_id ON public.client_sessions(therapist_id);
CREATE INDEX IF NOT EXISTS idx_client_sessions_client_id ON public.client_sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_client_sessions_session_date ON public.client_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_client_sessions_status ON public.client_sessions(status);
CREATE INDEX IF NOT EXISTS idx_client_sessions_payment_status ON public.client_sessions(payment_status);

-- Enable RLS
ALTER TABLE public.client_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Clients can view own sessions" ON public.client_sessions
    FOR SELECT USING (auth.uid() = client_id);

CREATE POLICY "Therapists can view their client sessions" ON public.client_sessions
    FOR SELECT USING (auth.uid() = therapist_id);

CREATE POLICY "Clients can insert own sessions" ON public.client_sessions
    FOR INSERT WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Therapists can update their sessions" ON public.client_sessions
    FOR UPDATE USING (auth.uid() = therapist_id);

CREATE POLICY "Therapists can insert sessions for their clients" ON public.client_sessions
    FOR INSERT WITH CHECK (auth.uid() = therapist_id);

-- Create updated_at trigger
CREATE TRIGGER update_client_sessions_updated_at 
    BEFORE UPDATE ON public.client_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
