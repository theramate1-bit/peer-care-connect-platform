-- Patient History Request System
-- Allows new therapists to request patient history from previous practitioners

CREATE TABLE IF NOT EXISTS public.patient_history_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requesting_practitioner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  previous_practitioner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'cancelled')),
  request_notes TEXT,
  response_notes TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_patient_history_requests_requesting_practitioner ON public.patient_history_requests(requesting_practitioner_id);
CREATE INDEX IF NOT EXISTS idx_patient_history_requests_previous_practitioner ON public.patient_history_requests(previous_practitioner_id);
CREATE INDEX IF NOT EXISTS idx_patient_history_requests_client_id ON public.patient_history_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_patient_history_requests_status ON public.patient_history_requests(status);
CREATE INDEX IF NOT EXISTS idx_patient_history_requests_requested_at ON public.patient_history_requests(requested_at DESC);

-- Enable RLS
ALTER TABLE public.patient_history_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Requesting practitioner can view their own requests
CREATE POLICY "Requesting practitioners can view their requests" ON public.patient_history_requests
  FOR SELECT USING (auth.uid() = requesting_practitioner_id);

-- Previous practitioner can view requests for their patients
CREATE POLICY "Previous practitioners can view requests for their patients" ON public.patient_history_requests
  FOR SELECT USING (auth.uid() = previous_practitioner_id);

-- Requesting practitioner can create requests
CREATE POLICY "Requesting practitioners can create requests" ON public.patient_history_requests
  FOR INSERT WITH CHECK (auth.uid() = requesting_practitioner_id);

-- Previous practitioner can update (approve/deny) requests
CREATE POLICY "Previous practitioners can update requests" ON public.patient_history_requests
  FOR UPDATE USING (auth.uid() = previous_practitioner_id);

-- Requesting practitioner can cancel their own pending requests
CREATE POLICY "Requesting practitioners can cancel pending requests" ON public.patient_history_requests
  FOR UPDATE USING (
    auth.uid() = requesting_practitioner_id AND 
    status = 'pending'
  );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_patient_history_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  IF NEW.status != OLD.status AND NEW.status IN ('approved', 'denied', 'cancelled') THEN
    NEW.responded_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_patient_history_requests_updated_at
  BEFORE UPDATE ON public.patient_history_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_patient_history_requests_updated_at();

-- Add comment
COMMENT ON TABLE public.patient_history_requests IS 'Tracks requests from new practitioners to access patient history from previous practitioners';

