-- Update patient booking credit earning to 1 credit per booking
-- Changes from price-based calculation to fixed 1 credit per completed patient booking

-- Update award_credits_for_completed_session trigger function
CREATE OR REPLACE FUNCTION public.award_credits_for_completed_session()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_credit_earned INTEGER;
    v_session_price DECIMAL;
    v_duration_minutes INTEGER;
    v_session_type TEXT;
    v_metadata JSONB;
BEGIN
    -- Only process when status changes to 'completed' and payment is completed
    IF NEW.status = 'completed' AND NEW.payment_status = 'completed' AND 
       (OLD.status != 'completed' OR OLD.payment_status != 'completed') THEN
        
        -- Get session details
        v_session_type := NEW.session_type;
        v_duration_minutes := NEW.duration_minutes;
        v_session_price := COALESCE(NEW.price, 0);
        
        -- Skip if this is a peer booking (already handled by peer booking system)
        IF NEW.is_peer_booking = true THEN
            RETURN NEW;
        END IF;
        
        -- Skip if therapist doesn't exist in users table
        IF NOT EXISTS (SELECT 1 FROM users WHERE id = NEW.therapist_id) THEN
            RETURN NEW;
        END IF;
        
        -- Skip if session has no price (free sessions don't earn credits)
        IF v_session_price <= 0 THEN
            RETURN NEW;
        END IF;
        
        -- NEW SYSTEM: 1 credit per patient booking (regardless of price/duration)
        v_credit_earned := 1;
        
        -- Build metadata JSON
        v_metadata := jsonb_build_object(
            'type', 'client_session',
            'session_type', v_session_type,
            'duration', v_duration_minutes,
            'session_price', v_session_price,
            'calculation_method', 'fixed_per_booking'
        );
        
        -- Award credits to the practitioner
        PERFORM update_credit_balance(
            NEW.therapist_id,
            v_credit_earned,
            'session_earning',
            'Completed ' || v_session_type || ' session - 1 credit per patient booking',
            NEW.id,
            v_metadata
        );
        
        -- Update the session with credit information
        UPDATE client_sessions 
        SET credit_earned = v_credit_earned,
            updated_at = NOW()
        WHERE id = NEW.id;
        
    END IF;
    
    RETURN NEW;
END;
$$;

-- Add comment explaining the change
COMMENT ON FUNCTION public.award_credits_for_completed_session() IS 
'Trigger function that awards 1 credit per completed patient booking to practitioners. Changed from price-based calculation to fixed 1 credit per booking.';

-- Note: calculate_dynamic_credits() function is kept for backward compatibility
-- but is no longer used for patient booking credits. It may be used elsewhere.
COMMENT ON FUNCTION public.calculate_dynamic_credits(numeric, integer, text) IS 
'DEPRECATED for patient bookings: Now using fixed 1 credit per booking. Kept for backward compatibility and potential other uses.';


