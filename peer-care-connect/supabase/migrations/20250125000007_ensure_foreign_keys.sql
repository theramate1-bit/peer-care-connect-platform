-- Ensure proper foreign key relationships exist
-- This migration verifies and creates missing foreign key constraints

-- Check if client_sessions_therapist_id_fkey exists, if not create it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'client_sessions_therapist_id_fkey'
        AND table_name = 'client_sessions'
    ) THEN
        ALTER TABLE public.client_sessions 
        ADD CONSTRAINT client_sessions_therapist_id_fkey 
        FOREIGN KEY (therapist_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Check if client_sessions_client_id_fkey exists, if not create it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'client_sessions_client_id_fkey'
        AND table_name = 'client_sessions'
    ) THEN
        ALTER TABLE public.client_sessions 
        ADD CONSTRAINT client_sessions_client_id_fkey 
        FOREIGN KEY (client_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Check if client_favorites_therapist_id_fkey exists, if not create it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'client_favorites_therapist_id_fkey'
        AND table_name = 'client_favorites'
    ) THEN
        ALTER TABLE public.client_favorites 
        ADD CONSTRAINT client_favorites_therapist_id_fkey 
        FOREIGN KEY (therapist_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Check if client_favorites_client_id_fkey exists, if not create it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'client_favorites_client_id_fkey'
        AND table_name = 'client_favorites'
    ) THEN
        ALTER TABLE public.client_favorites 
        ADD CONSTRAINT client_favorites_client_id_fkey 
        FOREIGN KEY (client_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Check if credits_user_id_fkey exists, if not create it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'credits_user_id_fkey'
        AND table_name = 'credits'
    ) THEN
        ALTER TABLE public.credits 
        ADD CONSTRAINT credits_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Check if notifications_user_id_fkey exists, if not create it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'notifications_user_id_fkey'
        AND table_name = 'notifications'
    ) THEN
        ALTER TABLE public.notifications 
        ADD CONSTRAINT notifications_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;
