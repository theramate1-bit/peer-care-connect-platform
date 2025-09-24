-- Create user_profiles table
-- This migration creates the user_profiles table that the application expects

-- Create the user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  user_role public.user_role DEFAULT 'client'::public.user_role NOT NULL,
  onboarding_status public.onboarding_status DEFAULT 'pending'::public.onboarding_status NOT NULL,
  profile_completed BOOLEAN DEFAULT FALSE NOT NULL,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to view their own profile
CREATE POLICY "Authenticated users can view their own user_profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

-- Policy for authenticated users to insert their own profile
CREATE POLICY "Authenticated users can insert their own user_profile" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Policy for authenticated users to update their own profile
CREATE POLICY "Authenticated users can update their own user_profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Policy for authenticated users to view other profiles (for marketplace, etc.)
CREATE POLICY "Authenticated users can view other profiles" ON public.user_profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- Create a trigger to automatically create a user_profile entry on new auth.users registration
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, first_name, last_name, user_role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    COALESCE((NEW.raw_user_meta_data->>'user_role')::public.user_role, 'client')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the updated_at trigger
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_user_profiles_updated_at();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.user_profiles TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_role ON public.user_profiles(user_role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_onboarding_status ON public.user_profiles(onboarding_status);

-- Add comments for documentation
COMMENT ON TABLE public.user_profiles IS 'User profiles table with RLS policies for secure access';
COMMENT ON COLUMN public.user_profiles.id IS 'Primary key, matches auth.users.id';
COMMENT ON COLUMN public.user_profiles.email IS 'User email address';
COMMENT ON COLUMN public.user_profiles.first_name IS 'User first name';
COMMENT ON COLUMN public.user_profiles.last_name IS 'User last name';
COMMENT ON COLUMN public.user_profiles.user_role IS 'User role: client, sports_therapist, massage_therapist, osteopath, admin';
COMMENT ON COLUMN public.user_profiles.onboarding_status IS 'Onboarding status: pending, in_progress, completed';
COMMENT ON COLUMN public.user_profiles.profile_completed IS 'Whether the user profile is fully completed';
COMMENT ON COLUMN public.user_profiles.created_at IS 'When the profile was created';
COMMENT ON COLUMN public.user_profiles.updated_at IS 'When the profile was last updated';
