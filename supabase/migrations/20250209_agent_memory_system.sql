-- Agent Memory System Migration
-- Creates persistent memory, conversation tracking, and learning system for AI agents
-- Enables multi-user training and continuous improvement

-- Agent Conversations Table
-- Tracks all AI interactions grouped by user and context
CREATE TABLE IF NOT EXISTS public.agent_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    interface_type TEXT NOT NULL CHECK (interface_type IN ('soap-notes', 'transcription', 'progress', 'chat', 'voice', 'email')),
    context_id UUID, -- session_id, client_id, or other context identifier
    context_type TEXT, -- 'session', 'client', 'general', etc.
    title TEXT, -- Optional conversation title
    metadata JSONB DEFAULT '{}', -- Additional context data
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_interaction_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent Memory Table
-- Stores every message, interaction, feedback, and correction
CREATE TABLE IF NOT EXISTS public.agent_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.agent_conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    content_type TEXT DEFAULT 'text' CHECK (content_type IN ('text', 'soap-note', 'transcript', 'correction', 'feedback')),
    metadata JSONB DEFAULT '{}', -- transcript, session_id, section, etc.
    feedback_score INTEGER CHECK (feedback_score BETWEEN 1 AND 5),
    feedback_notes TEXT,
    was_corrected BOOLEAN DEFAULT FALSE,
    correction_content TEXT, -- Original content if this is a correction
    correction_reason TEXT, -- Why it was corrected
    parent_memory_id UUID REFERENCES public.agent_memory(id), -- Link to original if this is a correction
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Practitioner AI Preferences Table
-- Learns each practitioner's style, preferences, and patterns
CREATE TABLE IF NOT EXISTS public.practitioner_ai_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    soap_style JSONB DEFAULT '{}', -- preferred format, terminology, detail level
    common_phrases TEXT[] DEFAULT '{}', -- practitioner's frequently used phrases
    preferred_structure JSONB DEFAULT '{}', -- how they like SOAP notes organized
    corrections_history JSONB DEFAULT '[]', -- patterns from corrections
    terminology_preferences JSONB DEFAULT '{}', -- preferred medical terms
    detail_level TEXT DEFAULT 'moderate' CHECK (detail_level IN ('minimal', 'moderate', 'detailed', 'comprehensive')),
    learning_enabled BOOLEAN DEFAULT TRUE,
    last_learned_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent State Table
