-- Add registration_number and professional_body to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS registration_number character varying,
ADD COLUMN IF NOT EXISTS professional_body character varying;