-- Add professional_body_other field to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS professional_body_other TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.users.professional_body_other IS 'Custom professional body or insurance details when "other" is selected';

-- Create index for queries
CREATE INDEX IF NOT EXISTS idx_users_professional_body_other ON public.users(professional_body_other);
