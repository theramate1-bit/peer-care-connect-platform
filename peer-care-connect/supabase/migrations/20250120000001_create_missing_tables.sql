-- Create missing tables for actual functionality
-- This migration creates the tables that are referenced in components but don't exist

-- Therapist Favorites Table
CREATE TABLE IF NOT EXISTS therapist_favorites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    therapist_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(client_id, therapist_id)
);

-- Session Feedback Table
CREATE TABLE IF NOT EXISTS session_feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES client_sessions(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    therapist_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    pain_level_before INTEGER NOT NULL CHECK (pain_level_before >= 0 AND pain_level_before <= 10),
    pain_level_after INTEGER NOT NULL CHECK (pain_level_after >= 0 AND pain_level_after <= 10),
    feedback_text TEXT,
    what_went_well TEXT,
    areas_for_improvement TEXT,
    would_recommend BOOLEAN NOT NULL DEFAULT false,
    next_session_interest BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'voice')),
    file_url TEXT,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversations Table
CREATE TABLE IF NOT EXISTS conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    therapist_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    last_message_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(client_id, therapist_id)
);

-- Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES client_sessions(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    therapist_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL, -- Amount in cents
    currency VARCHAR(3) DEFAULT 'GBP',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    stripe_payment_intent_id VARCHAR(255),
    stripe_charge_id VARCHAR(255),
    receipt_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Emergency Contacts Table
CREATE TABLE IF NOT EXISTS emergency_contacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('crisis_hotline', 'emergency_services', 'therapist', 'family')),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default emergency contacts
INSERT INTO emergency_contacts (name, phone, type, description) VALUES
('Crisis Hotline', '988', 'crisis_hotline', 'National Suicide Prevention Lifeline'),
('Emergency Services', '911', 'emergency_services', 'Police, Fire, Medical Emergency'),
('Samaritans', '116 123', 'crisis_hotline', 'UK Crisis Support Line');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_therapist_favorites_client_id ON therapist_favorites(client_id);
CREATE INDEX IF NOT EXISTS idx_therapist_favorites_therapist_id ON therapist_favorites(therapist_id);
CREATE INDEX IF NOT EXISTS idx_session_feedback_session_id ON session_feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_session_feedback_client_id ON session_feedback(client_id);
CREATE INDEX IF NOT EXISTS idx_session_feedback_therapist_id ON session_feedback(therapist_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_conversations_client_id ON conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_conversations_therapist_id ON conversations(therapist_id);
CREATE INDEX IF NOT EXISTS idx_payments_session_id ON payments(session_id);
CREATE INDEX IF NOT EXISTS idx_payments_client_id ON payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_therapist_id ON payments(therapist_id);
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_type ON emergency_contacts(type);
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_active ON emergency_contacts(is_active);

-- Add RLS policies
ALTER TABLE therapist_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;

-- Therapist Favorites RLS Policies
CREATE POLICY "Users can view their own favorites" ON therapist_favorites
    FOR SELECT USING (auth.uid() = client_id OR auth.uid() = therapist_id);

CREATE POLICY "Users can add their own favorites" ON therapist_favorites
    FOR INSERT WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Users can delete their own favorites" ON therapist_favorites
    FOR DELETE USING (auth.uid() = client_id);

-- Session Feedback RLS Policies
CREATE POLICY "Users can view their own feedback" ON session_feedback
    FOR SELECT USING (auth.uid() = client_id OR auth.uid() = therapist_id);

CREATE POLICY "Clients can create feedback for their sessions" ON session_feedback
    FOR INSERT WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Users can update their own feedback" ON session_feedback
    FOR UPDATE USING (auth.uid() = client_id);

-- Notifications RLS Policies
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Messages RLS Policies
CREATE POLICY "Users can view messages they sent or received" ON messages
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send messages" ON messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their own messages" ON messages
    FOR UPDATE USING (auth.uid() = sender_id);

-- Conversations RLS Policies
CREATE POLICY "Users can view their own conversations" ON conversations
    FOR SELECT USING (auth.uid() = client_id OR auth.uid() = therapist_id);

CREATE POLICY "Users can create conversations" ON conversations
    FOR INSERT WITH CHECK (auth.uid() = client_id OR auth.uid() = therapist_id);

-- Payments RLS Policies
CREATE POLICY "Users can view their own payments" ON payments
    FOR SELECT USING (auth.uid() = client_id OR auth.uid() = therapist_id);

CREATE POLICY "Clients can create payments" ON payments
    FOR INSERT WITH CHECK (auth.uid() = client_id);

-- Emergency Contacts RLS Policies (public read access)
CREATE POLICY "Anyone can view active emergency contacts" ON emergency_contacts
    FOR SELECT USING (is_active = true);
