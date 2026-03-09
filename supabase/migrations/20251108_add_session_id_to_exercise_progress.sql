-- Add session_id to exercise_program_progress
-- Links exercise completions to sessions for better correlation with progress metrics

-- Add session_id column (nullable for backward compatibility)
ALTER TABLE exercise_program_progress
ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES client_sessions(id) ON DELETE SET NULL;

-- Add index for performance when querying by session
CREATE INDEX IF NOT EXISTS idx_hep_progress_session 
ON exercise_program_progress(session_id) 
WHERE session_id IS NOT NULL;

-- Add comment explaining the field
COMMENT ON COLUMN exercise_program_progress.session_id IS 'Optional link to the session this exercise completion relates to. Helps correlate exercise activity with session-based progress metrics.';

