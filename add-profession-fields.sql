-- Add missing profession-specific fields to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS membership_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS itmmif_status BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS atmmif_status BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pitch_side_trauma BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS goc_registration BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS cnhc_registration BOOLEAN DEFAULT FALSE;

-- Create simple ratings table
CREATE TABLE IF NOT EXISTS practitioner_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practitioner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    client_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES client_sessions(id) ON DELETE CASCADE,
    
    -- Rating details
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create simple CPD courses table
CREATE TABLE IF NOT EXISTS cpd_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Course details
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    duration_hours DECIMAL(5,2) NOT NULL,
    course_type VARCHAR(50) NOT NULL,
    
    -- Dates
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    
    -- Status
    status VARCHAR(20) DEFAULT 'published',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create simple CPD enrollments table
CREATE TABLE IF NOT EXISTS cpd_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES cpd_courses(id) ON DELETE CASCADE,
    practitioner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Enrollment details
    enrollment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'enrolled',
    
    -- Completion
    completion_date TIMESTAMP WITH TIME ZONE,
    certificate_issued BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_practitioner_ratings_practitioner ON practitioner_ratings(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_cpd_enrollments_practitioner ON cpd_enrollments(practitioner_id);

-- Enable RLS
ALTER TABLE practitioner_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE cpd_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE cpd_enrollments ENABLE ROW LEVEL SECURITY;

-- Simple RLS Policies
CREATE POLICY "Practitioners can view their own ratings" ON practitioner_ratings
    FOR SELECT USING (auth.uid() = practitioner_id);

CREATE POLICY "Anyone can view published CPD courses" ON cpd_courses
    FOR SELECT USING (status = 'published');

CREATE POLICY "Practitioners can view their own enrollments" ON cpd_enrollments
    FOR SELECT USING (auth.uid() = practitioner_id);
