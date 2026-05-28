-- Update monthly credit allocations
-- Practitioner: 60 → 30 credits
-- Pro: 120 → 60 credits

-- Update existing active subscriptions
UPDATE public.subscriptions 
SET monthly_credits = CASE 
  WHEN plan = 'practitioner' THEN 30  -- Changed from 60
  WHEN plan = 'pro' THEN 60            -- Changed from 120
  ELSE monthly_credits
END
WHERE status IN ('active', 'trialing')
AND plan IN ('practitioner', 'pro');

-- Update comment
COMMENT ON COLUMN public.subscriptions.monthly_credits IS 'Number of credits allocated monthly: 30 for practitioner (£30), 60 for pro (£50)';

