-- Pre-Treatment Intake Forms System
-- Allows collection of session-specific medical history and injury details

-- Booking intake forms table (linked to client_sessions)
CREATE TABLE IF NOT EXISTS booking_intake_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES client_sessions(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  practitioner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_type TEXT,
  form_template TEXT NOT NULL DEFAULT 'general', -- 'sports_injury', 'general_wellness', 'osteopathy', etc.
  form_data JSONB NOT NULL, -- Flexible JSON structure for form fields
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_booking_intake_forms_session ON booking_intake_forms(session_id);
CREATE INDEX IF NOT EXISTS idx_booking_intake_forms_client ON booking_intake_forms(client_id);
CREATE INDEX IF NOT EXISTS idx_booking_intake_forms_practitioner ON booking_intake_forms(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_booking_intake_forms_template ON booking_intake_forms(form_template);

-- RLS Policies
ALTER TABLE booking_intake_forms ENABLE ROW LEVEL SECURITY;

-- Clients can view and update their own intake forms
CREATE POLICY "Clients can view their own intake forms"
  ON booking_intake_forms FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Clients can insert their own intake forms"
  ON booking_intake_forms FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can update their own intake forms"
  ON booking_intake_forms FOR UPDATE
  USING (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);

-- Practitioners can view intake forms for their sessions
CREATE POLICY "Practitioners can view their sessions' intake forms"
  ON booking_intake_forms FOR SELECT
  USING (auth.uid() = practitioner_id);

-- Service role can do everything (for edge functions)
CREATE POLICY "Service role has full access to intake forms"
  ON booking_intake_forms FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Add intake_form_completed flag to client_sessions if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'client_sessions' AND column_name = 'intake_form_completed') THEN
    ALTER TABLE client_sessions ADD COLUMN intake_form_completed BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Function to check if intake form is required for a session
CREATE OR REPLACE FUNCTION is_intake_form_required(p_session_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session RECORD;
BEGIN
  SELECT id, service_id, session_type, status
  INTO v_session
  FROM client_sessions
  WHERE id = p_session_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Intake form is required before payment confirmation
  -- Allow if already completed or if session is in pending_payment status
  IF v_session.status IN ('pending_payment', 'scheduled', 'confirmed') THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Function to mark intake form as completed
CREATE OR REPLACE FUNCTION complete_intake_form(
  p_session_id UUID,
  p_form_data JSONB,
  p_form_template TEXT DEFAULT 'general'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session RECORD;
  v_form_id UUID;
BEGIN
  -- Get session details
  SELECT 
    id,
    client_id,
    therapist_id,
    service_id,
    session_type
  INTO v_session
  FROM client_sessions
  WHERE id = p_session_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Session not found'
    );
  END IF;
  
  -- Check if form already exists
  SELECT id INTO v_form_id
  FROM booking_intake_forms
  WHERE session_id = p_session_id;
  
  IF v_form_id IS NOT NULL THEN
    -- Update existing form
    UPDATE booking_intake_forms
    SET 
      form_data = p_form_data,
      form_template = p_form_template,
      updated_at = NOW(),
      completed_at = NOW()
    WHERE id = v_form_id;
    
    v_form_id := v_form_id;
  ELSE
    -- Create new form
    INSERT INTO booking_intake_forms (
      session_id,
      client_id,
      practitioner_id,
      service_type,
      form_template,
      form_data,
      completed_at
    )
    VALUES (
      p_session_id,
      v_session.client_id,
      v_session.therapist_id,
      v_session.session_type,
      p_form_template,
      p_form_data,
      NOW()
    )
    RETURNING id INTO v_form_id;
  END IF;
  
  -- Mark session as having completed intake form
  UPDATE client_sessions
  SET intake_form_completed = true
  WHERE id = p_session_id;
  
  RETURN json_build_object(
    'success', true,
    'form_id', v_form_id
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION is_intake_form_required(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_intake_form_required(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION complete_intake_form(UUID, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_intake_form(UUID, JSONB, TEXT) TO service_role;

-- Comments
COMMENT ON TABLE booking_intake_forms IS 'Pre-treatment intake forms collected before session booking completion';
COMMENT ON FUNCTION is_intake_form_required IS 'Checks if intake form is required for a session';
COMMENT ON FUNCTION complete_intake_form IS 'Completes and saves intake form for a session';

