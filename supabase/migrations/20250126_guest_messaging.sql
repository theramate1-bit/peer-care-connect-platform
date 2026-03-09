-- Guest Messaging with Account Creation Flow Migration
-- Allows practitioners to message guests who have booked sessions but don't have accounts
-- When guests create accounts, automatically links conversations and sessions

-- Step 1: Modify conversations table to support guest emails
ALTER TABLE conversations 
  ADD COLUMN IF NOT EXISTS guest_email TEXT,
  ADD COLUMN IF NOT EXISTS pending_account_creation BOOLEAN DEFAULT false;

-- Make participant2_id nullable for guest conversations
ALTER TABLE conversations 
  ALTER COLUMN participant2_id DROP NOT NULL;

-- Drop existing unique constraint if it exists
ALTER TABLE conversations 
  DROP CONSTRAINT IF EXISTS conversations_participant1_id_participant2_id_key;

-- Add check constraint: either participant2_id or guest_email must be set
ALTER TABLE conversations 
  DROP CONSTRAINT IF EXISTS conversations_participant_check;
ALTER TABLE conversations 
  ADD CONSTRAINT conversations_participant_check 
  CHECK (
    (participant2_id IS NOT NULL) OR 
    (guest_email IS NOT NULL AND pending_account_creation = true)
  );

-- Update unique constraint to handle guest emails
DROP INDEX IF EXISTS conversations_participant1_participant2_key;
CREATE UNIQUE INDEX IF NOT EXISTS conversations_participant1_participant2_key 
  ON conversations(participant1_id, participant2_id) 
  WHERE participant2_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS conversations_participant1_guest_email_key 
  ON conversations(participant1_id, guest_email) 
  WHERE guest_email IS NOT NULL AND pending_account_creation = true;

-- Step 2: Function to link guest conversations to user when account is created
CREATE OR REPLACE FUNCTION link_guest_conversations_to_user(
  p_email TEXT,
  p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  -- Update conversations where guest_email matches and participant2_id is NULL
  UPDATE conversations
  SET 
    participant2_id = p_user_id,
    guest_email = NULL,
    pending_account_creation = false,
    updated_at = NOW()
  WHERE guest_email = p_email 
    AND participant2_id IS NULL
    AND pending_account_creation = true;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  -- Also update any conversations where guest was participant1 (less common but possible)
  UPDATE conversations
  SET 
    participant1_id = p_user_id,
    guest_email = NULL,
    pending_account_creation = false,
    updated_at = NOW()
  WHERE guest_email = p_email 
    AND participant1_id IS NULL
    AND pending_account_creation = true;
  
  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Function to link guest sessions to user when account is created
CREATE OR REPLACE FUNCTION link_guest_sessions_to_user(
  p_email TEXT,
  p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  -- Update all client_sessions where client_email matches and client_id is NULL
  UPDATE client_sessions
  SET 
    client_id = p_user_id,
    updated_at = NOW()
  WHERE client_email = p_email 
    AND (client_id IS NULL OR client_id != p_user_id);
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Function to get or create guest conversation
CREATE OR REPLACE FUNCTION get_or_create_guest_conversation(
  p_practitioner_id UUID,
  p_guest_email TEXT
)
RETURNS UUID AS $$
DECLARE
  v_conversation_id UUID;
  v_conversation_key TEXT;
BEGIN
  -- Check if guest already has an account
  SELECT id INTO v_conversation_id
  FROM conversations
  WHERE participant1_id = p_practitioner_id
    AND participant2_id IN (
      SELECT id FROM users WHERE email = p_guest_email
    )
  LIMIT 1;
  
  -- If no conversation found, check for pending guest conversation
  IF v_conversation_id IS NULL THEN
    SELECT id INTO v_conversation_id
    FROM conversations
    WHERE participant1_id = p_practitioner_id
      AND guest_email = p_guest_email
      AND pending_account_creation = true
    LIMIT 1;
  END IF;
  
  -- If still no conversation, create a new pending guest conversation
  IF v_conversation_id IS NULL THEN
    -- Generate conversation_key for guest conversations
    v_conversation_key := p_practitioner_id::TEXT || '_guest_' || md5(p_guest_email);
    
    INSERT INTO conversations (
      conversation_key,
      participant1_id, 
      guest_email, 
      pending_account_creation,
      created_at,
      updated_at
    )
    VALUES (
      v_conversation_key,
      p_practitioner_id, 
      p_guest_email, 
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_conversation_id;
  END IF;
  
  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Update send_message function to work with guest conversations
-- (No changes needed - messages already work with conversation_id)

-- Step 6: Update get_user_conversations to include guest conversations
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
    unread_count INTEGER,
    guest_email TEXT,
    pending_account_creation BOOLEAN
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
                CASE 
                    WHEN c.participant2_id IS NOT NULL THEN CONCAT(p2.first_name, ' ', p2.last_name)
                    ELSE COALESCE(c.guest_email, 'Guest')
                END
            ELSE 
                CASE 
                    WHEN c.participant1_id IS NOT NULL THEN CONCAT(p1.first_name, ' ', p1.last_name)
                    ELSE COALESCE(c.guest_email, 'Guest')
                END
        END as other_participant_name,
        CASE 
            WHEN c.participant1_id = p_user_id THEN COALESCE(p2.user_role::VARCHAR(20), 'guest'::VARCHAR(20))
            ELSE COALESCE(p1.user_role::VARCHAR(20), 'guest'::VARCHAR(20))
        END as other_participant_role,
        m.encrypted_content as last_message_content,
        c.last_message_at,
        COALESCE(unread.unread_count, 0)::INTEGER as unread_count,
        CASE 
            WHEN c.participant1_id = p_user_id THEN c.guest_email
            ELSE NULL
        END as guest_email,
        c.pending_account_creation
    FROM conversations c
    LEFT JOIN users p1 ON c.participant1_id = p1.id
    LEFT JOIN users p2 ON c.participant2_id = p2.id
    LEFT JOIN messages m ON c.id = m.conversation_id 
        AND m.id = (
            SELECT m2.id FROM messages m2
            WHERE m2.conversation_id = c.id 
            ORDER BY m2.created_at DESC NULLS LAST
            LIMIT 1
        )
    LEFT JOIN (
        SELECT 
            m3.conversation_id,
            COUNT(*) as unread_count
        FROM messages m3
        LEFT JOIN message_status_tracking mst ON m3.id = mst.message_id AND mst.recipient_id = p_user_id
        WHERE m3.sender_id != p_user_id 
          AND (mst.message_status IS NULL OR mst.message_status != 'read')
        GROUP BY m3.conversation_id
    ) unread ON c.id = unread.conversation_id
    WHERE (c.participant1_id = p_user_id OR c.participant2_id = p_user_id)
    ORDER BY c.last_message_at DESC NULLS LAST
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Grant permissions
GRANT EXECUTE ON FUNCTION link_guest_conversations_to_user TO authenticated;
GRANT EXECUTE ON FUNCTION link_guest_sessions_to_user TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_guest_conversation TO authenticated;

-- Step 8: Add comment for documentation
COMMENT ON FUNCTION link_guest_conversations_to_user IS 'Links guest conversations to user account when guest creates account';
COMMENT ON FUNCTION link_guest_sessions_to_user IS 'Links guest sessions to user account when guest creates account';
COMMENT ON FUNCTION get_or_create_guest_conversation IS 'Gets or creates a conversation between practitioner and guest email';

