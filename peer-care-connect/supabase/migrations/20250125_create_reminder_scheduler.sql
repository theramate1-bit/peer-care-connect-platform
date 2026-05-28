-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a cron job to process reminders every hour
-- This will run the process-reminders Edge Function every hour
SELECT cron.schedule(
  'process-session-reminders',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.api_url') || '/functions/v1/process-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Alternative: Create a database function that can be called by pg_cron
-- This approach doesn't require HTTP calls and runs directly in the database
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

-- Schedule the database function to run every hour
SELECT cron.schedule(
  'process-session-reminders-db',
  '0 * * * *', -- Every hour at minute 0
  'SELECT process_session_reminders();'
);

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
