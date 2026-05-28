-- Add Row Level Security policies for data protection
-- This migration adds RLS policies to protect user data

-- Enable RLS on all user-related tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE therapist_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE soap_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Therapist profiles policies
CREATE POLICY "Therapists can view own profile" ON therapist_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Therapists can update own profile" ON therapist_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Therapists can insert own profile" ON therapist_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Client profiles policies
CREATE POLICY "Clients can view own profile" ON client_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Clients can update own profile" ON client_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Clients can insert own profile" ON client_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Subscribers policies
CREATE POLICY "Users can view own subscription" ON subscribers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription" ON subscribers
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscription" ON subscribers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Activities policies
CREATE POLICY "Users can view own activities" ON activities
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activities" ON activities
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own activities" ON activities
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own activities" ON activities
  FOR DELETE USING (auth.uid() = user_id);

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications" ON notifications
  FOR DELETE USING (auth.uid() = user_id);

-- Client favorites policies
CREATE POLICY "Clients can view own favorites" ON client_favorites
  FOR SELECT USING (auth.uid() = client_id);

CREATE POLICY "Clients can insert own favorites" ON client_favorites
  FOR INSERT WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can delete own favorites" ON client_favorites
  FOR DELETE USING (auth.uid() = client_id);

-- Client sessions policies
CREATE POLICY "Clients can view own sessions" ON client_sessions
  FOR SELECT USING (auth.uid() = client_id);

CREATE POLICY "Therapists can view their client sessions" ON client_sessions
  FOR SELECT USING (auth.uid() = therapist_id);

CREATE POLICY "Clients can insert own sessions" ON client_sessions
  FOR INSERT WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Therapists can update their sessions" ON client_sessions
  FOR UPDATE USING (auth.uid() = therapist_id);

-- Peer sessions policies
CREATE POLICY "Users can view sessions they participate in" ON peer_sessions
  FOR SELECT USING (auth.uid() = participant1_id OR auth.uid() = participant2_id);

CREATE POLICY "Users can insert sessions they participate in" ON peer_sessions
  FOR INSERT WITH CHECK (auth.uid() = participant1_id OR auth.uid() = participant2_id);

CREATE POLICY "Users can update sessions they participate in" ON peer_sessions
  FOR UPDATE USING (auth.uid() = participant1_id OR auth.uid() = participant2_id);

-- Reviews policies
CREATE POLICY "Users can view reviews for their sessions" ON reviews
  FOR SELECT USING (
    auth.uid() = reviewer_id OR 
    auth.uid() = reviewee_id OR
    EXISTS (
      SELECT 1 FROM client_sessions cs 
      WHERE cs.id = reviews.session_id 
      AND (cs.client_id = auth.uid() OR cs.therapist_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert reviews for their sessions" ON reviews
  FOR INSERT WITH CHECK (
    auth.uid() = reviewer_id AND
    EXISTS (
      SELECT 1 FROM client_sessions cs 
      WHERE cs.id = reviews.session_id 
      AND (cs.client_id = auth.uid() OR cs.therapist_id = auth.uid())
    )
  );

-- Session recordings policies
CREATE POLICY "Users can view recordings for their sessions" ON session_recordings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM client_sessions cs 
      WHERE cs.id = session_recordings.session_id 
      AND (cs.client_id = auth.uid() OR cs.therapist_id = auth.uid())
    )
  );

CREATE POLICY "Therapists can insert recordings for their sessions" ON session_recordings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM client_sessions cs 
      WHERE cs.id = session_recordings.session_id 
      AND cs.therapist_id = auth.uid()
    )
  );

-- SOAP templates policies
CREATE POLICY "Therapists can view own templates" ON soap_templates
  FOR SELECT USING (auth.uid() = therapist_id);

CREATE POLICY "Therapists can insert own templates" ON soap_templates
  FOR INSERT WITH CHECK (auth.uid() = therapist_id);

CREATE POLICY "Therapists can update own templates" ON soap_templates
  FOR UPDATE USING (auth.uid() = therapist_id);

CREATE POLICY "Therapists can delete own templates" ON soap_templates
  FOR DELETE USING (auth.uid() = therapist_id);

-- Forum posts policies
CREATE POLICY "Users can view all forum posts" ON forum_posts
  FOR SELECT USING (true);

CREATE POLICY "Users can insert forum posts" ON forum_posts
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own forum posts" ON forum_posts
  FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Users can delete own forum posts" ON forum_posts
  FOR DELETE USING (auth.uid() = author_id);

-- Forum replies policies
CREATE POLICY "Users can view all forum replies" ON forum_replies
  FOR SELECT USING (true);

CREATE POLICY "Users can insert forum replies" ON forum_replies
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own forum replies" ON forum_replies
  FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Users can delete own forum replies" ON forum_replies
  FOR DELETE USING (auth.uid() = author_id);

-- User presence policies
CREATE POLICY "Users can view own presence" ON user_presence
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own presence" ON user_presence
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own presence" ON user_presence
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Public read access for therapist profiles (for marketplace)
CREATE POLICY "Public can view therapist profiles" ON therapist_profiles
  FOR SELECT USING (is_public = true);

-- Public read access for reviews (for therapist profiles)
CREATE POLICY "Public can view therapist reviews" ON reviews
  FOR SELECT USING (reviewee_id IN (
    SELECT user_id FROM therapist_profiles WHERE is_public = true
  ));

-- Comments on the migration
COMMENT ON POLICY "Users can view own profile" ON users IS 'Users can only view their own profile data';
COMMENT ON POLICY "Public can view therapist profiles" ON therapist_profiles IS 'Public can view therapist profiles for marketplace browsing';
COMMENT ON POLICY "Users can view reviews for their sessions" ON reviews IS 'Users can view reviews for sessions they participated in';
