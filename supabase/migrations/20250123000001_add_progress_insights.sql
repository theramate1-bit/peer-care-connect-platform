-- Add Progress Insights Table
-- Optional table for caching calculated insights to improve performance

CREATE TABLE IF NOT EXISTS public.progress_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    insight_type TEXT NOT NULL CHECK (insight_type IN ('trend', 'goal_progress', 'correlation', 'prediction', 'achievement', 'summary')),
    insight_data JSONB NOT NULL DEFAULT '{}',
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_progress_insights_client_id ON public.progress_insights(client_id);
CREATE INDEX IF NOT EXISTS idx_progress_insights_insight_type ON public.progress_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_progress_insights_calculated_at ON public.progress_insights(calculated_at);
CREATE INDEX IF NOT EXISTS idx_progress_insights_expires_at ON public.progress_insights(expires_at) WHERE expires_at IS NOT NULL;

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_progress_insights_client_type ON public.progress_insights(client_id, insight_type);

-- Enable RLS
ALTER TABLE public.progress_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Practitioners can view their client insights" ON public.progress_insights
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.progress_metrics pm
            WHERE pm.client_id = progress_insights.client_id
            AND pm.practitioner_id = auth.uid()
        )
    );

CREATE POLICY "Clients can view their own insights" ON public.progress_insights
    FOR SELECT USING (auth.uid() = client_id);

CREATE POLICY "Practitioners can insert insights" ON public.progress_insights
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.progress_metrics pm
            WHERE pm.client_id = progress_insights.client_id
            AND pm.practitioner_id = auth.uid()
        )
    );

CREATE POLICY "Practitioners can update insights" ON public.progress_insights
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.progress_metrics pm
            WHERE pm.client_id = progress_insights.client_id
            AND pm.practitioner_id = auth.uid()
        )
    );

CREATE POLICY "Practitioners can delete insights" ON public.progress_insights
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.progress_metrics pm
            WHERE pm.client_id = progress_insights.client_id
            AND pm.practitioner_id = auth.uid()
        )
    );

-- Add comment
COMMENT ON TABLE public.progress_insights IS 'Caches calculated progress insights to improve performance. Insights can be recalculated periodically or on-demand.';
COMMENT ON COLUMN public.progress_insights.insight_data IS 'JSONB object containing the calculated insight data (trends, predictions, correlations, etc.)';
COMMENT ON COLUMN public.progress_insights.expires_at IS 'Optional expiration time for cached insights. If NULL, insight does not expire.';

