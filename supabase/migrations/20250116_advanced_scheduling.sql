-- Advanced Scheduling System Migration
-- Creates tables for recurring sessions, waitlists, and reminders

-- Recurring session patterns table
CREATE TABLE IF NOT EXISTS recurring_patterns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    therapist_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pattern_type VARCHAR(20) NOT NULL CHECK (pattern_type IN ('daily', 'weekly', 'biweekly', 'monthly', 'custom')),
    frequency INTEGER NOT NULL DEFAULT 1, -- Every X days/weeks/months
    days_of_week INTEGER[], -- [1,2,3,4,5] for weekdays, [1,3,5] for Mon,Wed,Fri
    day_of_month INTEGER, -- For monthly patterns
    start_date DATE NOT NULL,
    end_date DATE,
    session_duration_minutes INTEGER NOT NULL DEFAULT 60,
    session_type VARCHAR(50) NOT NULL,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recurring session instances table
CREATE TABLE IF NOT EXISTS recurring_session_instances (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pattern_id UUID NOT NULL REFERENCES recurring_patterns(id) ON DELETE CASCADE,
    session_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
    client_session_id UUID REFERENCES client_sessions(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Waitlist table
CREATE TABLE IF NOT EXISTS waitlists (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    therapist_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_type VARCHAR(50) NOT NULL,
    preferred_duration_minutes INTEGER NOT NULL DEFAULT 60,
    preferred_days INTEGER[], -- Days of week [1,2,3,4,5,6,7]
    preferred_times TIME[], -- Preferred time slots
    max_wait_days INTEGER DEFAULT 30, -- Maximum days to wait
    priority INTEGER DEFAULT 0, -- Higher number = higher priority
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'fulfilled', 'cancelled', 'expired')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Waitlist matches table - tracks when waitlist entries are fulfilled
CREATE TABLE IF NOT EXISTS waitlist_matches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    waitlist_id UUID NOT NULL REFERENCES waitlists(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES client_sessions(id) ON DELETE CASCADE,
    matched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notification_sent BOOLEAN DEFAULT false,
    notification_sent_at TIMESTAMP WITH TIME ZONE
);

-- Reminders table
CREATE TABLE IF NOT EXISTS reminders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES client_sessions(id) ON DELETE CASCADE,
    reminder_type VARCHAR(20) NOT NULL CHECK (reminder_type IN ('email', 'sms', 'push')),
    reminder_time TIMESTAMP WITH TIME ZONE NOT NULL,
    message TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email_reminders BOOLEAN DEFAULT true,
    sms_reminders BOOLEAN DEFAULT false,
    push_reminders BOOLEAN DEFAULT true,
    reminder_advance_hours INTEGER DEFAULT 24, -- How many hours before session
    email_address VARCHAR(255),
    phone_number VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Function to generate recurring session instances
CREATE OR REPLACE FUNCTION generate_recurring_instances(
    p_pattern_id UUID,
    p_start_date DATE,
    p_end_date DATE DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_pattern RECORD;
    v_current_date DATE;
    v_end_date DATE;
    v_instance_count INTEGER := 0;
    v_session_date DATE;
    v_day_of_week INTEGER;
    v_is_valid_day BOOLEAN;
BEGIN
    -- Get pattern details
    SELECT * INTO v_pattern FROM recurring_patterns WHERE id = p_pattern_id;
    
    IF v_pattern IS NULL THEN
        RETURN 0;
    END IF;
    
    v_current_date := p_start_date;
    v_end_date := COALESCE(p_end_date, v_pattern.end_date, p_start_date + INTERVAL '1 year');
    
    -- Generate instances based on pattern type
    WHILE v_current_date <= v_end_date LOOP
        v_is_valid_day := false;
        
        -- Check if current date matches pattern
        IF v_pattern.pattern_type = 'daily' THEN
            v_is_valid_day := true;
        ELSIF v_pattern.pattern_type = 'weekly' THEN
            v_day_of_week := EXTRACT(DOW FROM v_current_date);
            v_is_valid_day := v_day_of_week = ANY(v_pattern.days_of_week);
        ELSIF v_pattern.pattern_type = 'monthly' THEN
            v_is_valid_day := EXTRACT(DAY FROM v_current_date) = v_pattern.day_of_month;
        END IF;
        
        -- Create instance if valid day
        IF v_is_valid_day THEN
            INSERT INTO recurring_session_instances (
                pattern_id,
                session_date,
                start_time,
                end_time,
                status
            ) VALUES (
                p_pattern_id,
                v_current_date,
                '09:00:00', -- Default start time, should be configurable
                '09:00:00'::TIME + (v_pattern.session_duration_minutes || ' minutes')::INTERVAL,
                'scheduled'
            );
            
            v_instance_count := v_instance_count + 1;
        END IF;
        
        -- Move to next date based on frequency
        IF v_pattern.pattern_type = 'daily' THEN
            v_current_date := v_current_date + (v_pattern.frequency || ' days')::INTERVAL;
        ELSIF v_pattern.pattern_type = 'weekly' THEN
            v_current_date := v_current_date + (v_pattern.frequency || ' weeks')::INTERVAL;
        ELSIF v_pattern.pattern_type = 'monthly' THEN
            v_current_date := v_current_date + (v_pattern.frequency || ' months')::INTERVAL;
        ELSE
            v_current_date := v_current_date + INTERVAL '1 day';
        END IF;
    END LOOP;
    
    RETURN v_instance_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create recurring sessions
CREATE OR REPLACE FUNCTION create_recurring_sessions(
    p_user_id UUID,
    p_therapist_id UUID,
    p_pattern_type VARCHAR(20),
    p_frequency INTEGER,
    p_days_of_week INTEGER[],
    p_start_date DATE,
    p_end_date DATE,
    p_duration_minutes INTEGER,
    p_session_type VARCHAR(50),
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_pattern_id UUID;
    v_instance_count INTEGER;
BEGIN
    -- Create recurring pattern
    INSERT INTO recurring_patterns (
        user_id,
        therapist_id,
        pattern_type,
        frequency,
        days_of_week,
        start_date,
        end_date,
        session_duration_minutes,
        session_type,
        notes
    ) VALUES (
        p_user_id,
        p_therapist_id,
        p_pattern_type,
        p_frequency,
        p_days_of_week,
        p_start_date,
        p_end_date,
        p_duration_minutes,
        p_session_type,
        p_notes
    ) RETURNING id INTO v_pattern_id;
    
    -- Generate instances
    v_instance_count := generate_recurring_instances(v_pattern_id, p_start_date, p_end_date);
    
    RETURN v_pattern_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add user to waitlist
CREATE OR REPLACE FUNCTION add_to_waitlist(
    p_therapist_id UUID,
    p_client_id UUID,
    p_session_type VARCHAR(50),
    p_duration_minutes INTEGER,
    p_preferred_days INTEGER[],
    p_preferred_times TIME[],
    p_max_wait_days INTEGER,
    p_priority INTEGER,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_waitlist_id UUID;
BEGIN
    INSERT INTO waitlists (
        therapist_id,
        client_id,
        session_type,
        preferred_duration_minutes,
        preferred_days,
        preferred_times,
        max_wait_days,
        priority,
        notes
    ) VALUES (
        p_therapist_id,
        p_client_id,
        p_session_type,
        p_duration_minutes,
        p_preferred_days,
        p_preferred_times,
        p_max_wait_days,
        p_priority,
        p_notes
    ) RETURNING id INTO v_waitlist_id;
    
    RETURN v_waitlist_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create reminder
CREATE OR REPLACE FUNCTION create_reminder(
    p_session_id UUID,
    p_reminder_type VARCHAR(20),
    p_advance_hours INTEGER,
    p_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_session RECORD;
    v_reminder_time TIMESTAMP WITH TIME ZONE;
    v_reminder_id UUID;
BEGIN
    -- Get session details
    SELECT session_date, start_time INTO v_session
    FROM client_sessions
    WHERE id = p_session_id;
    
    IF v_session IS NULL THEN
        RAISE EXCEPTION 'Session not found';
    END IF;
    
    -- Calculate reminder time
    v_reminder_time := (v_session.session_date::TIMESTAMP + v_session.start_time::INTERVAL) - (p_advance_hours || ' hours')::INTERVAL;
    
    -- Create reminder
    INSERT INTO reminders (
        session_id,
        reminder_type,
        reminder_time,
        message
    ) VALUES (
        p_session_id,
        p_reminder_type,
        v_reminder_time,
        p_message
    ) RETURNING id INTO v_reminder_id;
    
    RETURN v_reminder_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's recurring patterns
CREATE OR REPLACE FUNCTION get_user_recurring_patterns(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    therapist_name TEXT,
    pattern_type VARCHAR(20),
    frequency INTEGER,
    days_of_week INTEGER[],
    start_date DATE,
    end_date DATE,
    session_duration_minutes INTEGER,
    session_type VARCHAR(50),
    is_active BOOLEAN,
    instance_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rp.id,
        CONCAT(up.first_name, ' ', up.last_name) as therapist_name,
        rp.pattern_type,
        rp.frequency,
        rp.days_of_week,
        rp.start_date,
        rp.end_date,
        rp.session_duration_minutes,
        rp.session_type,
        rp.is_active,
        COUNT(rsi.id) as instance_count
    FROM recurring_patterns rp
    LEFT JOIN user_profiles up ON rp.therapist_id = up.user_id
    LEFT JOIN recurring_session_instances rsi ON rp.id = rsi.pattern_id
    WHERE rp.user_id = p_user_id
    GROUP BY rp.id, up.first_name, up.last_name
    ORDER BY rp.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get waitlist for therapist
CREATE OR REPLACE FUNCTION get_therapist_waitlist(p_therapist_id UUID)
RETURNS TABLE (
    id UUID,
    client_name TEXT,
    session_type VARCHAR(50),
    preferred_duration_minutes INTEGER,
    preferred_days INTEGER[],
    preferred_times TIME[],
    priority INTEGER,
    status VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE,
    days_waiting INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        w.id,
        CONCAT(up.first_name, ' ', up.last_name) as client_name,
        w.session_type,
        w.preferred_duration_minutes,
        w.preferred_days,
        w.preferred_times,
        w.priority,
        w.status,
        w.created_at,
        EXTRACT(DAY FROM NOW() - w.created_at)::INTEGER as days_waiting
    FROM waitlists w
    LEFT JOIN user_profiles up ON w.client_id = up.user_id
    WHERE w.therapist_id = p_therapist_id
    ORDER BY w.priority DESC, w.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_recurring_patterns_user_id ON recurring_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_patterns_therapist_id ON recurring_patterns(therapist_id);
CREATE INDEX IF NOT EXISTS idx_recurring_instances_pattern_id ON recurring_session_instances(pattern_id);
CREATE INDEX IF NOT EXISTS idx_recurring_instances_date ON recurring_session_instances(session_date);
CREATE INDEX IF NOT EXISTS idx_waitlists_therapist_id ON waitlists(therapist_id);
CREATE INDEX IF NOT EXISTS idx_waitlists_client_id ON waitlists(client_id);
CREATE INDEX IF NOT EXISTS idx_waitlists_status ON waitlists(status);
CREATE INDEX IF NOT EXISTS idx_reminders_session_id ON reminders(session_id);
CREATE INDEX IF NOT EXISTS idx_reminders_reminder_time ON reminders(reminder_time);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON reminders(status);

-- RLS Policies
ALTER TABLE recurring_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_session_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Recurring patterns policies
CREATE POLICY "Users can view their own patterns" ON recurring_patterns
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() = therapist_id);

CREATE POLICY "Users can create patterns" ON recurring_patterns
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own patterns" ON recurring_patterns
    FOR UPDATE USING (auth.uid() = user_id);

-- Recurring instances policies
CREATE POLICY "Users can view their own instances" ON recurring_session_instances
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM recurring_patterns 
            WHERE id = pattern_id 
            AND (user_id = auth.uid() OR therapist_id = auth.uid())
        )
    );

-- Waitlist policies
CREATE POLICY "Users can view waitlists they're involved in" ON waitlists
    FOR SELECT USING (auth.uid() = client_id OR auth.uid() = therapist_id);

CREATE POLICY "Users can add themselves to waitlists" ON waitlists
    FOR INSERT WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Users can update their own waitlist entries" ON waitlists
    FOR UPDATE USING (auth.uid() = client_id);

-- Reminders policies
CREATE POLICY "Users can view their own reminders" ON reminders
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM client_sessions 
            WHERE id = session_id 
            AND (client_email = (SELECT email FROM auth.users WHERE id = auth.uid()) 
                 OR therapist_id = auth.uid())
        )
    );

-- Notification preferences policies
CREATE POLICY "Users can view their own preferences" ON notification_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" ON notification_preferences
    FOR ALL USING (auth.uid() = user_id);

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON recurring_patterns TO authenticated;
GRANT ALL ON recurring_session_instances TO authenticated;
GRANT ALL ON waitlists TO authenticated;
GRANT ALL ON waitlist_matches TO authenticated;
GRANT ALL ON reminders TO authenticated;
GRANT ALL ON notification_preferences TO authenticated;
GRANT EXECUTE ON FUNCTION generate_recurring_instances TO authenticated;
GRANT EXECUTE ON FUNCTION create_recurring_sessions TO authenticated;
GRANT EXECUTE ON FUNCTION add_to_waitlist TO authenticated;
GRANT EXECUTE ON FUNCTION create_reminder TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_recurring_patterns TO authenticated;
GRANT EXECUTE ON FUNCTION get_therapist_waitlist TO authenticated;
