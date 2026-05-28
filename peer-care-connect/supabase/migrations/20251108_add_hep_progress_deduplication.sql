-- Add Deduplication for HEP Progress Logs
-- Prevents clients from logging the same exercise multiple times per day

-- Create unique index to prevent duplicate logs
-- Using exercise_name instead of exercise_id since exercise_id can be null
CREATE UNIQUE INDEX IF NOT EXISTS idx_hep_progress_unique_log
ON exercise_program_progress(program_id, client_id, exercise_name, completed_date);

-- Add comment explaining the constraint
COMMENT ON INDEX idx_hep_progress_unique_log IS 'Prevents duplicate exercise logs for the same program, client, exercise, and date';

