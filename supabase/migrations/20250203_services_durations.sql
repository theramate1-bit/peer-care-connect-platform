-- Add optional session_type to practitioner_products (acts as Service)
ALTER TABLE public.practitioner_products
ADD COLUMN IF NOT EXISTS session_type TEXT;

-- Create practitioner_product_durations for multi-duration pricing per Service
CREATE TABLE IF NOT EXISTS public.practitioner_product_durations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.practitioner_products(id) ON DELETE CASCADE,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  price_amount INTEGER NOT NULL CHECK (price_amount >= 0), -- minor units (pence)
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(service_id, duration_minutes)
);

-- Add service_id to client_sessions to capture what was booked
ALTER TABLE public.client_sessions
ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES public.practitioner_products(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_product_durations_service ON public.practitioner_product_durations(service_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_client_sessions_service ON public.client_sessions(service_id);

-- Triggers to maintain updated_at on durations
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_product_durations_updated_at ON public.practitioner_product_durations;
CREATE TRIGGER trg_product_durations_updated_at
BEFORE UPDATE ON public.practitioner_product_durations
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- RLS (align with existing patterns; allow practitioners to manage their own services)
ALTER TABLE public.practitioner_product_durations ENABLE ROW LEVEL SECURITY;

-- Practitioner can see/manage durations for their own services
CREATE POLICY IF NOT EXISTS "Practitioners view their durations"
ON public.practitioner_product_durations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.practitioner_products p
    WHERE p.id = practitioner_product_durations.service_id
    AND p.practitioner_id = auth.uid()
  )
);

CREATE POLICY IF NOT EXISTS "Practitioners manage their durations"
ON public.practitioner_product_durations FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.practitioner_products p
    WHERE p.id = practitioner_product_durations.service_id
    AND p.practitioner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.practitioner_products p
    WHERE p.id = practitioner_product_durations.service_id
    AND p.practitioner_id = auth.uid()
  )
);


