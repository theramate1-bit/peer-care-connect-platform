-- Create users view in public schema to reference auth.users
-- This allows queries to reference users without schema conflicts

CREATE OR REPLACE VIEW public.users AS
SELECT 
    id,
    email,
    created_at,
    updated_at,
    email_confirmed_at,
    phone,
    phone_confirmed_at,
    confirmed_at,
    last_sign_in_at,
    app_metadata,
    user_metadata,
    aud,
    role
FROM auth.users;

-- Grant permissions for the view
GRANT SELECT ON public.users TO authenticated;
GRANT SELECT ON public.users TO anon;

-- Create RLS policies for the view
ALTER VIEW public.users ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view their own data" 
ON public.users 
FOR SELECT 
USING (auth.uid() = id);
