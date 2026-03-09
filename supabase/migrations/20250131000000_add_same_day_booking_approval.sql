-- Add same-day booking approval functionality
-- Same-day bookings require practitioner authorization before payment is captured
-- Payment is held via Stripe authorization until practitioner approves/declines

-- 1. Add 'pending_approval' to session_status enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'pending_approval' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'session_status')
  ) THEN
    ALTER TYPE session_status ADD VALUE 'pending_approval';
  END IF;
END $$;

-- 2. Add 'declined' to session_status enum (for declined same-day bookings)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'declined' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'session_status')
  ) THEN
    ALTER TYPE session_status ADD VALUE 'declined';
  END IF;
END $$;

-- 3. Add 'expired' to session_status enum (for expired approvals)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'expired' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'session_status')
  ) THEN
    ALTER TYPE session_status ADD VALUE 'expired';
  END IF;
END $$;

-- 4. Add columns to client_sessions table
ALTER TABLE public.client_sessions
  ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS decline_reason TEXT;

COMMENT ON COLUMN public.client_sessions.requires_approval IS 'True if this booking requires practitioner approval (same-day bookings)';
COMMENT ON COLUMN public.client_sessions.approval_expires_at IS 'Deadline for practitioner approval (session time minus 2 hours)';
COMMENT ON COLUMN public.client_sessions.decline_reason IS 'Reason provided when practitioner declines a same-day booking';

-- 5. Modify create_booking_with_validation to detect same-day bookings
-- This will be done by updating the function to check if session_date = CURRENT_DATE
-- and set appropriate status and expiration

