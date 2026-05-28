-- Create treatment_notes table for live session documentation
CREATE TABLE IF NOT EXISTS public.treatment_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.client_sessions(id) ON DELETE CASCADE,
    practitioner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    note_type TEXT NOT NULL CHECK (note_type IN ('subjective', 'objective', 'assessment', 'plan', 'general')),
    content TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_treatment_notes_session_id ON public.treatment_notes(session_id);
CREATE INDEX IF NOT EXISTS idx_treatment_notes_practitioner_id ON public.treatment_notes(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_treatment_notes_client_id ON public.treatment_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_treatment_notes_note_type ON public.treatment_notes(note_type);
CREATE INDEX IF NOT EXISTS idx_treatment_notes_timestamp ON public.treatment_notes(timestamp);

-- Enable RLS
ALTER TABLE public.treatment_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Practitioners can view their treatment notes" ON public.treatment_notes
    FOR SELECT USING (auth.uid() = practitioner_id);

CREATE POLICY "Clients can view their treatment notes" ON public.treatment_notes
    FOR SELECT USING (auth.uid() = client_id);

CREATE POLICY "Practitioners can insert treatment notes" ON public.treatment_notes
    FOR INSERT WITH CHECK (auth.uid() = practitioner_id);

CREATE POLICY "Practitioners can update their treatment notes" ON public.treatment_notes
    FOR UPDATE USING (auth.uid() = practitioner_id);

CREATE POLICY "Practitioners can delete their treatment notes" ON public.treatment_notes
    FOR DELETE USING (auth.uid() = practitioner_id);

-- Create updated_at trigger
CREATE TRIGGER update_treatment_notes_updated_at 
    BEFORE UPDATE ON public.treatment_notes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
