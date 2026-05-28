-- Migration: Fix slot_holds RLS function permissions
-- Created: 2025-12-23
-- Description: Update can_create_slot_hold() function with explicit search_path and proper permissions

-- Fix can_create_slot_hold() function to work properly in RLS context
-- The function needs explicit search_path and proper permissions

CREATE OR REPLACE FUNCTION can_create_slot_hold(practitioner_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the practitioner exists and is valid
  -- SECURITY DEFINER allows this function to bypass RLS on users table
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = practitioner_uuid
    AND user_role IN ('sports_therapist', 'massage_therapist', 'osteopath')
    AND is_active = true
  );
END;
$$;

-- Ensure the function owner has proper permissions
-- Grant execute to authenticated role (already done, but ensuring it's there)
GRANT EXECUTE ON FUNCTION can_create_slot_hold(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_create_slot_hold(UUID) TO anon;

