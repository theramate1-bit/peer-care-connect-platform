-- Enable RLS on all tables that don't have it
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpd_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpd_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peer_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies for each table
-- Activities - users can only see their own activities
CREATE POLICY "Users can view their own activities" ON public.activities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own activities" ON public.activities FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Business stats - users can only see their own stats  
CREATE POLICY "Users can view their own business stats" ON public.business_stats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own business stats" ON public.business_stats FOR ALL USING (auth.uid() = user_id);

-- Client sessions - therapists can see their own sessions
CREATE POLICY "Therapists can view their own client sessions" ON public.client_sessions FOR SELECT USING (auth.uid() = therapist_id);
CREATE POLICY "Therapists can manage their own client sessions" ON public.client_sessions FOR ALL USING (auth.uid() = therapist_id);

-- CPD registrations - users can see their own registrations
CREATE POLICY "Users can view their own CPD registrations" ON public.cpd_registrations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own CPD registrations" ON public.cpd_registrations FOR ALL USING (auth.uid() = user_id);

-- CPD sessions - anyone can view (public sessions), but restrict creation
CREATE POLICY "Anyone can view CPD sessions" ON public.cpd_sessions FOR SELECT USING (true);

-- Forum posts - anyone can view, users can create their own
CREATE POLICY "Anyone can view forum posts" ON public.forum_posts FOR SELECT USING (true);
CREATE POLICY "Users can create their own forum posts" ON public.forum_posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can update their own forum posts" ON public.forum_posts FOR UPDATE USING (auth.uid() = author_id);

-- Forum replies - anyone can view, users can create their own
CREATE POLICY "Anyone can view forum replies" ON public.forum_replies FOR SELECT USING (true);
CREATE POLICY "Users can create their own forum replies" ON public.forum_replies FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can update their own forum replies" ON public.forum_replies FOR UPDATE USING (auth.uid() = author_id);

-- Notifications - users can only see their own
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- Peer sessions - users can see sessions they're involved in
CREATE POLICY "Users can view their peer sessions" ON public.peer_sessions FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = provider_id);
CREATE POLICY "Users can create peer sessions as requester" ON public.peer_sessions FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Users can update peer sessions they're involved in" ON public.peer_sessions FOR UPDATE USING (auth.uid() = requester_id OR auth.uid() = provider_id);

-- User presence - users can see all presence, but only update their own
CREATE POLICY "Users can view all user presence" ON public.user_presence FOR SELECT USING (true);
CREATE POLICY "Users can update their own presence" ON public.user_presence FOR ALL USING (auth.uid() = user_id);

-- Fix function search paths
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, first_name, last_name, user_role, onboarding_status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'user_role')::user_role, 'client'),
    'pending'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;