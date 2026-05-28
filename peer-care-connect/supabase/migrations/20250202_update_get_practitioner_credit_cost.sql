-- Update get_practitioner_credit_cost to use practitioner_products instead of hourly_rate
-- Credit cost is now: duration_minutes (1 credit per minute)

CREATE OR REPLACE FUNCTION get_practitioner_credit_cost(
    p_practitioner_id UUID,
    p_duration_minutes INTEGER,
    p_product_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_user_role TEXT;
    v_credit_cost INTEGER;
    v_product_duration INTEGER;
BEGIN
    -- Validate inputs
    IF p_practitioner_id IS NULL THEN
        RAISE EXCEPTION 'practitioner_id cannot be NULL';
    END IF;
    
    IF p_duration_minutes IS NULL OR p_duration_minutes <= 0 THEN
        RETURN GREATEST(p_duration_minutes, 1); -- Return duration as credits, minimum 1
    END IF;
    
    -- Get practitioner role
    SELECT user_role INTO v_user_role
    FROM public.users
    WHERE id = p_practitioner_id;
    
    -- Return default if practitioner not found
    IF v_user_role IS NULL THEN
        RETURN GREATEST(p_duration_minutes, 1); -- Return duration as credits
    END IF;
    
    -- Only calculate for practitioners (not clients)
    IF v_user_role NOT IN ('osteopath', 'sports_therapist', 'massage_therapist') THEN
        RETURN GREATEST(p_duration_minutes, 1); -- Return duration as credits
    END IF;
    
    -- If product_id is provided, look up that specific product
    IF p_product_id IS NOT NULL THEN
        SELECT duration_minutes INTO v_product_duration
        FROM public.practitioner_products
        WHERE id = p_product_id
          AND practitioner_id = p_practitioner_id
          AND is_active = true
        LIMIT 1;
        
        IF v_product_duration IS NOT NULL AND v_product_duration > 0 THEN
            RETURN v_product_duration; -- 1 credit per minute
        END IF;
    END IF;
    
    -- Try to find a product matching the duration
    SELECT duration_minutes INTO v_product_duration
    FROM public.practitioner_products
    WHERE practitioner_id = p_practitioner_id
      AND duration_minutes = p_duration_minutes
      AND is_active = true
    LIMIT 1;
    
    -- If product found, return its duration (which equals credits)
    IF v_product_duration IS NOT NULL AND v_product_duration > 0 THEN
        RETURN v_product_duration;
    END IF;
    
    -- Fallback: return duration_minutes as credits (1 credit per minute)
    RETURN GREATEST(p_duration_minutes, 1);
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_practitioner_credit_cost(UUID, INTEGER, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_practitioner_credit_cost(UUID, INTEGER, UUID) TO service_role;

-- Update comment
COMMENT ON FUNCTION get_practitioner_credit_cost IS 
'Calculates credit cost for a practitioner session based on practitioner_products duration_minutes. Returns duration_minutes as credits (1 credit per minute). If product_id is provided, uses that product. Otherwise, finds matching product by duration or falls back to duration_minutes.';

