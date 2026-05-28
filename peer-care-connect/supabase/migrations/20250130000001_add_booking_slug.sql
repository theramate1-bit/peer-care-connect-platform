-- Add booking_slug column to users table for custom booking links
-- Format: lowercase, alphanumeric + hyphens, 3-50 characters, unique

-- Add booking_slug column
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS booking_slug VARCHAR(50);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_booking_slug ON public.users(booking_slug) 
WHERE booking_slug IS NOT NULL;

-- Add unique constraint (only for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_booking_slug_unique ON public.users(booking_slug) 
WHERE booking_slug IS NOT NULL;

-- Function to generate slug from name
CREATE OR REPLACE FUNCTION public.generate_booking_slug(first_name TEXT, last_name TEXT)
RETURNS TEXT AS $$
DECLARE
  slug TEXT;
BEGIN
  -- Combine first and last name, convert to lowercase, replace spaces with hyphens
  slug := LOWER(TRIM(COALESCE(first_name, '') || '-' || COALESCE(last_name, '')));
  
  -- Remove special characters, keep only alphanumeric and hyphens
  slug := REGEXP_REPLACE(slug, '[^a-z0-9-]', '', 'g');
  
  -- Remove multiple consecutive hyphens
  slug := REGEXP_REPLACE(slug, '-+', '-', 'g');
  
  -- Remove leading/trailing hyphens
  slug := TRIM(BOTH '-' FROM slug);
  
  -- Ensure minimum length of 3
  IF LENGTH(slug) < 3 THEN
    slug := slug || '-booking';
  END IF;
  
  -- Truncate to 50 characters
  IF LENGTH(slug) > 50 THEN
    slug := LEFT(slug, 50);
  END IF;
  
  RETURN slug;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to ensure slug uniqueness by appending number if needed
CREATE OR REPLACE FUNCTION public.ensure_unique_booking_slug(proposed_slug TEXT, user_id UUID)
RETURNS TEXT AS $$
DECLARE
  final_slug TEXT;
  counter INTEGER := 0;
  exists_check BOOLEAN;
BEGIN
  final_slug := proposed_slug;
  
  LOOP
    -- Check if slug exists for another user
    SELECT EXISTS(
      SELECT 1 FROM public.users 
      WHERE booking_slug = final_slug 
      AND id != user_id
    ) INTO exists_check;
    
    EXIT WHEN NOT exists_check;
    
    -- Append counter to make unique
    counter := counter + 1;
    final_slug := proposed_slug || '-' || counter::TEXT;
    
    -- Prevent infinite loop (max 999)
    IF counter > 999 THEN
      final_slug := proposed_slug || '-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6);
      EXIT;
    END IF;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Auto-generate slugs for existing practitioners who don't have one
UPDATE public.users
SET booking_slug = public.ensure_unique_booking_slug(
  public.generate_booking_slug(first_name, last_name),
  id
)
WHERE booking_slug IS NULL
  AND user_role IN ('sports_therapist', 'massage_therapist', 'osteopath', 'practitioner')
  AND first_name IS NOT NULL
  AND last_name IS NOT NULL;

-- Add comment to column
COMMENT ON COLUMN public.users.booking_slug IS 'Custom URL slug for direct booking links (e.g., /book/johnny-osteo). Must be unique, lowercase, alphanumeric + hyphens, 3-50 characters.';

