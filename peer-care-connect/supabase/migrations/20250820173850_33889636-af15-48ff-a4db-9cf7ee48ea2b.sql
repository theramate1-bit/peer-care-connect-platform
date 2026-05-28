-- Create client profiles table
CREATE TABLE public.client_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  preferences JSONB DEFAULT '{}',
  medical_history TEXT,
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(50),
  preferred_communication VARCHAR(50) DEFAULT 'email',
  date_of_birth DATE,
  address TEXT,
  insurance_provider VARCHAR(255),
  insurance_policy_number VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for client profiles
CREATE POLICY "Clients can view their own profile" 
ON public.client_profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Clients can update their own profile" 
ON public.client_profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Clients can insert their own profile" 
ON public.client_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create reviews table
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  therapist_id UUID NOT NULL,
  session_id UUID REFERENCES public.client_sessions(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255),
  comment TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(client_id, session_id)
);

-- Enable RLS for reviews
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Create policies for reviews
CREATE POLICY "Anyone can view non-anonymous reviews" 
ON public.reviews 
FOR SELECT 
USING (NOT is_anonymous OR auth.uid() = client_id OR auth.uid() = therapist_id);

CREATE POLICY "Clients can create reviews" 
ON public.reviews 
FOR INSERT 
WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can update their own reviews" 
ON public.reviews 
FOR UPDATE 
USING (auth.uid() = client_id);

-- Create availability slots table
CREATE TABLE public.availability_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  therapist_id UUID NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for availability
ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;

-- Create policies for availability
CREATE POLICY "Anyone can view availability" 
ON public.availability_slots 
FOR SELECT 
USING (is_available = true);

CREATE POLICY "Therapists can manage their availability" 
ON public.availability_slots 
FOR ALL 
USING (auth.uid() = therapist_id);

-- Create favorites table
CREATE TABLE public.client_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  therapist_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(client_id, therapist_id)
);

-- Enable RLS for favorites
ALTER TABLE public.client_favorites ENABLE ROW LEVEL SECURITY;

-- Create policies for favorites
CREATE POLICY "Clients can view their own favorites" 
ON public.client_favorites 
FOR SELECT 
USING (auth.uid() = client_id);

CREATE POLICY "Clients can manage their own favorites" 
ON public.client_favorites 
FOR ALL 
USING (auth.uid() = client_id);

-- Add updated_at trigger for client_profiles
CREATE TRIGGER update_client_profiles_updated_at
BEFORE UPDATE ON public.client_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add updated_at trigger for reviews
CREATE TRIGGER update_reviews_updated_at
BEFORE UPDATE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add updated_at trigger for availability_slots
CREATE TRIGGER update_availability_slots_updated_at
BEFORE UPDATE ON public.availability_slots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_client_profiles_user_id ON public.client_profiles(user_id);
CREATE INDEX idx_reviews_therapist_id ON public.reviews(therapist_id);
CREATE INDEX idx_reviews_rating ON public.reviews(rating);
CREATE INDEX idx_availability_therapist_day ON public.availability_slots(therapist_id, day_of_week);
CREATE INDEX idx_favorites_client_therapist ON public.client_favorites(client_id, therapist_id);