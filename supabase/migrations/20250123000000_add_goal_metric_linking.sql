-- Add Goal-to-Metric Linking
-- Enables automatic goal progress tracking from linked metrics

-- Add columns to progress_goals table
ALTER TABLE public.progress_goals
ADD COLUMN IF NOT EXISTS linked_metric_name TEXT,
ADD COLUMN IF NOT EXISTS linked_metric_type TEXT,
ADD COLUMN IF NOT EXISTS auto_update_enabled BOOLEAN DEFAULT true;

-- Add index for performance when querying by linked metric
CREATE INDEX IF NOT EXISTS idx_progress_goals_linked_metric_name 
ON public.progress_goals(linked_metric_name) 
WHERE linked_metric_name IS NOT NULL;

-- Add comment explaining the fields
COMMENT ON COLUMN public.progress_goals.linked_metric_name IS 'Name of the metric this goal is linked to. When this metric is updated, the goal current_value will be automatically updated if auto_update_enabled is true.';
COMMENT ON COLUMN public.progress_goals.linked_metric_type IS 'Type of the linked metric (pain_level, mobility, strength, etc.)';
COMMENT ON COLUMN public.progress_goals.auto_update_enabled IS 'If true, goal current_value will be automatically updated when the linked metric changes. If false, goal must be manually updated.';

-- Function to update goal from metric
CREATE OR REPLACE FUNCTION public.update_goal_from_metric()
RETURNS TRIGGER AS $$
DECLARE
  v_goal RECORD;
  v_latest_metric_value DECIMAL(10,2);
  v_latest_metric_max DECIMAL(10,2);
  v_normalized_value DECIMAL(10,2);
BEGIN
  -- Find all goals linked to this metric
  FOR v_goal IN 
    SELECT id, linked_metric_name, target_value, auto_update_enabled
    FROM public.progress_goals
    WHERE linked_metric_name = NEW.metric_name
      AND client_id = NEW.client_id
      AND auto_update_enabled = true
      AND status = 'active'
  LOOP
    -- Get the latest value for this metric (could be the current NEW value or a more recent one)
    SELECT value, max_value INTO v_latest_metric_value, v_latest_metric_max
    FROM public.progress_metrics
    WHERE metric_name = NEW.metric_name
      AND client_id = NEW.client_id
    ORDER BY session_date DESC, created_at DESC
    LIMIT 1;
    
    -- If we found a metric value, update the goal
    IF v_latest_metric_value IS NOT NULL THEN
      -- Normalize the value based on the metric's max_value
      -- This allows goals to work with different metric scales
      v_normalized_value := v_latest_metric_value;
      
      -- Update the goal's current_value
      UPDATE public.progress_goals
      SET 
        current_value = v_normalized_value,
        status = CASE 
          WHEN v_normalized_value >= target_value THEN 'achieved'
          ELSE 'active'
        END,
        updated_at = NOW()
      WHERE id = v_goal.id;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on progress_metrics to auto-update linked goals
CREATE TRIGGER trigger_update_goal_from_metric
AFTER INSERT OR UPDATE ON public.progress_metrics
FOR EACH ROW
EXECUTE FUNCTION public.update_goal_from_metric();

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.update_goal_from_metric() TO authenticated;

