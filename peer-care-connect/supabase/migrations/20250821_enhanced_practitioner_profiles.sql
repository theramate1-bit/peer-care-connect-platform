-- Enhanced Practitioner Profiles Migration
-- This migration extends the therapist_profiles table with comprehensive profile information

-- Create enum for verification status
DO $$ BEGIN
    CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected', 'under_review');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create enum for profile completion status
DO $$ BEGIN
    CREATE TYPE profile_completion_status AS ENUM ('incomplete', 'basic', 'complete', 'verified');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Extend therapist_profiles table with new fields
ALTER TABLE public.therapist_profiles 
ADD COLUMN IF NOT EXISTS profile_completion_status profile_completion_status DEFAULT 'incomplete',
ADD COLUMN IF NOT EXISTS verification_status verification_status DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS profile_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS response_time_hours INTEGER,
ADD COLUMN IF NOT EXISTS total_sessions INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS profile_views INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS languages TEXT[],
ADD COLUMN IF NOT EXISTS insurance_info JSONB,
ADD COLUMN IF NOT EXISTS emergency_contact JSONB,
ADD COLUMN IF NOT EXISTS profile_photo_url TEXT,
ADD COLUMN IF NOT EXISTS cover_photo_url TEXT,
ADD COLUMN IF NOT EXISTS portfolio_photos TEXT[],
ADD COLUMN IF NOT EXISTS video_introduction_url TEXT,
ADD COLUMN IF NOT EXISTS professional_statement TEXT,
ADD COLUMN IF NOT EXISTS treatment_philosophy TEXT,
ADD COLUMN IF NOT EXISTS continuing_education JSONB[],
ADD COLUMN IF NOT EXISTS awards_certifications JSONB[],
ADD COLUMN IF NOT EXISTS published_works JSONB[],
ADD COLUMN IF NOT EXISTS media_appearances JSONB[],
ADD COLUMN IF NOT EXISTS profile_verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS profile_verified_by UUID,
ADD COLUMN IF NOT EXISTS verification_notes TEXT;

-- Create service_packages table
CREATE TABLE IF NOT EXISTS public.service_packages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    therapist_id UUID NOT NULL REFERENCES public.therapist_profiles(user_id) ON DELETE CASCADE,
    package_name VARCHAR(255) NOT NULL,
    package_description TEXT,
    duration_minutes INTEGER NOT NULL,
    base_price DECIMAL(10,2) NOT NULL,
    discounted_price DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create package_services table for package inclusions
CREATE TABLE IF NOT EXISTS public.package_services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    package_id UUID NOT NULL REFERENCES public.service_packages(id) ON DELETE CASCADE,
    service_name VARCHAR(255) NOT NULL,
    service_description TEXT,
    included BOOLEAN DEFAULT true,
    additional_cost DECIMAL(10,2) DEFAULT 0.00
);

-- Create add_on_services table
CREATE TABLE IF NOT EXISTS public.add_on_services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    therapist_id UUID NOT NULL REFERENCES public.therapist_profiles(user_id) ON DELETE CASCADE,
    service_name VARCHAR(255) NOT NULL,
    service_description TEXT,
    duration_minutes INTEGER,
    price DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create availability_slots table
