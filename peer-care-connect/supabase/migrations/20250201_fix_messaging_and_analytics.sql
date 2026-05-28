-- Fix send_message function to match actual messages table schema
-- The function currently tries to insert into non-existent columns (topic, extension, inserted_at)

-- First, drop and recreate send_message function to match messages table structure
-- Drop all overloads of send_message
DROP FUNCTION IF EXISTS public.send_message CASCADE;

CREATE OR REPLACE FUNCTION public.send_message(
    p_conversation_id UUID,
    p_sender_id UUID,
    p_content TEXT,
    p_message_type VARCHAR(20) DEFAULT 'text'
) RETURNS UUID
AS $$
DECLARE
    v_message_id UUID;
    v_content_hash TEXT;
BEGIN
    -- Create content hash for integrity verification
    v_content_hash := encode(digest(p_content, 'sha256'), 'hex');
    
    -- Insert the message using the actual messages table structure
    INSERT INTO messages (
        conversation_id,
        sender_id,
        encrypted_content,  -- Store content here (not actually encrypted in basic implementation)
        content_hash,
        message_type,
        message_status,
        created_at,
        updated_at
    )
    VALUES (
        p_conversation_id,
        p_sender_id,
        p_content,  -- Store plain content in encrypted_content field
        v_content_hash,
        CASE 
            WHEN p_message_type = 'text' THEN 'text'::message_type
            WHEN p_message_type = 'image' THEN 'image'::message_type
            WHEN p_message_type = 'file' THEN 'file'::message_type
            WHEN p_message_type = 'document' THEN 'document'::message_type
            WHEN p_message_type = 'system' THEN 'text'::message_type  -- System messages stored as text
            ELSE 'text'::message_type
        END,
        'sent'::message_status,
        NOW(),
        NOW()
    )
    RETURNING id INTO v_message_id;
    
    -- Update conversation's last_message_at
    UPDATE conversations 
    SET 
        last_message_at = NOW(),
        last_message_id = v_message_id,
        updated_at = NOW()
    WHERE id = p_conversation_id;
    
    RETURN v_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure analytics_events table exists with proper schema
-- Check if table exists and create if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'analytics_events'
    ) THEN
        CREATE TABLE public.analytics_events (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
            event_type VARCHAR(255) NOT NULL,
            event_name VARCHAR(255) NOT NULL,
            properties JSONB DEFAULT '{}'::jsonb,
            metadata JSONB DEFAULT '{}'::jsonb,
            session_id VARCHAR(255),
            page_url TEXT,
            user_agent TEXT,
            ip_address INET,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create indexes for performance
        CREATE INDEX idx_analytics_events_event_name ON public.analytics_events(event_name);
        CREATE INDEX idx_analytics_events_created_at ON public.analytics_events(created_at DESC);
        CREATE INDEX idx_analytics_events_user_id ON public.analytics_events(user_id) WHERE user_id IS NOT NULL;
        
        -- Enable RLS
        ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
        
        -- RLS Policy: Users can insert their own events, and authenticated users can read their own events
        CREATE POLICY "Users can insert their own analytics events"
            ON public.analytics_events FOR INSERT
            WITH CHECK (
                auth.uid() IS NOT NULL AND 
                (auth.uid() = user_id OR user_id IS NULL)
            );
        
        CREATE POLICY "Users can view their own analytics events"
            ON public.analytics_events FOR SELECT
            USING (
                auth.uid() IS NOT NULL AND 
                (auth.uid() = user_id OR user_id IS NULL)
            );
        
        -- Grant permissions
        GRANT INSERT, SELECT ON public.analytics_events TO authenticated;
    ELSE
        -- Table exists, just ensure metadata column exists if it doesn't
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'analytics_events' 
            AND column_name = 'metadata'
        ) THEN
            ALTER TABLE public.analytics_events 
            ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
        END IF;
        
        -- Ensure event_name column exists (it should, but check anyway)
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'analytics_events' 
            AND column_name = 'event_name'
        ) THEN
            ALTER TABLE public.analytics_events 
            ADD COLUMN event_name VARCHAR(255);
        END IF;
    END IF;
END $$;

COMMENT ON FUNCTION public.send_message(UUID, UUID, TEXT, TEXT) IS 
    'Sends a message in a conversation. Stores content in encrypted_content field and creates hash for integrity verification.';

