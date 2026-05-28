-- Fix client_favorites table foreign key relationships

-- Drop existing foreign keys if they exist
ALTER TABLE IF EXISTS public.client_favorites 
  DROP CONSTRAINT IF EXISTS client_favorites_therapist_id_fkey,
  DROP CONSTRAINT IF EXISTS client_favorites_client_id_fkey,
  DROP CONSTRAINT IF EXISTS client_favorites_practitioner_id_fkey;

-- Ensure the table exists with correct structure
CREATE TABLE IF NOT EXISTS public.client_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  therapist_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(client_id, therapist_id)
);

-- Add foreign key constraints with explicit names
ALTER TABLE public.client_favorites
  ADD CONSTRAINT client_favorites_client_id_fkey 
    FOREIGN KEY (client_id) 
    REFERENCES auth.users(id) 
    ON DELETE CASCADE;

ALTER TABLE public.client_favorites
  ADD CONSTRAINT client_favorites_therapist_id_fkey 
    FOREIGN KEY (therapist_id) 
    REFERENCES auth.users(id) 
    ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_client_favorites_client_id ON public.client_favorites(client_id);
CREATE INDEX IF NOT EXISTS idx_client_favorites_therapist_id ON public.client_favorites(therapist_id);

-- Enable RLS
ALTER TABLE public.client_favorites ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own favorites" ON public.client_favorites;
CREATE POLICY "Users can view their own favorites" 
  ON public.client_favorites 
  FOR SELECT 
  USING (auth.uid() = client_id);

DROP POLICY IF EXISTS "Users can add their own favorites" ON public.client_favorites;
CREATE POLICY "Users can add their own favorites" 
  ON public.client_favorites 
  FOR INSERT 
  WITH CHECK (auth.uid() = client_id);

DROP POLICY IF EXISTS "Users can remove their own favorites" ON public.client_favorites;
CREATE POLICY "Users can remove their own favorites" 
  ON public.client_favorites 
  FOR DELETE 
  USING (auth.uid() = client_id);

-- Grant permissions
GRANT SELECT, INSERT, DELETE ON public.client_favorites TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.client_favorites TO service_role;

