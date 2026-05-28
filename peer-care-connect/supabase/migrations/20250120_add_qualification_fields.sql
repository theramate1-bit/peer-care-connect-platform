-- Add qualification fields to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS qualification_type TEXT,
ADD COLUMN IF NOT EXISTS qualification_file_url TEXT,
ADD COLUMN IF NOT EXISTS qualification_expiry DATE;

-- Add comments for documentation
COMMENT ON COLUMN public.users.qualification_type IS 'Type of qualification: ITMMIF, ATMMIF, equivalent, or none';
COMMENT ON COLUMN public.users.qualification_file_url IS 'URL to uploaded qualification certificate file';
COMMENT ON COLUMN public.users.qualification_expiry IS 'Expiry date of the qualification';

-- Create index for qualification queries
CREATE INDEX IF NOT EXISTS idx_users_qualification_type ON public.users(qualification_type);
CREATE INDEX IF NOT EXISTS idx_users_qualification_expiry ON public.users(qualification_expiry);
