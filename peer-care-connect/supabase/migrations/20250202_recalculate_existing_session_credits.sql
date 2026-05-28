-- Recalculate existing peer booking session credits
-- Updates credit_cost to match practitioner_products.duration_minutes (1 credit per minute)
-- Also updates related credit_transactions and recalculates credit balances

DO $$
DECLARE
    v_session RECORD;
    v_product_duration INTEGER;
    v_old_credit_cost INTEGER;
    v_new_credit_cost INTEGER;
    v_difference INTEGER;
    v_client_id UUID;
    v_practitioner_id UUID;
    v_client_balance INTEGER;
    v_practitioner_balance INTEGER;
    v_client_new_balance INTEGER;
    v_practitioner_new_balance INTEGER;
    v_updated_count INTEGER := 0;
BEGIN
    -- Loop through all peer booking sessions
    FOR v_session IN 
        SELECT 
            id,
            therapist_id,
            client_id,
            credit_cost,
            duration_minutes,
            session_type,
            status
        FROM public.client_sessions
        WHERE is_peer_booking = true
          AND credit_cost IS NOT NULL
          AND credit_cost > 0
    LOOP
        v_old_credit_cost := v_session.credit_cost;
        v_client_id := v_session.client_id;
        v_practitioner_id := v_session.therapist_id;
        
        -- Try to find matching product by session_type (name) and therapist_id
        IF v_session.session_type IS NOT NULL THEN
            SELECT duration_minutes INTO v_product_duration
            FROM public.practitioner_products
            WHERE practitioner_id = v_session.therapist_id
              AND name = v_session.session_type
              AND is_active = true
            LIMIT 1;
        END IF;
        
        -- If no product found by name, try by duration
        IF v_product_duration IS NULL AND v_session.duration_minutes IS NOT NULL THEN
            SELECT duration_minutes INTO v_product_duration
            FROM public.practitioner_products
            WHERE practitioner_id = v_session.therapist_id
              AND duration_minutes = v_session.duration_minutes
              AND is_active = true
            LIMIT 1;
        END IF;
        
        -- If still no product found, use duration_minutes directly (1 credit per minute)
        IF v_product_duration IS NULL THEN
            v_new_credit_cost := COALESCE(v_session.duration_minutes, v_old_credit_cost);
        ELSE
            v_new_credit_cost := v_product_duration;
        END IF;
        
        -- Only update if credit cost changed
        IF v_new_credit_cost != v_old_credit_cost THEN
            v_difference := v_new_credit_cost - v_old_credit_cost;
            
            -- Update session credit_cost
            UPDATE public.client_sessions
            SET credit_cost = v_new_credit_cost
            WHERE id = v_session.id;
            
            -- Update credit_transactions for this session
            -- Client transactions (session_payment)
            UPDATE public.credit_transactions
            SET amount = v_new_credit_cost,
                balance_after = balance_before - v_new_credit_cost
            WHERE session_id = v_session.id
              AND user_id = v_client_id
              AND transaction_type = 'session_payment';
            
            -- Practitioner transactions (session_earning)
            UPDATE public.credit_transactions
            SET amount = v_new_credit_cost,
                balance_after = balance_before + v_new_credit_cost
            WHERE session_id = v_session.id
              AND user_id = v_practitioner_id
              AND transaction_type = 'session_earning';
            
            -- Recalculate credit balances if session is completed or scheduled (not cancelled)
            IF v_session.status IN ('scheduled', 'completed') THEN
                -- Update client balance
                SELECT balance INTO v_client_balance
                FROM public.credits
                WHERE user_id = v_client_id;
                
                IF v_client_balance IS NOT NULL THEN
                    v_client_new_balance := v_client_balance - v_difference;
                    
                    UPDATE public.credits
                    SET 
                        balance = v_client_new_balance,
                        current_balance = v_client_new_balance,
                        total_spent = GREATEST(COALESCE(total_spent, 0) - v_old_credit_cost + v_new_credit_cost, 0)
                    WHERE user_id = v_client_id;
                END IF;
                
                -- Update practitioner balance
                SELECT balance INTO v_practitioner_balance
                FROM public.credits
                WHERE user_id = v_practitioner_id;
                
                IF v_practitioner_balance IS NOT NULL THEN
                    v_practitioner_new_balance := v_practitioner_balance + v_difference;
                    
                    UPDATE public.credits
                    SET 
                        balance = v_practitioner_new_balance,
                        current_balance = v_practitioner_new_balance,
                        total_earned = GREATEST(COALESCE(total_earned, 0) - v_old_credit_cost + v_new_credit_cost, 0)
                    WHERE user_id = v_practitioner_id;
                END IF;
            END IF;
            
            v_updated_count := v_updated_count + 1;
            
            RAISE NOTICE 'Updated session %: credit_cost % -> % (difference: %)', 
                v_session.id, v_old_credit_cost, v_new_credit_cost, v_difference;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Recalculation complete. Updated % sessions.', v_updated_count;
END $$;

-- Add comment
COMMENT ON FUNCTION get_practitioner_credit_cost IS 
'Credit costs are now based on practitioner_products.duration_minutes (1 credit per minute). Existing sessions have been recalculated to match this new system.';

