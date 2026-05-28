-- Specializations table
CREATE TABLE IF NOT EXISTS public.specializations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  category VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Practitioner specializations junction table
CREATE TABLE IF NOT EXISTS public.practitioner_specializations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  practitioner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  specialization_id UUID NOT NULL REFERENCES public.specializations(id) ON DELETE CASCADE,
  years_experience INTEGER,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(practitioner_id, specialization_id)
);

-- Qualifications table
CREATE TABLE IF NOT EXISTS public.qualifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  practitioner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  institution VARCHAR(255),
  year_obtained INTEGER,
  certificate_url TEXT,
  verified BOOLEAN DEFAULT false,
  verification_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default specializations
INSERT INTO public.specializations (name, category, description) VALUES
  ('Sports Injury', 'sports_therapist', 'Treatment and rehabilitation of sports-related injuries'),
  ('Rehabilitation', 'sports_therapist', 'Physical rehabilitation and recovery programs'),
  ('Strength Training', 'sports_therapist', 'Athletic performance and strength development'),
  ('Injury Prevention', 'sports_therapist', 'Preventive strategies and conditioning'),
  ('Sports Massage', 'massage_therapist', 'Massage techniques for athletes and active individuals'),
  ('Massage Therapy', 'massage_therapist', 'General therapeutic massage'),
  ('Deep Tissue Massage', 'massage_therapist', 'Deep tissue manipulation techniques'),
  ('Osteopathy', 'osteopath', 'Holistic manual therapy and diagnosis'),
  ('Manual Therapy', 'osteopath', 'Hands-on manipulation techniques'),
  ('Cranial Osteopathy', 'osteopath', 'Gentle cranial manipulation')
ON CONFLICT (name) DO NOTHING;

-- Add indexes
CREATE INDEX idx_practitioner_specializations_practitioner ON public.practitioner_specializations(practitioner_id);
CREATE INDEX idx_qualifications_practitioner ON public.qualifications(practitioner_id);
CREATE INDEX idx_specializations_category ON public.specializations(category);

-- Enable RLS
ALTER TABLE public.specializations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practitioner_specializations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Specializations are viewable by everyone" ON public.specializations FOR SELECT USING (true);

CREATE POLICY "Users can view their own practitioner specializations" ON public.practitioner_specializations 
  FOR SELECT USING (auth.uid() = practitioner_id);

CREATE POLICY "Users can manage their own practitioner specializations" ON public.practitioner_specializations 
  FOR ALL USING (auth.uid() = practitioner_id);

CREATE POLICY "Users can view their own qualifications" ON public.qualifications 
  FOR SELECT USING (auth.uid() = practitioner_id);

CREATE POLICY "Users can manage their own qualifications" ON public.qualifications 
  FOR ALL USING (auth.uid() = practitioner_id);

