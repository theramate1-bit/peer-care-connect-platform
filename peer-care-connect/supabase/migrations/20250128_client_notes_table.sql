-- Create client_notes table to persist practitioner notes about clients
-- This fixes Issue #8 from the CTO audit: Client Notes Persistence

CREATE TABLE IF NOT EXISTS public.client_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practitioner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    client_email TEXT NOT NULL,
    client_name TEXT NOT NULL,
    notes TEXT,
    health_goals JSONB DEFAULT '[]'::jsonb,
    medical_history JSONB DEFAULT '{}'::jsonb,
    preferences JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(practitioner_id, client_email)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_client_notes_practitioner_id ON public.client_notes(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_client_notes_client_email ON public.client_notes(client_email);
CREATE INDEX IF NOT EXISTS idx_client_notes_client_id ON public.client_notes(client_id);

-- Enable RLS
ALTER TABLE public.client_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Practitioners can view their own client notes" ON public.client_notes
    FOR SELECT USING (auth.uid() = practitioner_id);

CREATE POLICY "Practitioners can insert their own client notes" ON public.client_notes
    FOR INSERT WITH CHECK (auth.uid() = practitioner_id);

CREATE POLICY "Practitioners can update their own client notes" ON public.client_notes
    FOR UPDATE USING (auth.uid() = practitioner_id);

CREATE POLICY "Practitioners can delete their own client notes" ON public.client_notes
    FOR DELETE USING (auth.uid() = practitioner_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_client_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_client_notes_updated_at
    BEFORE UPDATE ON public.client_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_client_notes_updated_at();