-- 6. Create RPC function to approve same-day booking
CREATE OR REPLACE FUNCTION public.approve_same_day_booking(
  p_session_id UUID,
  p_practitioner_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session RECORD;
  v_session_datetime TIMESTAMPTZ;
BEGIN
  -- Get session details
  SELECT 
    cs.*,
    (cs.session_date || ' ' || cs.start_time)::TIMESTAMPTZ as session_datetime
  INTO v_session
  FROM public.client_sessions cs
  WHERE cs.id = p_session_id;

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
      'error', 'You do not have permission to approve this booking'
    );
  END IF;

  -- Validate session is pending approval
  IF v_session.status != 'pending_approval' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Session is not pending approval'
    );
  END IF;

  -- Validate approval hasn't expired
  IF v_session.approval_expires_at IS NOT NULL AND v_session.approval_expires_at < NOW() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Approval deadline has passed'
    );
  END IF;

  -- Validate payment is held
  IF v_session.payment_status != 'held' OR v_session.stripe_payment_intent_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Payment authorization not found'
    );
  END IF;

  -- Update session status to confirmed
  -- Payment capture will be handled by the edge function
  UPDATE public.client_sessions
  SET 
    status = 'confirmed',
    payment_status = 'pending', -- Will be updated to 'completed' after capture
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
          'emailType', 'same_day_booking_approved_client',
          'recipientEmail', v_session.client_email,
          'recipientName', v_session.client_name,
          'data', jsonb_build_object(
            'sessionId', p_session_id,
            'sessionDate', v_session.session_date,
            'sessionTime', v_session.start_time,
            'sessionType', v_session.session_type,
            'sessionPrice', v_session.price,
            'practitionerName', (SELECT first_name || ' ' || last_name FROM users WHERE id = p_practitioner_id),
            'bookingUrl', COALESCE(
              current_setting('app.settings.site_url', true),
              'https://theramate.co.uk'
            ) || '/client/sessions'
          )
        )
      );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to send approval email: %', SQLERRM;
  END;

  -- Create notification for client
  PERFORM public.create_notification(
    v_session.client_id,
    'booking_approved',
    'Booking Approved',
    'Your same-day booking has been approved. Payment will be processed shortly.',
    jsonb_build_object(
      'session_id', p_session_id,
      'session_date', v_session.session_date,
      'start_time', v_session.start_time,
      'session_type', v_session.session_type
    ),
    'booking',
    p_session_id::text
  );

  -- Create notification for practitioner
  PERFORM public.create_notification(
    p_practitioner_id,
    'booking_approved_practitioner',
    'Booking Approved',
    'You have approved a same-day booking. Payment will be captured.',
    jsonb_build_object(
      'session_id', p_session_id,
      'session_date', v_session.session_date,
      'start_time', v_session.start_time,
      'client_name', v_session.client_name
    ),
    'booking',
    p_session_id::text
  );

  RETURN jsonb_build_object(
    'success', true,
    'session_id', p_session_id,
    'message', 'Booking approved. Payment capture initiated.'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION public.approve_same_day_booking(UUID, UUID) IS 'Approves a same-day booking, updates status to confirmed. Payment capture must be called separately via edge function.';

-- 7. Create RPC function to decline same-day booking
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

  -- Update session status to declined
  -- Note: Payment release should be called separately via edge function by the frontend
  UPDATE public.client_sessions
  SET 
    status = 'declined',
    payment_status = 'released',
    decline_reason = p_reason,
    requires_approval = false,
    updated_at = NOW()
  WHERE id = p_session_id;

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

COMMENT ON FUNCTION public.decline_same_day_booking(UUID, UUID, TEXT) IS 'Declines a same-day booking, updates status to declined. Payment release must be called separately via edge function.';

-- 8. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.approve_same_day_booking(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decline_same_day_booking(UUID, UUID, TEXT) TO authenticated;

-- 9. Create function to expire pending same-day bookings
CREATE OR REPLACE FUNCTION public.expire_pending_same_day_bookings()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expired_count INTEGER := 0;
  v_session RECORD;
BEGIN
  -- Find bookings that have passed their approval deadline
  FOR v_session IN
    SELECT 
      cs.*,
      (cs.session_date || ' ' || cs.start_time)::TIMESTAMPTZ as session_datetime
    FROM public.client_sessions cs
    WHERE cs.status = 'pending_approval'
      AND cs.approval_expires_at IS NOT NULL
      AND cs.approval_expires_at < NOW()
  LOOP
    -- Release payment authorization via edge function
    IF v_session.stripe_payment_intent_id IS NOT NULL THEN
      DECLARE
        v_edge_function_url TEXT;
        v_release_response JSONB;
      BEGIN
        v_edge_function_url := COALESCE(
          current_setting('app.settings.edge_function_url', true),
          'https://theramate.co.uk/functions/v1'
        );
        
        -- Call release-same-day-payment edge function
        SELECT content INTO v_release_response
        FROM net.http_post(
          url := v_edge_function_url || '/stripe-payment',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || COALESCE(
              current_setting('app.settings.service_role_key', true),
              current_setting('app.settings.anon_key', true)
            )
          ),
          body := jsonb_build_object(
            'action', 'release-same-day-payment',
            'session_id', v_session.id,
            'payment_intent_id', v_session.stripe_payment_intent_id
          )
        );
      EXCEPTION WHEN OTHERS THEN
        -- Log error but continue
        RAISE WARNING 'Failed to release payment authorization for expired booking %: %', v_session.id, SQLERRM;
      END;
    END IF;

    -- Update status to expired
    UPDATE public.client_sessions
    SET 
      status = 'expired',
      payment_status = 'released',
      requires_approval = false,
      updated_at = NOW()
    WHERE id = v_session.id;

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

COMMENT ON FUNCTION public.expire_pending_same_day_bookings() IS 'Expires pending same-day bookings that have passed their approval deadline. Should be run periodically (e.g., every 15 minutes).';

-- 10. Create helper function to get pending same-day bookings for a practitioner
CREATE OR REPLACE FUNCTION public.get_pending_same_day_bookings(
  p_practitioner_id UUID
)
RETURNS TABLE(
  id UUID,
  client_id UUID,
  client_name TEXT,
  client_email TEXT,
  session_date DATE,
  start_time TIME,
  duration_minutes INTEGER,
  session_type TEXT,
  price DECIMAL(10,2),
  payment_status TEXT,
  stripe_payment_intent_id TEXT,
  approval_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  notes TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cs.id,
    cs.client_id,
    cs.client_name,
    cs.client_email,
    cs.session_date,
    cs.start_time,
    cs.duration_minutes,
    cs.session_type,
    cs.price,
    cs.payment_status,
    cs.stripe_payment_intent_id,
    cs.approval_expires_at,
    cs.created_at,
    cs.notes
  FROM public.client_sessions cs
  WHERE cs.therapist_id = p_practitioner_id
    AND cs.status = 'pending_approval'
    AND (cs.approval_expires_at IS NULL OR cs.approval_expires_at > NOW())
  ORDER BY cs.approval_expires_at ASC, cs.created_at DESC;
END;
$$;

COMMENT ON FUNCTION public.get_pending_same_day_bookings(UUID) IS 'Returns all pending same-day bookings requiring approval for a practitioner';

GRANT EXECUTE ON FUNCTION public.get_pending_same_day_bookings(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.expire_pending_same_day_bookings() TO authenticated;

-- 11. Schedule expiration function to run every 15 minutes
-- Note: This requires pg_cron extension to be enabled
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Unschedule if already exists
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire_same_day_bookings_job') THEN
      PERFORM cron.unschedule((SELECT jobid FROM cron.job WHERE jobname = 'expire_same_day_bookings_job' LIMIT 1));
    END IF;

    -- Schedule to run every 15 minutes
    PERFORM cron.schedule(
      'expire_same_day_bookings_job',
      '*/15 * * * *', -- Every 15 minutes
      'SELECT public.expire_pending_same_day_bookings();'
    );
  ELSE
    RAISE NOTICE 'pg_cron extension not enabled. Please schedule expire_pending_same_day_bookings() manually or enable pg_cron.';
  END IF;
END $$;
