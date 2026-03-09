-- Apply email-related migrations directly
-- This script applies only the email notification system changes

-- Create email_logs table for tracking email delivery
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  email_type VARCHAR(50) NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  subject TEXT NOT NULL,
  resend_email_id TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- pending, sent, delivered, failed, bounced
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_email_type ON email_logs(email_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient_email ON email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_resend_email_id ON email_logs(resend_email_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at);

-- Add RLS policies
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own email logs
CREATE POLICY IF NOT EXISTS "Users can view their own email logs" ON email_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Service role can insert email logs
CREATE POLICY IF NOT EXISTS "Service role can insert email logs" ON email_logs
  FOR INSERT WITH CHECK (true);

-- Policy: Service role can update email logs
CREATE POLICY IF NOT EXISTS "Service role can update email logs" ON email_logs
  FOR UPDATE USING (true);

-- Policy: Service role can delete email logs
CREATE POLICY IF NOT EXISTS "Service role can delete email logs" ON email_logs
  FOR DELETE USING (true);

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a function to process session reminders
CREATE OR REPLACE FUNCTION process_session_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  reminder_record RECORD;
  session_record RECORD;
  now_timestamp TIMESTAMP := NOW();
BEGIN
  -- Get pending reminders that are due
  FOR reminder_record IN
    SELECT r.*, s.session_date, s.start_time, s.client_id, s.therapist_id, s.session_type, s.duration_minutes, s.location,
           c.first_name as client_first_name, c.last_name as client_last_name, c.email as client_email,
           p.first_name as practitioner_first_name, p.last_name as practitioner_last_name, p.email as practitioner_email
    FROM reminders r
    JOIN client_sessions s ON r.session_id = s.id
    JOIN users c ON s.client_id = c.id
    JOIN users p ON s.therapist_id = p.id
    WHERE r.status = 'pending' 
    AND r.reminder_time <= now_timestamp
  LOOP
    BEGIN
      -- Create notifications for both client and practitioner
      INSERT INTO notifications (user_id, type, title, message, data)
      VALUES 
        (reminder_record.client_id, 'session_reminder', 'Session Reminder', 
         'Your ' || reminder_record.session_type || ' session with ' || 
         reminder_record.practitioner_first_name || ' ' || reminder_record.practitioner_last_name || 
         ' is ' || LOWER(reminder_record.message) || '.',
         jsonb_build_object(
           'session_id', reminder_record.session_id,
           'practitioner_name', reminder_record.practitioner_first_name || ' ' || reminder_record.practitioner_last_name,
           'session_date', reminder_record.session_date,
           'start_time', reminder_record.start_time,
           'session_type', reminder_record.session_type
         )),
        (reminder_record.therapist_id, 'session_reminder', 'Session Reminder',
         'Your ' || reminder_record.session_type || ' session with ' ||
         reminder_record.client_first_name || ' ' || reminder_record.client_last_name ||
         ' is ' || LOWER(reminder_record.message) || '.',
         jsonb_build_object(
           'session_id', reminder_record.session_id,
           'client_name', reminder_record.client_first_name || ' ' || reminder_record.client_last_name,
           'session_date', reminder_record.session_date,
           'start_time', reminder_record.start_time,
           'session_type', reminder_record.session_type
         ));

      -- Mark reminder as sent
      UPDATE reminders 
      SET status = 'sent', sent_at = now_timestamp
      WHERE id = reminder_record.id;

    EXCEPTION WHEN OTHERS THEN
      -- Mark reminder as failed
      UPDATE reminders 
      SET status = 'failed', error_message = SQLERRM
      WHERE id = reminder_record.id;
    END;
  END LOOP;
END;
$$;

-- Create a function to manually trigger reminder processing (for testing)
CREATE OR REPLACE FUNCTION trigger_reminder_processing()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM process_session_reminders();
  RETURN 'Reminder processing triggered successfully';
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION process_session_reminders() TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_reminder_processing() TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_reminder_processing() TO service_role;

-- Schedule the database function to run every hour (if pg_cron is available)
-- Note: This might fail if pg_cron is not available, but that's okay
DO $$
BEGIN
  -- Try to schedule the cron job
  BEGIN
    PERFORM cron.schedule(
      'process-session-reminders-db',
      '0 * * * *', -- Every hour at minute 0
      'SELECT process_session_reminders();'
    );
  EXCEPTION WHEN OTHERS THEN
    -- If pg_cron is not available, just log and continue
    RAISE NOTICE 'pg_cron not available, skipping cron job setup';
  END;
END $$;
