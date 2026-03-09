-- Fix get_practitioner_credit_cost function to handle edge cases better
-- This addresses 400 errors when calling the function

CREATE OR REPLACE FUNCTION get_practitioner_credit_cost(
    p_practitioner_id UUID,
    p_duration_minutes INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_user_role TEXT;
    v_hourly_rate DECIMAL;
    v_credit_cost INTEGER;
BEGIN
    -- Validate inputs
    IF p_practitioner_id IS NULL THEN
        RAISE EXCEPTION 'practitioner_id cannot be NULL';
    END IF;
    
    IF p_duration_minutes IS NULL OR p_duration_minutes <= 0 THEN
        RETURN 10; -- Default minimum
    END IF;
    
    -- Get practitioner role and hourly rate
    SELECT user_role, hourly_rate INTO v_user_role, v_hourly_rate
    FROM public.users
    WHERE id = p_practitioner_id;
    
    -- Return default if practitioner not found
    IF v_user_role IS NULL THEN
        RETURN 10; -- Default minimum cost
    END IF;
    
    -- Only calculate for practitioners (not clients)
    IF v_user_role NOT IN ('osteopath', 'sports_therapist', 'massage_therapist') THEN
        RETURN 10; -- Default minimum cost
    END IF;
    
    -- Try to get credit cost from credit_rates table
    SELECT credit_cost INTO v_credit_cost
    FROM public.credit_rates
    WHERE service_type = v_user_role
      AND duration_minutes = p_duration_minutes
      AND is_active = true
    LIMIT 1;
    
    -- If not found in credit_rates, calculate from hourly rate
    IF v_credit_cost IS NULL THEN
        -- Ensure hourly_rate is not null
        IF v_hourly_rate IS NULL OR v_hourly_rate <= 0 THEN
            -- Default to 60 credits per hour if no hourly rate set
            v_hourly_rate := 60;
        END IF;
        
        -- Default: 1 credit per £1 of hourly rate
        -- For a 60-minute session: (hourly_rate / 10) * 1 = hourly_rate / 10
        -- For a 30-minute session: (hourly_rate / 10) * 0.5 = hourly_rate / 20
        v_credit_cost := GREATEST(
            ROUND((v_hourly_rate / 10.0) * (p_duration_minutes / 60.0)),
            1 -- Minimum 1 credit
        );
    END IF;
    
    -- Ensure we return at least 1 credit
    RETURN GREATEST(COALESCE(v_credit_cost, 10), 1);
END;
$$;

-- Grant necessary permissions (in case not already granted)
GRANT EXECUTE ON FUNCTION get_practitioner_credit_cost(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_practitioner_credit_cost(UUID, INTEGER) TO service_role;

-- Add helpful comments
COMMENT ON FUNCTION get_practitioner_credit_cost IS 'Calculates credit cost for a practitioner session based on service type and duration. Returns minimum of 1 credit if calculation fails or inputs are invalid.';

