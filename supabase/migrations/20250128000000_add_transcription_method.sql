-- Add transcription_method field to track transcription source
ALTER TABLE public.session_recordings 
ADD COLUMN transcription_method TEXT DEFAULT 'browser' CHECK (transcription_method IN ('browser', 'whisper', 'manual'));

-- Add index for better query performance
CREATE INDEX idx_session_recordings_transcription_method ON public.session_recordings(transcription_method);

