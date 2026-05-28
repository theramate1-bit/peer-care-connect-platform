-- Create session_recordings table for AI note-taking
CREATE TABLE public.session_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.client_sessions(id) ON DELETE CASCADE,
  practitioner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID,
  recording_url TEXT,
  transcript TEXT,
  ai_summary TEXT,
  ai_key_points TEXT[],
  ai_action_items TEXT[],
  status TEXT DEFAULT 'recording' CHECK (status IN ('recording', 'processing', 'completed', 'error')),
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.session_recordings ENABLE ROW LEVEL SECURITY;

-- Create policies for session recordings
CREATE POLICY "Practitioners can manage their session recordings"
ON public.session_recordings
FOR ALL
USING (auth.uid() = practitioner_id);

CREATE POLICY "Clients can view their session recordings"
ON public.session_recordings
FOR SELECT
USING (auth.uid() = client_id);

-- Create update trigger
CREATE TRIGGER update_session_recordings_updated_at
  BEFORE UPDATE ON public.session_recordings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add recording support to client_sessions
ALTER TABLE public.client_sessions 
ADD COLUMN has_recording BOOLEAN DEFAULT false,
ADD COLUMN recording_consent BOOLEAN DEFAULT false;