-- Persistent state across sessions (key-value storage)
CREATE TABLE IF NOT EXISTS public.agent_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    state_key TEXT NOT NULL, -- 'soap_generation_context', 'last_client_context', etc.
    state_data JSONB NOT NULL,
    expires_at TIMESTAMPTZ, -- NULL for permanent state
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, state_key)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_conversations_user_id ON public.agent_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_context ON public.agent_conversations(context_id, context_type);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_interface ON public.agent_conversations(interface_type);
CREATE INDEX IF NOT EXISTS idx_agent_memory_conversation_id ON public.agent_memory(conversation_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_user_id ON public.agent_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_created_at ON public.agent_memory(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_memory_corrected ON public.agent_memory(was_corrected) WHERE was_corrected = TRUE;
CREATE INDEX IF NOT EXISTS idx_agent_state_user_key ON public.agent_state(user_id, state_key);
CREATE INDEX IF NOT EXISTS idx_agent_state_expires ON public.agent_state(expires_at) WHERE expires_at IS NOT NULL;

-- Update timestamp triggers
CREATE OR REPLACE FUNCTION update_agent_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.last_interaction_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_agent_conversations_updated_at
    BEFORE UPDATE ON public.agent_conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_agent_conversations_updated_at();

CREATE OR REPLACE FUNCTION update_practitioner_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_practitioner_preferences_updated_at
    BEFORE UPDATE ON public.practitioner_ai_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_practitioner_preferences_updated_at();

CREATE OR REPLACE FUNCTION update_agent_state_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_agent_state_updated_at
    BEFORE UPDATE ON public.agent_state
    FOR EACH ROW
    EXECUTE FUNCTION update_agent_state_updated_at();

-- Helper Functions for Memory Retrieval

-- Get or create conversation
CREATE OR REPLACE FUNCTION get_or_create_conversation(
    p_user_id UUID,
    p_interface_type TEXT,
    p_context_id UUID DEFAULT NULL,
    p_context_type TEXT DEFAULT NULL,
    p_title TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    v_conversation_id UUID;
BEGIN
    -- Try to find existing conversation
    SELECT id INTO v_conversation_id
    FROM public.agent_conversations
    WHERE user_id = p_user_id
      AND interface_type = p_interface_type
      AND (p_context_id IS NULL OR context_id = p_context_id)
      AND (p_context_type IS NULL OR context_type = p_context_type)
    ORDER BY last_interaction_at DESC
    LIMIT 1;
    
    -- Create if not found
    IF v_conversation_id IS NULL THEN
        INSERT INTO public.agent_conversations (
            user_id, interface_type, context_id, context_type, title, metadata
        )
        VALUES (
            p_user_id, p_interface_type, p_context_id, p_context_type, p_title, p_metadata
        )
        RETURNING id INTO v_conversation_id;
    ELSE
        -- Update last interaction time
        UPDATE public.agent_conversations
        SET last_interaction_at = NOW()
        WHERE id = v_conversation_id;
    END IF;
    
    RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get agent memory for a user/context
CREATE OR REPLACE FUNCTION get_agent_memory(
    p_user_id UUID,
    p_context_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    conversation_id UUID,
    role TEXT,
    content TEXT,
    content_type TEXT,
    metadata JSONB,
    was_corrected BOOLEAN,
    correction_content TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.conversation_id,
        m.role,
        m.content,
        m.content_type,
        m.metadata,
        m.was_corrected,
        m.correction_content,
        m.created_at
    FROM public.agent_memory m
    JOIN public.agent_conversations c ON m.conversation_id = c.id
    WHERE c.user_id = p_user_id
      AND (p_context_id IS NULL OR c.context_id = p_context_id)
    ORDER BY m.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get recent corrections for learning
CREATE OR REPLACE FUNCTION get_recent_corrections(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    section TEXT,
    original_content TEXT,
    corrected_content TEXT,
    correction_reason TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        (m.metadata->>'section')::TEXT as section,
        m.correction_content as original_content,
        m.content as corrected_content,
        m.correction_reason,
        m.created_at
    FROM public.agent_memory m
    WHERE m.user_id = p_user_id
      AND m.was_corrected = TRUE
      AND m.correction_content IS NOT NULL
    ORDER BY m.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get practitioner preferences
CREATE OR REPLACE FUNCTION get_practitioner_preferences(p_user_id UUID)
RETURNS TABLE (
    soap_style JSONB,
    common_phrases TEXT[],
    preferred_structure JSONB,
    corrections_history JSONB,
    terminology_preferences JSONB,
    detail_level TEXT,
    learning_enabled BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(p.soap_style, '{}'::JSONB),
        COALESCE(p.common_phrases, '{}'::TEXT[]),
        COALESCE(p.preferred_structure, '{}'::JSONB),
        COALESCE(p.corrections_history, '[]'::JSONB),
        COALESCE(p.terminology_preferences, '{}'::JSONB),
        COALESCE(p.detail_level, 'moderate'),
        COALESCE(p.learning_enabled, TRUE)
    FROM public.practitioner_ai_preferences p
    WHERE p.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get agent state
CREATE OR REPLACE FUNCTION get_agent_state(
    p_user_id UUID,
    p_state_key TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_state_data JSONB;
BEGIN
    SELECT state_data INTO v_state_data
    FROM public.agent_state
    WHERE user_id = p_user_id
      AND state_key = p_state_key
      AND (expires_at IS NULL OR expires_at > NOW());
    
    RETURN COALESCE(v_state_data, '{}'::JSONB);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE public.agent_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practitioner_ai_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_state ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own data
CREATE POLICY "Users can manage their own agent conversations"
ON public.agent_conversations
FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own agent memory"
ON public.agent_memory
FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own AI preferences"
ON public.practitioner_ai_preferences
FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own agent state"
ON public.agent_state
FOR ALL
USING (auth.uid() = user_id);

-- Function to learn from corrections and update preferences
CREATE OR REPLACE FUNCTION learn_from_corrections(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_corrections JSONB[];
    v_correction RECORD;
    v_preferences JSONB;
    v_common_phrases TEXT[];
    v_corrections_history JSONB[];
BEGIN
    -- Get recent corrections
    SELECT ARRAY_AGG(
        jsonb_build_object(
            'section', section,
            'original', original_content,
            'corrected', corrected_content,
            'created_at', created_at
        )
    ) INTO v_corrections
    FROM get_recent_corrections(p_user_id, 20);

    IF v_corrections IS NULL OR array_length(v_corrections, 1) IS NULL THEN
        RETURN; -- No corrections to learn from
    END IF;

    -- Get or create preferences
    INSERT INTO public.practitioner_ai_preferences (user_id, learning_enabled)
    VALUES (p_user_id, TRUE)
    ON CONFLICT (user_id) DO NOTHING;

    SELECT 
        soap_style,
        common_phrases,
        corrections_history
    INTO v_preferences, v_common_phrases, v_corrections_history
    FROM public.practitioner_ai_preferences
    WHERE user_id = p_user_id;

    -- Update corrections history (keep last 50)
    v_corrections_history := COALESCE(v_corrections_history, '[]'::JSONB);
    v_corrections_history := (
        SELECT jsonb_agg(elem)
        FROM (
            SELECT elem
            FROM jsonb_array_elements(v_corrections_history || to_jsonb(v_corrections)) AS elem
            ORDER BY (elem->>'created_at') DESC
            LIMIT 50
        ) AS sub
    );

    -- Update preferences
    UPDATE public.practitioner_ai_preferences
    SET 
        corrections_history = v_corrections_history,
        last_learned_at = NOW(),
        updated_at = NOW()
    WHERE user_id = p_user_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for global learning - aggregates patterns across all practitioners
CREATE OR REPLACE FUNCTION analyze_global_learning_patterns()
RETURNS TABLE (
    pattern_type TEXT,
    pattern_data JSONB,
    frequency INTEGER,
    avg_feedback_score NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH correction_patterns AS (
        SELECT 
            'correction_section' as pattern_type,
            jsonb_build_object(
                'section', m.metadata->>'section',
                'common_changes', 'Patterns from corrections'
            ) as pattern_data,
            COUNT(*)::INTEGER as frequency,
            AVG(COALESCE(m.feedback_score, 3))::NUMERIC as avg_feedback_score
        FROM public.agent_memory m
        WHERE m.was_corrected = TRUE
          AND m.metadata->>'section' IS NOT NULL
        GROUP BY m.metadata->>'section'
        HAVING COUNT(*) >= 3  -- Only patterns with at least 3 occurrences
    ),
    feedback_patterns AS (
        SELECT 
            'high_quality_generation' as pattern_type,
            jsonb_build_object(
                'content_preview', LEFT(m.content, 200),
                'metadata', m.metadata
            ) as pattern_data,
            COUNT(*)::INTEGER as frequency,
            AVG(m.feedback_score)::NUMERIC as avg_feedback_score
        FROM public.agent_memory m
        WHERE m.role = 'assistant'
          AND m.content_type = 'soap-note'
          AND m.feedback_score >= 4
        GROUP BY LEFT(m.content, 200), m.metadata
        HAVING COUNT(*) >= 2  -- Patterns seen by multiple practitioners
    )
    SELECT * FROM correction_patterns
    UNION ALL
    SELECT * FROM feedback_patterns
    ORDER BY avg_feedback_score DESC, frequency DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION analyze_global_learning_patterns IS 'Analyzes patterns across all practitioners for global learning and best practices';

-- Comments for documentation
COMMENT ON TABLE public.agent_conversations IS 'Tracks AI agent conversations per user and context';
COMMENT ON TABLE public.agent_memory IS 'Stores every AI interaction, feedback, and correction for learning';
COMMENT ON TABLE public.practitioner_ai_preferences IS 'Learns and stores each practitioner''s AI style preferences';
COMMENT ON TABLE public.agent_state IS 'Persistent state storage across sessions for agent continuity';
COMMENT ON FUNCTION learn_from_corrections IS 'Analyzes corrections and updates practitioner preferences for learning';

