-- Create onboarding progress table to save practitioner progress
-- This allows practitioners to resume onboarding from where they left off

CREATE TABLE IF NOT EXISTS public.onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_step INTEGER NOT NULL DEFAULT 1,
  total_steps INTEGER NOT NULL DEFAULT 6,
  form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  completed_steps INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  last_saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user_id ON public.onboarding_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_last_saved ON public.onboarding_progress(last_saved_at);

-- Enable RLS
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own progress
CREATE POLICY "Users can view their own onboarding progress"
  ON public.onboarding_progress
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own onboarding progress"
  ON public.onboarding_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own onboarding progress"
  ON public.onboarding_progress
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own onboarding progress"
  ON public.onboarding_progress
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_onboarding_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.last_saved_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update timestamps
DROP TRIGGER IF EXISTS update_onboarding_progress_updated_at_trigger ON public.onboarding_progress;
CREATE TRIGGER update_onboarding_progress_updated_at_trigger
  BEFORE UPDATE ON public.onboarding_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_onboarding_progress_updated_at();

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.onboarding_progress TO authenticated;

-- Comments for documentation
COMMENT ON TABLE public.onboarding_progress IS 'Stores practitioner onboarding progress to allow resuming from where they left off';
COMMENT ON COLUMN public.onboarding_progress.current_step IS 'The current step number in the onboarding flow (1-6)';
COMMENT ON COLUMN public.onboarding_progress.form_data IS 'JSON object containing all form field values';
COMMENT ON COLUMN public.onboarding_progress.completed_steps IS 'Array of step numbers that have been completed';
COMMENT ON COLUMN public.onboarding_progress.last_saved_at IS 'Timestamp of when progress was last saved';

