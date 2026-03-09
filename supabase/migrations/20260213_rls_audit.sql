-- RLS Policy Audit and Fixes
-- Ensures all sensitive tables have proper Row-Level Security

-- Check and enable RLS on all user-related tables
DO $$
DECLARE
    table_record RECORD;
    tables_to_check TEXT[] := ARRAY[
        'users', 'therapist_profiles', 'client_profiles', 
        'sessions', 'bookings', 'payments', 'subscriptions',
        'messages', 'conversations', 'notifications',
        'reviews', 'treatment_plans', 'soap_notes',
        'clinical_files', 'session_recordings',
        'practitioner_specializations', 'qualifications',
        'client_sessions', 'peer_sessions',
        'activities', 'business_stats', 'cpd_registrations', 'cpd_sessions',
        'forum_posts', 'forum_replies', 'user_presence',
        'customers', 'products', 'prices',
        'treatment_exchange_requests', 'credit_allocations'
    ];
BEGIN
    FOREACH table_record.table_name IN ARRAY tables_to_check
    LOOP
        -- Enable RLS if table exists
        EXECUTE format('
            DO $inner$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_schema = ''public'' 
                    AND table_name = %L
                ) THEN
                    EXECUTE format(''ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY'');
                END IF;
            END $inner$;
        ', table_record.table_name, table_record.table_name);
    END LOOP;
END $$;

-- Ensure users table has proper RLS policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.users;

CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can view public profiles" ON public.users
  FOR SELECT USING (true); -- Allow viewing public profile info for marketplace

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Sessions: Practitioners can see their sessions, clients can see their sessions
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sessions') THEN
        DROP POLICY IF EXISTS "Practitioners can view own sessions" ON public.sessions;
        DROP POLICY IF EXISTS "Clients can view own sessions" ON public.sessions;
        DROP POLICY IF EXISTS "Practitioners can manage own sessions" ON public.sessions;
        
        CREATE POLICY "Practitioners can view own sessions" ON public.sessions
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM public.users 
              WHERE users.id = auth.uid() 
              AND users.user_role IN ('sports_therapist', 'massage_therapist', 'osteopath')
              AND sessions.practitioner_id = auth.uid()
            )
          );
        
        CREATE POLICY "Clients can view own sessions" ON public.sessions
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM public.users 
              WHERE users.id = auth.uid() 
              AND users.user_role = 'client'
              AND sessions.client_id = auth.uid()
            )
          );
        
        CREATE POLICY "Practitioners can manage own sessions" ON public.sessions
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM public.users 
              WHERE users.id = auth.uid() 
              AND users.user_role IN ('sports_therapist', 'massage_therapist', 'osteopath')
              AND sessions.practitioner_id = auth.uid()
            )
          );
    END IF;
END $$;

-- Messages: Users can only see messages in conversations they're part of
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messages') THEN
        DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;
        DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
        
        CREATE POLICY "Users can view own messages" ON public.messages
          FOR SELECT USING (
            sender_id = auth.uid() OR 
            EXISTS (
              SELECT 1 FROM public.conversations 
              WHERE conversations.id = messages.conversation_id 
              AND (conversations.user1_id = auth.uid() OR conversations.user2_id = auth.uid())
            )
          );
        
        CREATE POLICY "Users can send messages" ON public.messages
          FOR INSERT WITH CHECK (
            sender_id = auth.uid() AND
            EXISTS (
              SELECT 1 FROM public.conversations 
              WHERE conversations.id = messages.conversation_id 
              AND (conversations.user1_id = auth.uid() OR conversations.user2_id = auth.uid())
            )
          );
    END IF;
END $$;

-- Payments: Users can only see their own payments
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payments') THEN
        DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
        
        CREATE POLICY "Users can view own payments" ON public.payments
          FOR SELECT USING (
            user_id = auth.uid() OR
            EXISTS (
              SELECT 1 FROM public.sessions 
              WHERE sessions.id = payments.session_id 
              AND (sessions.practitioner_id = auth.uid() OR sessions.client_id = auth.uid())
            )
          );
    END IF;
END $$;

-- Clinical Files: Only practitioners and their clients can access
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'clinical_files') THEN
        DROP POLICY IF EXISTS "Practitioners can manage clinical files" ON public.clinical_files;
        DROP POLICY IF EXISTS "Clients can view own clinical files" ON public.clinical_files;
        
        CREATE POLICY "Practitioners can manage clinical files" ON public.clinical_files
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM public.users 
              WHERE users.id = auth.uid() 
              AND users.user_role IN ('sports_therapist', 'massage_therapist', 'osteopath')
              AND clinical_files.practitioner_id = auth.uid()
            )
          );
        
        CREATE POLICY "Clients can view own clinical files" ON public.clinical_files
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM public.users 
              WHERE users.id = auth.uid() 
              AND users.user_role = 'client'
              AND clinical_files.client_id = auth.uid()
            )
          );
    END IF;
END $$;

-- SOAP Notes: Only practitioners and their clients can access
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'soap_notes') THEN
        DROP POLICY IF EXISTS "Practitioners can manage SOAP notes" ON public.soap_notes;
        DROP POLICY IF EXISTS "Clients can view own SOAP notes" ON public.soap_notes;
        
        CREATE POLICY "Practitioners can manage SOAP notes" ON public.soap_notes
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM public.sessions s
              JOIN public.users u ON u.id = auth.uid()
              WHERE s.id = soap_notes.session_id
              AND u.user_role IN ('sports_therapist', 'massage_therapist', 'osteopath')
              AND s.practitioner_id = auth.uid()
            )
          );
        
        CREATE POLICY "Clients can view own SOAP notes" ON public.soap_notes
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM public.sessions s
              JOIN public.users u ON u.id = auth.uid()
              WHERE s.id = soap_notes.session_id
              AND u.user_role = 'client'
              AND s.client_id = auth.uid()
            )
          );
    END IF;
END $$;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT SELECT ON public.users TO anon; -- For marketplace public profiles
