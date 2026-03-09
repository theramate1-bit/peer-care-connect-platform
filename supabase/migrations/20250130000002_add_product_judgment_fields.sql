-- Add product judgment fields to practitioner_products table
-- These fields help explain service recommendations, pricing decisions, and product choices

-- Add recommendation_reason field (why this service is recommended)
ALTER TABLE public.practitioner_products
ADD COLUMN IF NOT EXISTS recommendation_reason TEXT;

-- Add pricing_rationale field (explanation of pricing decisions)
ALTER TABLE public.practitioner_products
ADD COLUMN IF NOT EXISTS pricing_rationale TEXT;

-- Add popularity_score field (for ranking/sorting services)
ALTER TABLE public.practitioner_products
ADD COLUMN IF NOT EXISTS popularity_score INTEGER DEFAULT 0;

-- Add recommended_for field (array of use cases, e.g., ['first-time clients', 'sports injuries'])
ALTER TABLE public.practitioner_products
ADD COLUMN IF NOT EXISTS recommended_for TEXT[];

-- Create index on popularity_score for faster sorting
CREATE INDEX IF NOT EXISTS idx_practitioner_products_popularity 
ON public.practitioner_products(popularity_score DESC) 
WHERE is_active = true;

-- Add comments to explain each field
COMMENT ON COLUMN public.practitioner_products.recommendation_reason IS 'Explanation of why this service is recommended (e.g., "Most popular", "Best value", "Recommended for first-time clients")';
COMMENT ON COLUMN public.practitioner_products.pricing_rationale IS 'Practitioner''s explanation of pricing decisions and tradeoffs';
COMMENT ON COLUMN public.practitioner_products.popularity_score IS 'Numerical score for ranking services (higher = more popular/recommended)';
COMMENT ON COLUMN public.practitioner_products.recommended_for IS 'Array of use cases this service is recommended for (e.g., ["first-time clients", "sports injuries", "chronic pain"])';

-- Initialize popularity_score based on existing data (if any booking history exists)
-- This is a simple heuristic - can be enhanced later with actual booking data
UPDATE public.practitioner_products
SET popularity_score = CASE
  WHEN created_at > NOW() - INTERVAL '30 days' THEN 10  -- New services get base score
  WHEN created_at > NOW() - INTERVAL '90 days' THEN 20  -- Slightly older get more
  ELSE 30  -- Older services get highest base score
END
WHERE popularity_score = 0 AND is_active = true;

