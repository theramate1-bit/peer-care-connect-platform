-- Messaging System Migration
-- Creates tables for real-time messaging between users

-- Conversations table - stores conversation metadata
CREATE TABLE IF NOT EXISTS conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    participant1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    participant2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(participant1_id, participant2_id),
    CHECK (participant1_id != participant2_id)
);

-- Messages table - stores individual messages
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Message attachments table - stores file attachments
CREATE TABLE IF NOT EXISTS message_attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    file_type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversation participants view - for easier querying
CREATE OR REPLACE VIEW conversation_participants AS
SELECT 
    c.id as conversation_id,
    c.participant1_id,
    c.participant2_id,
    c.last_message_at,
    c.created_at,
    c.updated_at,
    p1.first_name as participant1_first_name,
    p1.last_name as participant1_last_name,
    p1.user_role as participant1_role,
    p2.first_name as participant2_first_name,
    p2.last_name as participant2_last_name,
    p2.user_role as participant2_role
FROM conversations c
LEFT JOIN user_profiles p1 ON c.participant1_id = p1.user_id
LEFT JOIN user_profiles p2 ON c.participant2_id = p2.user_id;

-- Function to get or create conversation between two users
CREATE OR REPLACE FUNCTION get_or_create_conversation(
    p_user1_id UUID,
    p_user2_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_conversation_id UUID;
BEGIN
    -- Try to find existing conversation
    SELECT id INTO v_conversation_id
    FROM conversations
    WHERE (participant1_id = p_user1_id AND participant2_id = p_user2_id)
       OR (participant1_id = p_user2_id AND participant2_id = p_user1_id);
    
    -- If no conversation exists, create one
    IF v_conversation_id IS NULL THEN
        INSERT INTO conversations (participant1_id, participant2_id)
        VALUES (p_user1_id, p_user2_id)
        RETURNING id INTO v_conversation_id;
    END IF;
    
    RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send a message
CREATE OR REPLACE FUNCTION send_message(
    p_conversation_id UUID,
    p_sender_id UUID,
    p_content TEXT,
    p_message_type VARCHAR(20) DEFAULT 'text'
)
RETURNS UUID AS $$
DECLARE
    v_message_id UUID;
BEGIN
    -- Insert the message
    INSERT INTO messages (conversation_id, sender_id, content, message_type)
    VALUES (p_conversation_id, p_sender_id, p_content, p_message_type)
    RETURNING id INTO v_message_id;
    
    -- Update conversation's last_message_at
    UPDATE conversations 
    SET last_message_at = NOW(), updated_at = NOW()
    WHERE id = p_conversation_id;
    
    RETURN v_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_as_read(
    p_conversation_id UUID,
    p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    v_updated_count INTEGER;
BEGIN
    UPDATE messages 
    SET is_read = true, read_at = NOW()
    WHERE conversation_id = p_conversation_id 
      AND sender_id != p_user_id 
      AND is_read = false;
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get conversation list for a user
CREATE OR REPLACE FUNCTION get_user_conversations(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    conversation_id UUID,
    other_participant_id UUID,
    other_participant_name TEXT,
    other_participant_role VARCHAR(20),
    last_message_content TEXT,
    last_message_at TIMESTAMP WITH TIME ZONE,
    unread_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id as conversation_id,
        CASE 
            WHEN c.participant1_id = p_user_id THEN c.participant2_id
            ELSE c.participant1_id
        END as other_participant_id,
        CASE 
            WHEN c.participant1_id = p_user_id THEN 
                CONCAT(p2.first_name, ' ', p2.last_name)
            ELSE 
                CONCAT(p1.first_name, ' ', p1.last_name)
        END as other_participant_name,
        CASE 
            WHEN c.participant1_id = p_user_id THEN p2.user_role
            ELSE p1.user_role
        END as other_participant_role,
        m.content as last_message_content,
        c.last_message_at,
        COALESCE(unread.unread_count, 0) as unread_count
    FROM conversations c
    LEFT JOIN user_profiles p1 ON c.participant1_id = p1.user_id
    LEFT JOIN user_profiles p2 ON c.participant2_id = p2.user_id
    LEFT JOIN messages m ON c.id = m.conversation_id 
        AND m.id = (
            SELECT id FROM messages 
            WHERE conversation_id = c.id 
            ORDER BY created_at DESC 
            LIMIT 1
        )
    LEFT JOIN (
        SELECT 
            conversation_id,
            COUNT(*) as unread_count
        FROM messages 
        WHERE sender_id != p_user_id AND is_read = false
        GROUP BY conversation_id
    ) unread ON c.id = unread.conversation_id
    WHERE c.participant1_id = p_user_id OR c.participant2_id = p_user_id
    ORDER BY c.last_message_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get messages for a conversation
CREATE OR REPLACE FUNCTION get_conversation_messages(
    p_conversation_id UUID,
    p_user_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    sender_id UUID,
    content TEXT,
    message_type VARCHAR(20),
    is_read BOOLEAN,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE,
    sender_name TEXT
) AS $$
BEGIN
    -- Mark messages as read when fetching
    PERFORM mark_messages_as_read(p_conversation_id, p_user_id);
    
    RETURN QUERY
    SELECT 
        m.id,
        m.sender_id,
        m.content,
        m.message_type,
        m.is_read,
        m.read_at,
        m.created_at,
        CONCAT(up.first_name, ' ', up.last_name) as sender_name
    FROM messages m
    LEFT JOIN user_profiles up ON m.sender_id = up.user_id
    WHERE m.conversation_id = p_conversation_id
    ORDER BY m.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_participant1 ON conversations(participant1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participant2 ON conversations(participant2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(conversation_id, sender_id, is_read) WHERE is_read = false;

-- RLS Policies
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;

-- Conversations policies
CREATE POLICY "Users can view their own conversations" ON conversations
    FOR SELECT USING (
        auth.uid() = participant1_id OR auth.uid() = participant2_id
    );

CREATE POLICY "Users can create conversations" ON conversations
    FOR INSERT WITH CHECK (
        auth.uid() = participant1_id OR auth.uid() = participant2_id
    );

-- Messages policies
CREATE POLICY "Users can view messages in their conversations" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE id = conversation_id 
            AND (participant1_id = auth.uid() OR participant2_id = auth.uid())
        )
    );

CREATE POLICY "Users can send messages to their conversations" ON messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE id = conversation_id 
            AND (participant1_id = auth.uid() OR participant2_id = auth.uid())
        )
    );

CREATE POLICY "Users can update their own messages" ON messages
    FOR UPDATE USING (sender_id = auth.uid());

-- Message attachments policies
CREATE POLICY "Users can view attachments in their conversations" ON message_attachments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM messages m
            JOIN conversations c ON m.conversation_id = c.id
            WHERE m.id = message_id 
            AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())
        )
    );

CREATE POLICY "Users can create attachments for their messages" ON message_attachments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM messages m
            WHERE m.id = message_id AND m.sender_id = auth.uid()
        )
    );

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON conversations TO authenticated;
GRANT ALL ON messages TO authenticated;
GRANT ALL ON message_attachments TO authenticated;
GRANT SELECT ON conversation_participants TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_conversation TO authenticated;
GRANT EXECUTE ON FUNCTION send_message TO authenticated;
GRANT EXECUTE ON FUNCTION mark_messages_as_read TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_conversations TO authenticated;
GRANT EXECUTE ON FUNCTION get_conversation_messages TO authenticated;