CREATE TABLE IF NOT EXISTS public.availability_slots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    therapist_id UUID NOT NULL REFERENCES public.therapist_profiles(user_id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create profile_verification_logs table
CREATE TABLE IF NOT EXISTS public.profile_verification_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    therapist_id UUID NOT NULL REFERENCES public.therapist_profiles(user_id) ON DELETE CASCADE,
    admin_id UUID REFERENCES auth.users(id),
    action verification_status NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_therapist_profiles_verification_status ON public.therapist_profiles(verification_status);
CREATE INDEX IF NOT EXISTS idx_therapist_profiles_completion_status ON public.therapist_profiles(profile_completion_status);
CREATE INDEX IF NOT EXISTS idx_therapist_profiles_rating ON public.therapist_profiles(average_rating);
CREATE INDEX IF NOT EXISTS idx_therapist_profiles_location ON public.therapist_profiles(location);
CREATE INDEX IF NOT EXISTS idx_service_packages_therapist ON public.service_packages(therapist_id);
CREATE INDEX IF NOT EXISTS idx_availability_slots_therapist ON public.availability_slots(therapist_id);

-- Enable RLS on new tables
ALTER TABLE public.service_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.add_on_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_verification_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for service_packages
CREATE POLICY "Therapists can manage their own service packages" ON public.service_packages
    FOR ALL USING (therapist_id = auth.uid());

CREATE POLICY "Anyone can view active service packages" ON public.service_packages
    FOR SELECT USING (is_active = true);

-- Create RLS policies for package_services
CREATE POLICY "Therapists can manage their package services" ON public.package_services
    FOR ALL USING (
        package_id IN (
            SELECT id FROM public.service_packages WHERE therapist_id = auth.uid()
        )
    );

-- Create RLS policies for add_on_services
CREATE POLICY "Therapists can manage their add-on services" ON public.add_on_services
    FOR ALL USING (therapist_id = auth.uid());

CREATE POLICY "Anyone can view active add-on services" ON public.add_on_services
    FOR SELECT USING (is_active = true);

-- Create RLS policies for availability_slots
CREATE POLICY "Therapists can manage their availability" ON public.availability_slots
    FOR ALL USING (therapist_id = auth.uid());

CREATE POLICY "Anyone can view therapist availability" ON public.availability_slots
    FOR SELECT USING (true);

-- Create RLS policies for profile_verification_logs
CREATE POLICY "Admins can view all verification logs" ON public.profile_verification_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND user_role IN ('admin', 'moderator')
        )
    );

CREATE POLICY "Therapists can view their own verification logs" ON public.profile_verification_logs
    FOR SELECT USING (therapist_id = auth.uid());

-- Create function to update profile completion status
CREATE OR REPLACE FUNCTION update_profile_completion_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate profile completion score
    NEW.profile_score = 0;
    
    -- Basic info (20 points)
    IF NEW.bio IS NOT NULL AND LENGTH(NEW.bio) > 50 THEN
        NEW.profile_score = NEW.profile_score + 20;
    END IF;
    
    -- Photo (15 points)
    IF NEW.profile_photo_url IS NOT NULL THEN
        NEW.profile_score = NEW.profile_score + 15;
    END IF;
    
    -- Specializations (15 points)
    IF NEW.specializations IS NOT NULL AND array_length(NEW.specializations, 1) > 0 THEN
        NEW.profile_score = NEW.profile_score + 15;
    END IF;
    
    -- Qualifications (15 points)
    IF NEW.qualifications IS NOT NULL AND array_length(NEW.qualifications, 1) > 0 THEN
        NEW.profile_score = NEW.profile_score + 15;
    END IF;
    
    -- Professional statement (10 points)
    IF NEW.professional_statement IS NOT NULL AND LENGTH(NEW.professional_statement) > 100 THEN
        NEW.profile_score = NEW.profile_score + 10;
    END IF;
    
    -- Service packages (10 points)
    IF EXISTS (SELECT 1 FROM public.service_packages WHERE therapist_id = NEW.user_id AND is_active = true) THEN
        NEW.profile_score = NEW.profile_score + 10;
    END IF;
    
    -- Availability (10 points)
    IF EXISTS (SELECT 1 FROM public.availability_slots WHERE therapist_id = NEW.user_id) THEN
        NEW.profile_score = NEW.profile_score + 10;
    END IF;
    
    -- Determine completion status based on score
    IF NEW.profile_score >= 80 THEN
        NEW.profile_completion_status = 'complete';
    ELSIF NEW.profile_score >= 50 THEN
        NEW.profile_completion_status = 'basic';
    ELSE
        NEW.profile_completion_status = 'incomplete';
    END IF;
    
    -- Update last_active timestamp
    NEW.last_active = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for profile completion status
DROP TRIGGER IF EXISTS trigger_update_profile_completion ON public.therapist_profiles;
CREATE TRIGGER trigger_update_profile_completion
    BEFORE INSERT OR UPDATE ON public.therapist_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_profile_completion_status();

-- Create function to log verification actions
CREATE OR REPLACE FUNCTION log_verification_action()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.verification_status IS DISTINCT FROM NEW.verification_status THEN
        INSERT INTO public.profile_verification_logs (
            therapist_id,
            admin_id,
            action,
            notes
        ) VALUES (
            NEW.user_id,
            auth.uid(),
            NEW.verification_status,
            NEW.verification_notes
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for verification logging
DROP TRIGGER IF EXISTS trigger_log_verification ON public.therapist_profiles;
CREATE TRIGGER trigger_log_verification
    AFTER UPDATE ON public.therapist_profiles
    FOR EACH ROW
    EXECUTE FUNCTION log_verification_action();
