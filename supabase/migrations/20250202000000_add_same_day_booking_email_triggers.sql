-- Add email triggers for same-day booking workflow
-- This migration adds email notifications for same-day booking events

-- 1. Add email trigger to decline_same_day_booking function
CREATE OR REPLACE FUNCTION public.decline_same_day_booking(
  p_session_id UUID,
  p_practitioner_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session RECORD;
  v_practitioner_name TEXT;
BEGIN
  -- Get session details
  SELECT * INTO v_session
  FROM public.client_sessions
  WHERE id = p_session_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Session not found'
    );
  END IF;

  -- Validate practitioner owns the session
  IF v_session.therapist_id != p_practitioner_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You do not have permission to decline this booking'
    );
  END IF;

  -- Validate session is pending approval
  IF v_session.status != 'pending_approval' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Session is not pending approval'
    );
  END IF;

  -- Get practitioner name
  SELECT first_name || ' ' || last_name INTO v_practitioner_name
  FROM public.users
  WHERE id = p_practitioner_id;

  -- Update session status to declined
  UPDATE public.client_sessions
  SET 
    status = 'declined',
    payment_status = 'released',
    decline_reason = p_reason,
    requires_approval = false,
    updated_at = NOW()
  WHERE id = p_session_id;

  -- Send email notification to client
  BEGIN
    PERFORM
      net.http_post(
        url := COALESCE(
          current_setting('app.settings.edge_function_url', true),
          'https://theramate.co.uk/functions/v1'
        ) || '/send-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || COALESCE(
            current_setting('app.settings.service_role_key', true),
            current_setting('app.settings.anon_key', true)
          )
        ),
        body := jsonb_build_object(
          'emailType', 'same_day_booking_declined_client',
          'recipientEmail', v_session.client_email,
          'recipientName', v_session.client_name,
          'data', jsonb_build_object(
            'sessionId', p_session_id,
            'sessionDate', v_session.session_date,
            'sessionTime', v_session.start_time,
            'sessionType', v_session.session_type,
            'sessionPrice', v_session.price,
            'practitionerName', v_practitioner_name,
            'declineReason', p_reason,
            'bookingUrl', COALESCE(
              current_setting('app.settings.site_url', true),
              'https://theramate.co.uk'
            ) || '/marketplace'
          )
        )
      );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to send decline email: %', SQLERRM;
  END;

  -- Create notification for client
  PERFORM public.create_notification(
    v_session.client_id,
    'booking_declined',
    'Booking Declined',
    COALESCE(
      'Your same-day booking was declined.' || CASE WHEN p_reason IS NOT NULL THEN ' Reason: ' || p_reason ELSE '' END,
      'Your same-day booking was declined.'
    ),
    jsonb_build_object(
      'session_id', p_session_id,
      'session_date', v_session.session_date,
      'start_time', v_session.start_time,
      'session_type', v_session.session_type,
      'decline_reason', p_reason
    ),
    'booking',
    p_session_id::text
  );

  -- Create notification for practitioner
  PERFORM public.create_notification(
    p_practitioner_id,
    'booking_declined_practitioner',
    'Booking Declined',
    'You have declined a same-day booking. Payment authorization has been released.',
    jsonb_build_object(
      'session_id', p_session_id,
      'session_date', v_session.session_date,
      'start_time', v_session.start_time,
      'client_name', v_session.client_name,
      'decline_reason', p_reason
    ),
    'booking',
    p_session_id::text
  );

  RETURN jsonb_build_object(
    'success', true,
    'session_id', p_session_id,
    'message', 'Booking declined. Payment authorization will be released.'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- 2. Update expire_pending_same_day_bookings to send emails
CREATE OR REPLACE FUNCTION public.expire_pending_same_day_bookings()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expired_count INTEGER := 0;
  v_session RECORD;
  v_practitioner_name TEXT;
BEGIN
  -- Find bookings that have passed their approval deadline
  FOR v_session IN
    SELECT cs.*
    FROM public.client_sessions cs
    WHERE cs.requires_approval = true
      AND cs.status = 'pending_approval'
      AND cs.approval_expires_at IS NOT NULL
      AND cs.approval_expires_at < NOW()
  LOOP
    -- Get practitioner name
    SELECT first_name || ' ' || last_name INTO v_practitioner_name
    FROM public.users
    WHERE id = v_session.therapist_id;

    -- Update session status to expired
    UPDATE public.client_sessions
    SET 
      status = 'expired',
      payment_status = 'released',
      requires_approval = false,
      updated_at = NOW()
    WHERE id = v_session.id;

    -- Send email to client
    BEGIN
      PERFORM
        net.http_post(
          url := COALESCE(
            current_setting('app.settings.edge_function_url', true),
            'https://theramate.co.uk/functions/v1'
          ) || '/send-email',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || COALESCE(
              current_setting('app.settings.service_role_key', true),
              current_setting('app.settings.anon_key', true)
            )
          ),
          body := jsonb_build_object(
            'emailType', 'same_day_booking_expired_client',
            'recipientEmail', v_session.client_email,
            'recipientName', v_session.client_name,
            'data', jsonb_build_object(
              'sessionId', v_session.id,
              'sessionDate', v_session.session_date,
              'sessionTime', v_session.start_time,
              'sessionType', v_session.session_type,
              'sessionPrice', v_session.price,
              'practitionerName', v_practitioner_name,
              'bookingUrl', COALESCE(
                current_setting('app.settings.site_url', true),
                'https://theramate.co.uk'
              ) || '/marketplace'
            )
          )
        );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to send expired email to client: %', SQLERRM;
    END;

    -- Send email to practitioner
    BEGIN
      PERFORM
        net.http_post(
          url := COALESCE(
            current_setting('app.settings.edge_function_url', true),
            'https://theramate.co.uk/functions/v1'
          ) || '/send-email',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || COALESCE(
              current_setting('app.settings.service_role_key', true),
              current_setting('app.settings.anon_key', true)
            )
          ),
          body := jsonb_build_object(
            'emailType', 'booking_expired_practitioner',
            'recipientEmail', (SELECT email FROM public.users WHERE id = v_session.therapist_id),
            'recipientName', v_practitioner_name,
            'data', jsonb_build_object(
              'sessionId', v_session.id,
              'sessionDate', v_session.session_date,
              'sessionTime', v_session.start_time,
              'sessionType', v_session.session_type,
              'clientName', v_session.client_name,
              'bookingUrl', COALESCE(
                current_setting('app.settings.site_url', true),
                'https://theramate.co.uk'
              ) || '/practice/bookings'
            )
          )
        );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to send expired email to practitioner: %', SQLERRM;
    END;

    -- Create notification for client
    PERFORM public.create_notification(
      v_session.client_id,
      'booking_expired',
      'Booking Expired',
      'Your same-day booking expired because it was not approved in time. Payment authorization has been released.',
      jsonb_build_object(
        'session_id', v_session.id,
        'session_date', v_session.session_date,
        'start_time', v_session.start_time,
        'session_type', v_session.session_type
      ),
      'booking',
      v_session.id::text
    );

    -- Create notification for practitioner
    PERFORM public.create_notification(
      v_session.therapist_id,
      'booking_expired_practitioner',
      'Booking Expired',
      'A same-day booking expired because it was not approved in time. Payment authorization has been released.',
      jsonb_build_object(
        'session_id', v_session.id,
        'session_date', v_session.session_date,
        'start_time', v_session.start_time,
        'client_name', v_session.client_name
      ),
      'booking',
      v_session.id::text
    );

    v_expired_count := v_expired_count + 1;
  END LOOP;

  RETURN v_expired_count;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail
    RAISE WARNING 'Error expiring pending same-day bookings: %', SQLERRM;
    RETURN v_expired_count;
