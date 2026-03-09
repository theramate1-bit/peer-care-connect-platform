-- Add service_type column to practitioner_products table
-- This allows products to be marked as clinic, mobile, or both (for hybrid therapists)

-- Create enum type if it doesn't exist
DO $$ BEGIN
    CREATE TYPE service_type_enum AS ENUM ('clinic', 'mobile', 'both');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add service_type column with default 'clinic' for backward compatibility
ALTER TABLE practitioner_products 
ADD COLUMN IF NOT EXISTS service_type service_type_enum DEFAULT 'clinic';

-- Update existing products based on practitioner's therapist_type
-- If therapist is mobile, set service_type to 'mobile'
-- If therapist is hybrid, set service_type to 'both' (they can change it later)
-- If therapist is clinic_based or null, keep as 'clinic'
UPDATE practitioner_products pp
SET service_type = CASE
    WHEN EXISTS (
        SELECT 1 FROM users u 
        WHERE u.id = pp.practitioner_id 
        AND u.therapist_type = 'mobile'
    ) THEN 'mobile'::service_type_enum
    WHEN EXISTS (
        SELECT 1 FROM users u 
        WHERE u.id = pp.practitioner_id 
        AND u.therapist_type = 'hybrid'
    ) THEN 'both'::service_type_enum
    ELSE 'clinic'::service_type_enum
END
WHERE service_type IS NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_practitioner_products_service_type 
ON practitioner_products(service_type);

-- Add comment for documentation
COMMENT ON COLUMN practitioner_products.service_type IS 'Service delivery type: clinic (at clinic), mobile (at client location), or both (available in both ways)';
