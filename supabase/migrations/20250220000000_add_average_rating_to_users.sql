-- Add average_rating column to users table
-- This stores the calculated average star rating (0-5) for treatment exchange matching

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0.00 CHECK (average_rating >= 0 AND average_rating <= 5);

-- Add total_reviews column for tracking
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0 CHECK (total_reviews >= 0);

-- Add comment to clarify usage
COMMENT ON COLUMN public.users.average_rating IS 'Average star rating (0-5). New practitioners start at 0 until first client rating. Used for treatment exchange tier matching: 0-1 stars, 2-3 stars, 4-5 stars.';

COMMENT ON COLUMN public.users.total_reviews IS 'Total number of reviews received from clients. Used for calculating average_rating.';

-- Update existing practitioners without ratings to have 0
UPDATE public.users 
SET average_rating = 0.00, total_reviews = 0
WHERE user_role IN ('sports_therapist', 'massage_therapist', 'osteopath')
  AND (average_rating IS NULL OR total_reviews IS NULL);