END;
$$;

-- 3. Create trigger function to send email when same-day booking is created
CREATE OR REPLACE FUNCTION public.send_same_day_booking_pending_email()
RETURNS TRIGGER AS $$
DECLARE
  v_practitioner_email TEXT;
  v_practitioner_name TEXT;
BEGIN
  -- Only trigger for same-day bookings that require approval
  IF NEW.requires_approval = true AND NEW.status = 'pending_approval' THEN
    -- Get practitioner details
    SELECT email, first_name || ' ' || last_name INTO v_practitioner_email, v_practitioner_name
    FROM public.users
    WHERE id = NEW.therapist_id;

    -- Send email notification to practitioner
    BEGIN
      PERFORM
        net.http_post(
          url := COALESCE(
            current_setting('app.settings.edge_function_url', true),
            'https://theramate.co.uk/functions/v1'
          ) || '/send-email',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || COALESCE(
              current_setting('app.settings.service_role_key', true),
              current_setting('app.settings.anon_key', true)
            )
          ),
          body := jsonb_build_object(
            'emailType', 'same_day_booking_pending_practitioner',
            'recipientEmail', v_practitioner_email,
            'recipientName', v_practitioner_name,
            'data', jsonb_build_object(
              'sessionId', NEW.id,
              'sessionDate', NEW.session_date,
              'sessionTime', NEW.start_time,
              'sessionType', NEW.session_type,
              'sessionPrice', NEW.price,
              'sessionDuration', NEW.duration_minutes,
              'clientName', NEW.client_name,
              'clientEmail', NEW.client_email,
              'bookingUrl', COALESCE(
                current_setting('app.settings.site_url', true),
                'https://theramate.co.uk'
              ) || '/practice/sessions/' || NEW.id,
              'messageUrl', COALESCE(
                current_setting('app.settings.site_url', true),
                'https://theramate.co.uk'
              ) || '/messages'
            )
          )
        );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to send same-day booking pending email: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create trigger on client_sessions table
DROP TRIGGER IF EXISTS trigger_send_same_day_booking_pending_email ON public.client_sessions;
CREATE TRIGGER trigger_send_same_day_booking_pending_email
  AFTER INSERT ON public.client_sessions
  FOR EACH ROW
  WHEN (NEW.requires_approval = true AND NEW.status = 'pending_approval')
  EXECUTE FUNCTION public.send_same_day_booking_pending_email();

-- Add comments
COMMENT ON FUNCTION public.send_same_day_booking_pending_email() IS 'Sends email notification to practitioner when a same-day booking requiring approval is created';
COMMENT ON FUNCTION public.decline_same_day_booking(UUID, UUID, TEXT) IS 'Declines a same-day booking and sends email notification to client';
COMMENT ON FUNCTION public.expire_pending_same_day_bookings() IS 'Expires pending same-day bookings and sends email notifications to both client and practitioner';
