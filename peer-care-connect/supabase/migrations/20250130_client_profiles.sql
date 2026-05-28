-- Create client_profiles table
CREATE TABLE IF NOT EXISTS public.client_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  practitioner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Aggregated statistics
  total_sessions INT DEFAULT 0,
  completed_sessions INT DEFAULT 0,
  cancelled_sessions INT DEFAULT 0,
  no_show_sessions INT DEFAULT 0,
  total_spent_pence INT DEFAULT 0,
  
  -- Session timing
  last_session_date TIMESTAMPTZ,
  next_session_date TIMESTAMPTZ,
  first_session_date TIMESTAMPTZ,
  
  -- Treatment tracking
  active_treatment_plan BOOLEAN DEFAULT false,
  active_goals_count INT DEFAULT 0,
  
  -- Client status
  status TEXT DEFAULT 'active', -- active, inactive, new
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(client_id, practitioner_id)
);

-- Create indexes
CREATE INDEX idx_client_profiles_practitioner ON public.client_profiles(practitioner_id);
CREATE INDEX idx_client_profiles_status ON public.client_profiles(status);
CREATE INDEX idx_client_profiles_last_session ON public.client_profiles(last_session_date DESC);

-- Backfill existing data (only for sessions where both users exist)
INSERT INTO public.client_profiles (
  client_id,
  practitioner_id,
  total_sessions,
  completed_sessions,
  cancelled_sessions,
  total_spent_pence,
  first_session_date,
  last_session_date,
  status
)
SELECT 
  cs.client_id,
  cs.therapist_id,
  COUNT(*) as total_sessions,
  COUNT(*) FILTER (WHERE cs.status = 'completed') as completed_sessions,
  COUNT(*) FILTER (WHERE cs.status = 'cancelled') as cancelled_sessions,
  COALESCE(SUM(cs.price), 0) as total_spent_pence,
  MIN(cs.session_date) as first_session_date,
  MAX(cs.session_date) FILTER (WHERE cs.status = 'completed') as last_session_date,
  CASE 
    WHEN MAX(cs.session_date) > NOW() - INTERVAL '30 days' THEN 'active'
    WHEN MAX(cs.session_date) > NOW() - INTERVAL '90 days' THEN 'inactive'
    ELSE 'inactive'
  END as status
FROM public.client_sessions cs
WHERE cs.client_id IS NOT NULL 
  AND cs.therapist_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM auth.users WHERE users.id = cs.client_id)
  AND EXISTS (SELECT 1 FROM auth.users WHERE users.id = cs.therapist_id)
GROUP BY cs.client_id, cs.therapist_id
ON CONFLICT (client_id, practitioner_id) DO NOTHING;

-- Create trigger function (FIXED to handle DELETE operations)
CREATE OR REPLACE FUNCTION update_client_profile_on_session_change()
RETURNS TRIGGER AS $$
DECLARE
  v_client_id UUID;
  v_therapist_id UUID;
BEGIN
  -- Handle both INSERT/UPDATE and DELETE operations
  IF TG_OP = 'DELETE' THEN
    v_client_id := OLD.client_id;
    v_therapist_id := OLD.therapist_id;
  ELSE
    v_client_id := NEW.client_id;
    v_therapist_id := NEW.therapist_id;
  END IF;

  -- Insert or update client profile
  INSERT INTO public.client_profiles (
    client_id,
    practitioner_id,
    total_sessions,
    first_session_date
  )
  VALUES (
    v_client_id,
    v_therapist_id,
    CASE WHEN TG_OP = 'DELETE' THEN 0 ELSE 1 END,
    CASE 
      WHEN TG_OP = 'DELETE' THEN NULL
      WHEN TG_OP = 'INSERT' THEN NEW.session_date
      ELSE (SELECT MIN(session_date) FROM client_sessions WHERE client_id = v_client_id AND therapist_id = v_therapist_id)
    END
  )
  ON CONFLICT (client_id, practitioner_id) DO UPDATE SET
    total_sessions = (
      SELECT COUNT(*)
      FROM client_sessions
      WHERE client_id = v_client_id
        AND therapist_id = v_therapist_id
    ),
    completed_sessions = (
      SELECT COUNT(*)
      FROM client_sessions
      WHERE client_id = v_client_id
        AND therapist_id = v_therapist_id
        AND status = 'completed'
    ),
    cancelled_sessions = (
      SELECT COUNT(*)
      FROM client_sessions
      WHERE client_id = v_client_id
        AND therapist_id = v_therapist_id
        AND status = 'cancelled'
    ),
    no_show_sessions = (
      SELECT COUNT(*)
      FROM client_sessions
      WHERE client_id = v_client_id
        AND therapist_id = v_therapist_id
        AND status = 'no_show'
    ),
    total_spent_pence = (
      SELECT COALESCE(SUM(price * 100), 0)  -- Convert pounds to pence
      FROM client_sessions
      WHERE client_id = v_client_id
        AND therapist_id = v_therapist_id
        AND status = 'completed'
    ),
    last_session_date = (
      SELECT MAX(session_date)
      FROM client_sessions
      WHERE client_id = v_client_id
        AND therapist_id = v_therapist_id
        AND status = 'completed'
    ),
    next_session_date = (
      SELECT MIN(session_date)
      FROM client_sessions
      WHERE client_id = v_client_id
        AND therapist_id = v_therapist_id
        AND session_date > NOW()
        AND status IN ('scheduled', 'confirmed')
    ),
    status = CASE
      WHEN (SELECT MAX(session_date) FROM client_sessions 
            WHERE client_id = v_client_id 
              AND therapist_id = v_therapist_id) > NOW() - INTERVAL '30 days' 
      THEN 'active'
      ELSE 'inactive'
    END,
    updated_at = NOW();
    
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_update_client_profile
AFTER INSERT OR UPDATE OR DELETE ON public.client_sessions
FOR EACH ROW
EXECUTE FUNCTION update_client_profile_on_session_change();

-- Enable RLS
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Practitioners can view their client profiles"
  ON public.client_profiles FOR SELECT
  USING (auth.uid() = practitioner_id);

CREATE POLICY "Practitioners can update their client profiles"
  ON public.client_profiles FOR UPDATE
  USING (auth.uid() = practitioner_id);

