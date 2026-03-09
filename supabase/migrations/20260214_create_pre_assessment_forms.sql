-- Create pre_assessment_forms table for client pre-session screening
-- This form is mandatory for guests on every booking
-- Mandatory for clients with accounts on their initial session
-- Optional (prompted) for subsequent sessions

CREATE TABLE IF NOT EXISTS public.pre_assessment_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES client_sessions(id) ON DELETE CASCADE,
  client_id UUID REFERENCES users(id) ON DELETE SET NULL,
  client_email TEXT NOT NULL, -- For guest bookings
  client_name TEXT NOT NULL,
  
  -- Background Information
  name TEXT,
  date_of_birth DATE,
  contact_email TEXT,
  contact_phone TEXT,
  gp_name TEXT,
  gp_address TEXT,
  current_medical_conditions TEXT,
  past_medical_history TEXT,
  
  -- Session Details
  area_of_body TEXT,
  time_scale TEXT, -- e.g., "1 week", "3 months", "1 year"
  how_issue_began TEXT,
  activities_affected TEXT,
  
  -- Body Map Data (JSONB)
  body_map_markers JSONB DEFAULT '[]'::jsonb,
  -- Format: [{"id": "uuid", "x": 0.5, "y": 0.3, "side": "front", "notes": "Sharp pain", "timestamp": "2026-02-14T10:00:00Z"}]
  
  -- Metadata
  is_guest_booking BOOLEAN DEFAULT false,
  is_initial_session BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pre_assessment_forms_session_id ON public.pre_assessment_forms(session_id);
CREATE INDEX IF NOT EXISTS idx_pre_assessment_forms_client_id ON public.pre_assessment_forms(client_id);
CREATE INDEX IF NOT EXISTS idx_pre_assessment_forms_client_email ON public.pre_assessment_forms(client_email);
CREATE INDEX IF NOT EXISTS idx_pre_assessment_forms_completed_at ON public.pre_assessment_forms(completed_at);

-- Add columns to client_sessions table
ALTER TABLE public.client_sessions
ADD COLUMN IF NOT EXISTS pre_assessment_required BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS pre_assessment_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS pre_assessment_form_id UUID REFERENCES pre_assessment_forms(id) ON DELETE SET NULL;

-- Create index for the new foreign key
CREATE INDEX IF NOT EXISTS idx_client_sessions_pre_assessment_form_id ON public.client_sessions(pre_assessment_form_id);

-- Enable RLS
ALTER TABLE public.pre_assessment_forms ENABLE ROW LEVEL SECURITY;

-- RLS Policies following the pattern from client_sessions

-- Practitioners can view forms for their sessions
CREATE POLICY "Practitioners can view their session forms"
  ON public.pre_assessment_forms FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.client_sessions
      WHERE client_sessions.id = pre_assessment_forms.session_id
      AND client_sessions.therapist_id = auth.uid()
    )
  );

-- Clients can view their own forms
CREATE POLICY "Clients can view their own forms"
  ON public.pre_assessment_forms FOR SELECT
  USING (
    client_id = auth.uid() OR
    (client_id IS NULL AND client_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  );

-- Allow form creation for authenticated clients and guests
CREATE POLICY "Allow form creation"
  ON public.pre_assessment_forms FOR INSERT
  WITH CHECK (
    -- Authenticated clients can create their own forms
    (client_id IS NOT NULL AND client_id = auth.uid()) OR
    -- Guests can create forms (client_id is NULL)
    (client_id IS NULL AND is_guest_booking = true)
  );

-- Allow form updates for form owners
CREATE POLICY "Allow form updates"
  ON public.pre_assessment_forms FOR UPDATE
  USING (
    client_id = auth.uid() OR
    (client_id IS NULL AND client_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  )
  WITH CHECK (
    client_id = auth.uid() OR
    (client_id IS NULL AND client_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pre_assessment_forms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_pre_assessment_forms_updated_at
  BEFORE UPDATE ON public.pre_assessment_forms
  FOR EACH ROW
  EXECUTE FUNCTION update_pre_assessment_forms_updated_at();

-- Create function to check if this is client's first session with practitioner
-- This will be used to determine if form is mandatory
CREATE OR REPLACE FUNCTION is_first_session_with_practitioner(
  p_client_id UUID,
  p_therapist_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_session_count INTEGER;
BEGIN
  -- Count completed sessions (not cancelled/no_show) between this client and therapist
  SELECT COUNT(*)
  INTO v_session_count
  FROM public.client_sessions
  WHERE client_id = p_client_id
    AND therapist_id = p_therapist_id
    AND status IN ('completed', 'confirmed', 'scheduled', 'in_progress')
    AND payment_status IN ('completed', 'succeeded');
  
  RETURN v_session_count = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment to table
COMMENT ON TABLE public.pre_assessment_forms IS 'Pre-assessment forms for client screening before sessions. Mandatory for guests every time, mandatory for clients on first session, optional for subsequent sessions.';

-- Add comments to key columns
COMMENT ON COLUMN public.pre_assessment_forms.body_map_markers IS 'JSONB array of body map markers. Each marker: {"id": "uuid", "x": 0-1, "y": 0-1, "side": "front|back", "notes": "text", "timestamp": "ISO8601"}';
COMMENT ON COLUMN public.pre_assessment_forms.is_guest_booking IS 'True if this form is for a guest booking (client_id is NULL)';
COMMENT ON COLUMN public.pre_assessment_forms.is_initial_session IS 'True if this is the client''s first session with this practitioner';
