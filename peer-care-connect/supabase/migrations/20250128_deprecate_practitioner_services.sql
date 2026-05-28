-- Deprecate practitioner_services table
-- This table is being replaced by practitioner_products which integrates with Stripe Connect

-- Add comment to table
COMMENT ON TABLE practitioner_services IS 'DEPRECATED - Use practitioner_products instead. This table is maintained for backward compatibility only.';

-- Make the table read-only by removing insert/update policies (keeping existing data accessible)
-- First, let's get all existing policies
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  -- Drop all policies that allow INSERT
  FOR policy_record IN
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'practitioner_services' 
    AND policyname LIKE '%INSERT%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON practitioner_services', policy_record.policyname);
  END LOOP;
  
  -- Drop all policies that allow UPDATE
  FOR policy_record IN
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'practitioner_services' 
    AND policyname LIKE '%UPDATE%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON practitioner_services', policy_record.policyname);
  END LOOP;
END $$;

-- Add a trigger to prevent new inserts and updates
CREATE OR REPLACE FUNCTION prevent_practitioner_services_modifications()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'practitioner_services table is deprecated. Please use practitioner_products instead.';
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to prevent INSERT and UPDATE
DROP TRIGGER IF EXISTS block_practitioner_services_insert ON practitioner_services;
CREATE TRIGGER block_practitioner_services_insert
  BEFORE INSERT ON practitioner_services
  FOR EACH ROW
  EXECUTE FUNCTION prevent_practitioner_services_modifications();

DROP TRIGGER IF EXISTS block_practitioner_services_update ON practitioner_services;
CREATE TRIGGER block_practitioner_services_update
  BEFORE UPDATE ON practitioner_services
  FOR EACH ROW
  EXECUTE FUNCTION prevent_practitioner_services_modifications();

-- Note: We're NOT removing SELECT policies or the DELETE trigger, as existing data should remain readable
-- and deletable for migration purposes

COMMENT ON FUNCTION prevent_practitioner_services_modifications() IS 'Prevents INSERT and UPDATE on deprecated practitioner_services table';

