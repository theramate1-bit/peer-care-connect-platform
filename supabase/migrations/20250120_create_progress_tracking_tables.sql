-- Create progress_metrics table for tracking client progress
CREATE TABLE IF NOT EXISTS public.progress_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    practitioner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.client_sessions(id) ON DELETE CASCADE,
    metric_type TEXT NOT NULL CHECK (metric_type IN ('pain_level', 'mobility', 'strength', 'flexibility', 'function', 'custom')),
    metric_name TEXT NOT NULL,
    value DECIMAL(10,2) NOT NULL,
    max_value DECIMAL(10,2) NOT NULL,
    unit TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    session_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create progress_goals table for tracking client goals
CREATE TABLE IF NOT EXISTS public.progress_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    practitioner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    goal_name TEXT NOT NULL,
    description TEXT DEFAULT '',
    target_value DECIMAL(10,2) NOT NULL,
    current_value DECIMAL(10,2) DEFAULT 0,
    target_date DATE NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'achieved', 'paused', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_progress_metrics_client_id ON public.progress_metrics(client_id);
CREATE INDEX IF NOT EXISTS idx_progress_metrics_practitioner_id ON public.progress_metrics(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_progress_metrics_session_id ON public.progress_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_progress_metrics_metric_type ON public.progress_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_progress_metrics_session_date ON public.progress_metrics(session_date);

CREATE INDEX IF NOT EXISTS idx_progress_goals_client_id ON public.progress_goals(client_id);
CREATE INDEX IF NOT EXISTS idx_progress_goals_practitioner_id ON public.progress_goals(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_progress_goals_status ON public.progress_goals(status);
CREATE INDEX IF NOT EXISTS idx_progress_goals_target_date ON public.progress_goals(target_date);

-- Enable RLS
ALTER TABLE public.progress_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for progress_metrics
CREATE POLICY "Practitioners can view their client metrics" ON public.progress_metrics
    FOR SELECT USING (auth.uid() = practitioner_id);

CREATE POLICY "Clients can view their own metrics" ON public.progress_metrics
    FOR SELECT USING (auth.uid() = client_id);

CREATE POLICY "Practitioners can insert metrics" ON public.progress_metrics
    FOR INSERT WITH CHECK (auth.uid() = practitioner_id);

CREATE POLICY "Practitioners can update their metrics" ON public.progress_metrics
    FOR UPDATE USING (auth.uid() = practitioner_id);

CREATE POLICY "Practitioners can delete their metrics" ON public.progress_metrics
    FOR DELETE USING (auth.uid() = practitioner_id);

-- RLS Policies for progress_goals
CREATE POLICY "Practitioners can view their client goals" ON public.progress_goals
    FOR SELECT USING (auth.uid() = practitioner_id);

CREATE POLICY "Clients can view their own goals" ON public.progress_goals
    FOR SELECT USING (auth.uid() = client_id);

CREATE POLICY "Practitioners can insert goals" ON public.progress_goals
    FOR INSERT WITH CHECK (auth.uid() = practitioner_id);

CREATE POLICY "Practitioners can update their goals" ON public.progress_goals
    FOR UPDATE USING (auth.uid() = practitioner_id);

CREATE POLICY "Practitioners can delete their goals" ON public.progress_goals
    FOR DELETE USING (auth.uid() = practitioner_id);

-- Create updated_at triggers
CREATE TRIGGER update_progress_metrics_updated_at 
    BEFORE UPDATE ON public.progress_metrics 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_progress_goals_updated_at 
    BEFORE UPDATE ON public.progress_goals 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
