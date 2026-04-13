-- Client saved therapists: favorites (client_id + therapist_id)
-- Idempotent: safe if table already exists with same shape.

CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT favorites_client_therapist_unique UNIQUE (client_id, therapist_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_client_id ON public.favorites (client_id);
CREATE INDEX IF NOT EXISTS idx_favorites_therapist_id ON public.favorites (therapist_id);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "favorites_select_own" ON public.favorites;
CREATE POLICY "favorites_select_own"
  ON public.favorites
  FOR SELECT
  TO authenticated
  USING (client_id = auth.uid());

DROP POLICY IF EXISTS "favorites_insert_own" ON public.favorites;
CREATE POLICY "favorites_insert_own"
  ON public.favorites
  FOR INSERT
  TO authenticated
  WITH CHECK (client_id = auth.uid());

DROP POLICY IF EXISTS "favorites_delete_own" ON public.favorites;
CREATE POLICY "favorites_delete_own"
  ON public.favorites
  FOR DELETE
  TO authenticated
  USING (client_id = auth.uid());

COMMENT ON TABLE public.favorites IS 'Client-saved practitioner profiles for quick booking (mobile Explore hearts).';
