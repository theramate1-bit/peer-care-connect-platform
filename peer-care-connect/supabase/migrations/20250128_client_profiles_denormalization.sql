-- Create client_profiles table with aggregated statistics
-- This fixes Issue #9 from the CTO audit: Client Stats Denormalization

CREATE TABLE IF NOT EXISTS public.client_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practitioner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    client_email TEXT NOT NULL,
    client_name TEXT NOT NULL,
    total_sessions INTEGER DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0.00,
    last_session TIMESTAMP WITH TIME ZONE,
    average_rating DECIMAL(3,2) DEFAULT 0.00,
    status TEXT DEFAULT 'active' CHECK (status IN ('new', 'active', 'inactive', 'archived')),
    notes TEXT,
    health_goals JSONB DEFAULT '[]'::jsonb,
    preferred_therapy_types JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(practitioner_id, client_email)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_client_profiles_practitioner_id ON public.client_profiles(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_client_profiles_client_id ON public.client_profiles(client_id);
CREATE INDEX IF NOT EXISTS idx_client_profiles_status ON public.client_profiles(status);
CREATE INDEX IF NOT EXISTS idx_client_profiles_last_session ON public.client_profiles(last_session DESC);

-- Enable RLS
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Enable read access for practitioner's own clients" 
    ON public.client_profiles FOR SELECT 
    USING (auth.uid() = practitioner_id);

CREATE POLICY "Enable insert for authenticated users" 
    ON public.client_profiles FOR INSERT 
    WITH CHECK (auth.uid() = practitioner_id);

CREATE POLICY "Enable update for practitioner's own clients" 
    ON public.client_profiles FOR UPDATE 
    USING (auth.uid() = practitioner_id);

CREATE POLICY "Enable delete for practitioner's own clients" 
    ON public.client_profiles FOR DELETE 
    USING (auth.uid() = practitioner_id);

-- Function to update client_profiles on session insert
CREATE OR REPLACE FUNCTION update_client_profile_on_session_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Upsert client profile
    INSERT INTO public.client_profiles (
        practitioner_id,
        client_id,
        client_email,
        client_name,
        total_sessions,
        total_spent,
        last_session,
        status,
        updated_at
    )
    VALUES (
        NEW.therapist_id,
        NEW.client_id,
        NEW.client_email,
        NEW.client_name,
        1,
        COALESCE(NEW.price, 0.00),
        NEW.session_date,
        'active',
        NOW()
    )
    ON CONFLICT (practitioner_id, client_email) 
    DO UPDATE SET
        total_sessions = public.client_profiles.total_sessions + 1,
        total_spent = public.client_profiles.total_spent + COALESCE(NEW.price, 0.00),
        last_session = CASE 
            WHEN NEW.session_date > COALESCE(public.client_profiles.last_session, '1970-01-01'::timestamp) 
            THEN NEW.session_date 
            ELSE public.client_profiles.last_session 
        END,
        status = 'active',
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update client_profiles on session update
CREATE OR REPLACE FUNCTION update_client_profile_on_session_update()
RETURNS TRIGGER AS $$
BEGIN
    -- If price changed or status changed, update the profile
    IF OLD.price != NEW.price OR OLD.status != NEW.status THEN
        UPDATE public.client_profiles
        SET
            total_spent = total_spent - COALESCE(OLD.price, 0.00) + COALESCE(NEW.price, 0.00),
            updated_at = NOW()
        WHERE practitioner_id = NEW.therapist_id 
          AND client_email = NEW.client_email;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update client_profiles on session delete
CREATE OR REPLACE FUNCTION update_client_profile_on_session_delete()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.client_profiles
    SET
        total_sessions = GREATEST(total_sessions - 1, 0),
        total_spent = GREATEST(total_spent - COALESCE(OLD.price, 0.00), 0.00),
        updated_at = NOW()
    WHERE practitioner_id = OLD.therapist_id 
      AND client_email = OLD.client_email;
    
    -- If no sessions left, mark as inactive
    UPDATE public.client_profiles
    SET status = 'inactive',
        updated_at = NOW()
    WHERE practitioner_id = OLD.therapist_id 
      AND client_email = OLD.client_email
      AND total_sessions = 0;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_update_client_profile_on_insert ON public.client_sessions;
CREATE TRIGGER trigger_update_client_profile_on_insert
    AFTER INSERT ON public.client_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_client_profile_on_session_insert();

DROP TRIGGER IF EXISTS trigger_update_client_profile_on_update ON public.client_sessions;
CREATE TRIGGER trigger_update_client_profile_on_update
    AFTER UPDATE ON public.client_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_client_profile_on_session_update();

DROP TRIGGER IF EXISTS trigger_update_client_profile_on_delete ON public.client_sessions;
CREATE TRIGGER trigger_update_client_profile_on_delete
    AFTER DELETE ON public.client_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_client_profile_on_session_delete();

-- Seed existing data
INSERT INTO public.client_profiles (
    practitioner_id,
    client_id,
    client_email,
    client_name,
    total_sessions,
    total_spent,
    last_session,
    status,
    created_at,
    updated_at
)
SELECT
    therapist_id,
    client_id,
    client_email,
    client_name,
    COUNT(*) as total_sessions,
    SUM(COALESCE(price, 0.00)) as total_spent,
    MAX(session_date) as last_session,
    'active' as status,
    MIN(created_at) as created_at,
    NOW() as updated_at
FROM public.client_sessions
WHERE therapist_id IS NOT NULL 
  AND client_email IS NOT NULL 
  AND client_name IS NOT NULL
GROUP BY therapist_id, client_id, client_email, client_name
ON CONFLICT (practitioner_id, client_email) DO NOTHING;

-- Comment on table
COMMENT ON TABLE public.client_profiles IS 'Denormalized client statistics maintained by triggers for fast querying';

