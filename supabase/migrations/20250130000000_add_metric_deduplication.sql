-- Add deduplication support for progress_metrics
-- Prevents duplicate metrics for the same session, metric_name, and session_date

-- Create unique index to prevent exact duplicates
-- Note: Using partial index with NULL handling since session_id can be NULL
CREATE UNIQUE INDEX IF NOT EXISTS idx_progress_metrics_unique_session_metric_date 
ON public.progress_metrics(session_id, metric_name, session_date)
WHERE session_id IS NOT NULL;

-- For metrics without session_id, use client_id + metric_name + session_date
CREATE UNIQUE INDEX IF NOT EXISTS idx_progress_metrics_unique_client_metric_date 
ON public.progress_metrics(client_id, metric_name, session_date)
WHERE session_id IS NULL;

-- Function to check if a metric already exists
CREATE OR REPLACE FUNCTION public.metric_exists(
  p_session_id UUID,
  p_client_id UUID,
  p_metric_name TEXT,
  p_session_date DATE
) RETURNS BOOLEAN AS $$
BEGIN
  IF p_session_id IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM public.progress_metrics
      WHERE session_id = p_session_id
        AND metric_name = p_metric_name
        AND session_date = p_session_date
    );
  ELSE
    RETURN EXISTS (
      SELECT 1 FROM public.progress_metrics
      WHERE client_id = p_client_id
        AND session_id IS NULL
        AND metric_name = p_metric_name
        AND session_date = p_session_date
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.metric_exists(UUID, UUID, TEXT, DATE) TO authenticated;

