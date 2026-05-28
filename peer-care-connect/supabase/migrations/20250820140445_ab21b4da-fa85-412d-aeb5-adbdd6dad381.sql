-- Create user role enum if not exists
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('sports_therapist', 'massage_therapist', 'osteopath', 'client');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create onboarding status enum
DO $$ BEGIN
    CREATE TYPE onboarding_status AS ENUM ('pending', 'in_progress', 'completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Update users table to match Supabase auth structure and add our fields
ALTER TABLE public.users 
DROP COLUMN IF EXISTS password_hash,
ADD COLUMN IF NOT EXISTS user_role user_role DEFAULT 'client',
ADD COLUMN IF NOT EXISTS onboarding_status onboarding_status DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS phone character varying,
ADD COLUMN IF NOT EXISTS profile_completed boolean DEFAULT false;

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users can view their own profile" 
ON public.users 
FOR SELECT 
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile" 
ON public.users 
FOR UPDATE 
USING (auth.uid() = id);

-- Create function to handle new user registration
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update therapist_profiles table to reference users
ALTER TABLE public.therapist_profiles 
ALTER COLUMN user_id SET NOT NULL;

-- Enable RLS on therapist_profiles
ALTER TABLE public.therapist_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for therapist_profiles
DROP POLICY IF EXISTS "Therapists can view their own profile" ON public.therapist_profiles;
CREATE POLICY "Therapists can view their own profile" 
ON public.therapist_profiles 
FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Therapists can update their own profile" ON public.therapist_profiles;
CREATE POLICY "Therapists can update their own profile" 
ON public.therapist_profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Therapists can insert their own profile" ON public.therapist_profiles;
CREATE POLICY "Therapists can insert their own profile" 
ON public.therapist_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Anyone can view therapist profiles (for searching)
DROP POLICY IF EXISTS "Anyone can view therapist profiles" ON public.therapist_profiles;
CREATE POLICY "Anyone can view therapist profiles" 
ON public.therapist_profiles 
FOR SELECT 
USING (is_active = true);