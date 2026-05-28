-- Create treatment_notes table
CREATE TABLE IF NOT EXISTS public.treatment_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES public.client_sessions(id) ON DELETE CASCADE,
    practitioner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    note_type TEXT NOT NULL CHECK (note_type IN ('subjective', 'objective', 'assessment', 'plan', 'data', 'general')),
    content TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create progress_metrics table
CREATE TABLE IF NOT EXISTS public.progress_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    practitioner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.client_sessions(id) ON DELETE SET NULL,
    metric_type TEXT NOT NULL CHECK (metric_type IN ('pain_level', 'mobility', 'strength', 'flexibility', 'function', 'custom')),
    metric_name TEXT NOT NULL,
    value DECIMAL(10,2) NOT NULL,
    max_value DECIMAL(10,2) NOT NULL DEFAULT 10,
    unit TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    session_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create progress_goals table
CREATE TABLE IF NOT EXISTS public.progress_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    practitioner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    goal_name TEXT NOT NULL,
    description TEXT DEFAULT '',
    target_value DECIMAL(10,2) NOT NULL DEFAULT 0,
    current_value DECIMAL(10,2) NOT NULL DEFAULT 0,
    target_date DATE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'achieved', 'paused', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_treatment_notes_session_id ON public.treatment_notes(session_id);
CREATE INDEX IF NOT EXISTS idx_treatment_notes_practitioner_id ON public.treatment_notes(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_treatment_notes_client_id ON public.treatment_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_treatment_notes_created_at ON public.treatment_notes(created_at);

CREATE INDEX IF NOT EXISTS idx_progress_metrics_client_id ON public.progress_metrics(client_id);
CREATE INDEX IF NOT EXISTS idx_progress_metrics_practitioner_id ON public.progress_metrics(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_progress_metrics_session_date ON public.progress_metrics(session_date);

CREATE INDEX IF NOT EXISTS idx_progress_goals_client_id ON public.progress_goals(client_id);
CREATE INDEX IF NOT EXISTS idx_progress_goals_practitioner_id ON public.progress_goals(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_progress_goals_status ON public.progress_goals(status);

-- Enable Row Level Security
ALTER TABLE public.treatment_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_goals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for treatment_notes
CREATE POLICY "Practitioners can view their own treatment notes" ON public.treatment_notes
    FOR SELECT USING (practitioner_id = auth.uid());

CREATE POLICY "Practitioners can insert their own treatment notes" ON public.treatment_notes
    FOR INSERT WITH CHECK (practitioner_id = auth.uid());

CREATE POLICY "Practitioners can update their own treatment notes" ON public.treatment_notes
    FOR UPDATE USING (practitioner_id = auth.uid());

CREATE POLICY "Practitioners can delete their own treatment notes" ON public.treatment_notes
    FOR DELETE USING (practitioner_id = auth.uid());

-- Create RLS policies for progress_metrics
CREATE POLICY "Practitioners can view their own progress metrics" ON public.progress_metrics
    FOR SELECT USING (practitioner_id = auth.uid());

CREATE POLICY "Practitioners can insert their own progress metrics" ON public.progress_metrics
    FOR INSERT WITH CHECK (practitioner_id = auth.uid());

CREATE POLICY "Practitioners can update their own progress metrics" ON public.progress_metrics
    FOR UPDATE USING (practitioner_id = auth.uid());

CREATE POLICY "Practitioners can delete their own progress metrics" ON public.progress_metrics
    FOR DELETE USING (practitioner_id = auth.uid());

-- Create RLS policies for progress_goals
CREATE POLICY "Practitioners can view their own progress goals" ON public.progress_goals
    FOR SELECT USING (practitioner_id = auth.uid());

CREATE POLICY "Practitioners can insert their own progress goals" ON public.progress_goals
    FOR INSERT WITH CHECK (practitioner_id = auth.uid());

CREATE POLICY "Practitioners can update their own progress goals" ON public.progress_goals
    FOR UPDATE USING (practitioner_id = auth.uid());

CREATE POLICY "Practitioners can delete their own progress goals" ON public.progress_goals
    FOR DELETE USING (practitioner_id = auth.uid());

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER handle_treatment_notes_updated_at
    BEFORE UPDATE ON public.treatment_notes
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_progress_metrics_updated_at
    BEFORE UPDATE ON public.progress_metrics
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_progress_goals_updated_at
    BEFORE UPDATE ON public.progress_goals
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
