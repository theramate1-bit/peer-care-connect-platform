-- Add welcome email trigger for new users
-- This migration creates a function and trigger to send welcome emails when a user's role is set

-- Enable pg_net extension if not already enabled (for HTTP calls)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Function to send welcome email via edge function
CREATE OR REPLACE FUNCTION public.send_welcome_email()
RETURNS TRIGGER AS $$
DECLARE
  v_user_role TEXT;
  v_email_type TEXT;
  v_first_name TEXT;
  v_email TEXT;
  v_site_url TEXT;
  v_edge_function_url TEXT;
BEGIN
  -- Only trigger when user_role changes from NULL to a value
  IF OLD.user_role IS NULL AND NEW.user_role IS NOT NULL THEN
    v_user_role := NEW.user_role;
    v_first_name := COALESCE(NEW.first_name, 'there');
    v_email := NEW.email;
    
    -- Determine email type based on role
    IF v_user_role IN ('sports_therapist', 'massage_therapist', 'osteopath') THEN
      v_email_type := 'welcome_practitioner';
    ELSIF v_user_role = 'client' THEN
      v_email_type := 'welcome_client';
    ELSE
      -- Admin or other roles - don't send welcome email
      RETURN NEW;
    END IF;
    
    -- Get site URL and edge function URL from environment or use defaults
    v_site_url := COALESCE(
      current_setting('app.settings.site_url', true),
      'https://theramate.co.uk'
    );
    
    v_edge_function_url := COALESCE(
      current_setting('app.settings.edge_function_url', true),
      v_site_url || '/functions/v1'
    );
    
    -- Call the send-email edge function via HTTP using pg_net
    PERFORM
      net.http_post(
        url := v_edge_function_url || '/send-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || COALESCE(
            current_setting('app.settings.service_role_key', true),
            current_setting('app.settings.anon_key', true)
          )
        ),
        body := jsonb_build_object(
          'emailType', v_email_type,
          'recipientEmail', v_email,
          'recipientName', v_first_name,
          'data', jsonb_build_object(
            'bookingUrl', v_site_url || 
              CASE 
                WHEN v_user_role IN ('sports_therapist', 'massage_therapist', 'osteopath') THEN '/dashboard'
                ELSE '/marketplace'
              END
          )
        )
      );
    
    -- Log the email send attempt (optional, for debugging)
    INSERT INTO public.email_logs (
      email_type,
      recipient_email,
      subject,
      status,
      sent_at,
      metadata
    ) VALUES (
      v_email_type,
      v_email,
      'Welcome to TheraMate. - Your account is ready!',
      'pending',
      NOW(),
      jsonb_build_object(
        'user_id', NEW.id,
        'user_role', v_user_role,
        'triggered_by', 'welcome_email_trigger'
      )
    ) ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Failed to send welcome email for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on users table
DROP TRIGGER IF EXISTS trigger_send_welcome_email ON public.users;
CREATE TRIGGER trigger_send_welcome_email
  AFTER UPDATE OF user_role ON public.users
  FOR EACH ROW
  WHEN (OLD.user_role IS NULL AND NEW.user_role IS NOT NULL)
  EXECUTE FUNCTION public.send_welcome_email();

-- Add comment for documentation
COMMENT ON FUNCTION public.send_welcome_email() IS 'Sends welcome email when user role is set for the first time (changes from NULL to a value)';
