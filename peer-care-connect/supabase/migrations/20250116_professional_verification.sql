-- Professional Verification System Migration
-- Creates tables for license verification and professional credentials

-- Professional licenses table
CREATE TABLE IF NOT EXISTS professional_licenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    license_type VARCHAR(50) NOT NULL, -- 'massage', 'sports_therapy', 'osteopathy', etc.
    license_number VARCHAR(100) NOT NULL,
    issuing_authority VARCHAR(200) NOT NULL,
    issue_date DATE NOT NULL,
    expiry_date DATE,
    license_document_url TEXT, -- URL to uploaded license document
    verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected', 'expired')),
    verified_by UUID REFERENCES auth.users(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Professional qualifications table
CREATE TABLE IF NOT EXISTS professional_qualifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    qualification_name VARCHAR(200) NOT NULL,
    institution VARCHAR(200) NOT NULL,
    completion_date DATE NOT NULL,
    certificate_url TEXT, -- URL to uploaded certificate
    verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
    verified_by UUID REFERENCES auth.users(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insurance policies table
CREATE TABLE IF NOT EXISTS insurance_policies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    insurance_provider VARCHAR(200) NOT NULL,
    policy_number VARCHAR(100) NOT NULL,
    coverage_amount DECIMAL(12,2),
    expiry_date DATE NOT NULL,
    policy_document_url TEXT, -- URL to uploaded policy document
    verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected', 'expired')),
    verified_by UUID REFERENCES auth.users(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Background checks table
CREATE TABLE IF NOT EXISTS background_checks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    check_type VARCHAR(50) NOT NULL, -- 'dbs', 'criminal', 'reference', etc.
    check_provider VARCHAR(200) NOT NULL,
    check_reference VARCHAR(100) NOT NULL,
    check_date DATE NOT NULL,
    expiry_date DATE,
    result VARCHAR(20) NOT NULL CHECK (result IN ('clear', 'consider', 'unclear')),
    document_url TEXT, -- URL to uploaded check document
    verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected', 'expired')),
    verified_by UUID REFERENCES auth.users(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Verification requirements table - defines what each role needs
CREATE TABLE IF NOT EXISTS verification_requirements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_role VARCHAR(50) NOT NULL,
    requirement_type VARCHAR(50) NOT NULL, -- 'license', 'qualification', 'insurance', 'background_check'
    requirement_name VARCHAR(200) NOT NULL,
    is_required BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default verification requirements
INSERT INTO verification_requirements (user_role, requirement_type, requirement_name, is_required) VALUES
('sports_therapist', 'license', 'Sports Therapy License', true),
('sports_therapist', 'insurance', 'Professional Indemnity Insurance', true),
('sports_therapist', 'background_check', 'DBS Check', true),
('massage_therapist', 'license', 'Massage Therapy License', true),
('massage_therapist', 'insurance', 'Professional Indemnity Insurance', true),
('massage_therapist', 'background_check', 'DBS Check', true),
('osteopath', 'license', 'Osteopathy License', true),
('osteopath', 'insurance', 'Professional Indemnity Insurance', true),
('osteopath', 'background_check', 'DBS Check', true);

-- Function to check if user meets verification requirements
CREATE OR REPLACE FUNCTION check_verification_status(p_user_id UUID)
RETURNS TABLE (
    user_role VARCHAR(50),
    is_fully_verified BOOLEAN,
    missing_requirements TEXT[],
    verification_score INTEGER
) AS $$
DECLARE
    v_user_role VARCHAR(50);
    v_requirements RECORD;
    v_missing TEXT[] := '{}';
    v_score INTEGER := 0;
    v_total_required INTEGER := 0;
    v_verified_count INTEGER := 0;
BEGIN
    -- Get user role
    SELECT user_role INTO v_user_role
    FROM user_profiles
    WHERE user_id = p_user_id;
    
    IF v_user_role IS NULL THEN
        RETURN;
    END IF;
    
    -- Check each requirement
    FOR v_requirements IN
        SELECT requirement_type, requirement_name, is_required
        FROM verification_requirements
        WHERE user_role = v_user_role AND is_required = true AND is_active = true
    LOOP
        v_total_required := v_total_required + 1;
        
        -- Check if requirement is met
        IF v_requirements.requirement_type = 'license' THEN
            IF EXISTS (
                SELECT 1 FROM professional_licenses
                WHERE user_id = p_user_id AND verification_status = 'approved'
            ) THEN
                v_verified_count := v_verified_count + 1;
            ELSE
                v_missing := array_append(v_missing, v_requirements.requirement_name);
            END IF;
        ELSIF v_requirements.requirement_type = 'insurance' THEN
            IF EXISTS (
                SELECT 1 FROM insurance_policies
                WHERE user_id = p_user_id AND verification_status = 'approved'
            ) THEN
                v_verified_count := v_verified_count + 1;
            ELSE
                v_missing := array_append(v_missing, v_requirements.requirement_name);
            END IF;
        ELSIF v_requirements.requirement_type = 'background_check' THEN
            IF EXISTS (
                SELECT 1 FROM background_checks
                WHERE user_id = p_user_id AND verification_status = 'approved'
            ) THEN
                v_verified_count := v_verified_count + 1;
            ELSE
                v_missing := array_append(v_missing, v_requirements.requirement_name);
            END IF;
        ELSIF v_requirements.requirement_type = 'qualification' THEN
            IF EXISTS (
                SELECT 1 FROM professional_qualifications
                WHERE user_id = p_user_id AND verification_status = 'approved'
            ) THEN
                v_verified_count := v_verified_count + 1;
            ELSE
                v_missing := array_append(v_missing, v_requirements.requirement_name);
            END IF;
        END IF;
    END LOOP;
    
    -- Calculate verification score
    IF v_total_required > 0 THEN
        v_score := (v_verified_count * 100) / v_total_required;
    END IF;
    
    RETURN QUERY SELECT
        v_user_role,
        (v_verified_count = v_total_required AND v_total_required > 0),
        v_missing,
        v_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get verification dashboard data
CREATE OR REPLACE FUNCTION get_verification_dashboard_data(
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0,
    p_status VARCHAR(20) DEFAULT NULL
)
RETURNS TABLE (
    user_id UUID,
    user_name TEXT,
    user_role VARCHAR(50),
    verification_status VARCHAR(20),
    verification_score INTEGER,
    pending_count INTEGER,
    approved_count INTEGER,
    rejected_count INTEGER,
    last_updated TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.user_id,
        CONCAT(up.first_name, ' ', up.last_name) as user_name,
        up.user_role,
        CASE 
            WHEN v.is_fully_verified THEN 'approved'
            WHEN array_length(v.missing_requirements, 1) > 0 THEN 'pending'
            ELSE 'not_started'
        END as verification_status,
        v.verification_score,
        COALESCE(pending.pending_count, 0) as pending_count,
        COALESCE(approved.approved_count, 0) as approved_count,
        COALESCE(rejected.rejected_count, 0) as rejected_count,
        GREATEST(
            COALESCE(lic.updated_at, '1900-01-01'::timestamp),
            COALESCE(qual.updated_at, '1900-01-01'::timestamp),
            COALESCE(ins.updated_at, '1900-01-01'::timestamp),
            COALESCE(bg.updated_at, '1900-01-01'::timestamp)
        ) as last_updated
    FROM user_profiles up
    LEFT JOIN LATERAL check_verification_status(up.user_id) v ON true
    LEFT JOIN (
        SELECT 
            user_id,
            COUNT(*) as pending_count
        FROM (
            SELECT user_id FROM professional_licenses WHERE verification_status = 'pending'
            UNION ALL
            SELECT user_id FROM professional_qualifications WHERE verification_status = 'pending'
            UNION ALL
            SELECT user_id FROM insurance_policies WHERE verification_status = 'pending'
            UNION ALL
            SELECT user_id FROM background_checks WHERE verification_status = 'pending'
        ) all_pending
        GROUP BY user_id
    ) pending ON up.user_id = pending.user_id
    LEFT JOIN (
        SELECT 
            user_id,
            COUNT(*) as approved_count
        FROM (
            SELECT user_id FROM professional_licenses WHERE verification_status = 'approved'
            UNION ALL
            SELECT user_id FROM professional_qualifications WHERE verification_status = 'approved'
            UNION ALL
            SELECT user_id FROM insurance_policies WHERE verification_status = 'approved'
            UNION ALL
            SELECT user_id FROM background_checks WHERE verification_status = 'approved'
        ) all_approved
        GROUP BY user_id
    ) approved ON up.user_id = approved.user_id
    LEFT JOIN (
        SELECT 
            user_id,
            COUNT(*) as rejected_count
        FROM (
            SELECT user_id FROM professional_licenses WHERE verification_status = 'rejected'
            UNION ALL
            SELECT user_id FROM professional_qualifications WHERE verification_status = 'rejected'
            UNION ALL
            SELECT user_id FROM insurance_policies WHERE verification_status = 'rejected'
            UNION ALL
            SELECT user_id FROM background_checks WHERE verification_status = 'rejected'
        ) all_rejected
        GROUP BY user_id
    ) rejected ON up.user_id = rejected.user_id
    LEFT JOIN (
        SELECT user_id, MAX(updated_at) as updated_at
        FROM professional_licenses
        GROUP BY user_id
    ) lic ON up.user_id = lic.user_id
    LEFT JOIN (
        SELECT user_id, MAX(updated_at) as updated_at
        FROM professional_qualifications
        GROUP BY user_id
    ) qual ON up.user_id = qual.user_id
    LEFT JOIN (
        SELECT user_id, MAX(updated_at) as updated_at
        FROM insurance_policies
        GROUP BY user_id
    ) ins ON up.user_id = ins.user_id
    LEFT JOIN (
        SELECT user_id, MAX(updated_at) as updated_at
        FROM background_checks
        GROUP BY user_id
    ) bg ON up.user_id = bg.user_id
    WHERE up.user_role IN ('sports_therapist', 'massage_therapist', 'osteopath')
    AND (p_status IS NULL OR 
         (p_status = 'approved' AND v.is_fully_verified) OR
         (p_status = 'pending' AND NOT v.is_fully_verified AND array_length(v.missing_requirements, 1) > 0) OR
         (p_status = 'not_started' AND array_length(v.missing_requirements, 1) IS NULL))
    ORDER BY last_updated DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_professional_licenses_user_id ON professional_licenses(user_id);
CREATE INDEX IF NOT EXISTS idx_professional_licenses_status ON professional_licenses(verification_status);
CREATE INDEX IF NOT EXISTS idx_professional_qualifications_user_id ON professional_qualifications(user_id);
CREATE INDEX IF NOT EXISTS idx_professional_qualifications_status ON professional_qualifications(verification_status);
CREATE INDEX IF NOT EXISTS idx_insurance_policies_user_id ON insurance_policies(user_id);
CREATE INDEX IF NOT EXISTS idx_insurance_policies_status ON insurance_policies(verification_status);
CREATE INDEX IF NOT EXISTS idx_background_checks_user_id ON background_checks(user_id);
CREATE INDEX IF NOT EXISTS idx_background_checks_status ON background_checks(verification_status);

-- RLS Policies
ALTER TABLE professional_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_qualifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE background_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_requirements ENABLE ROW LEVEL SECURITY;

-- Professional licenses policies
CREATE POLICY "Users can view their own licenses" ON professional_licenses
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own licenses" ON professional_licenses
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own licenses" ON professional_licenses
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all licenses" ON professional_licenses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() AND user_role = 'admin'
        )
    );

CREATE POLICY "Admins can update license verification" ON professional_licenses
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() AND user_role = 'admin'
        )
    );

-- Similar policies for other tables
CREATE POLICY "Users can view their own qualifications" ON professional_qualifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own qualifications" ON professional_qualifications
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all qualifications" ON professional_qualifications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() AND user_role = 'admin'
        )
    );

CREATE POLICY "Users can view their own insurance" ON insurance_policies
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own insurance" ON insurance_policies
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all insurance" ON insurance_policies
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() AND user_role = 'admin'
        )
    );

CREATE POLICY "Users can view their own background checks" ON background_checks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own background checks" ON background_checks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all background checks" ON background_checks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() AND user_role = 'admin'
        )
    );

-- Verification requirements policies (public read)
CREATE POLICY "Anyone can view verification requirements" ON verification_requirements
    FOR SELECT USING (is_active = true);

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON professional_licenses TO authenticated;
GRANT ALL ON professional_qualifications TO authenticated;
GRANT ALL ON insurance_policies TO authenticated;
GRANT ALL ON background_checks TO authenticated;
GRANT SELECT ON verification_requirements TO authenticated;
GRANT EXECUTE ON FUNCTION check_verification_status TO authenticated;
GRANT EXECUTE ON FUNCTION get_verification_dashboard_data TO authenticated;
