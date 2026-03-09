-- KAN-69: Monthly earnings goal for practitioners
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS monthly_earnings_goal numeric DEFAULT NULL;

COMMENT ON COLUMN public.users.monthly_earnings_goal IS 'Practitioner monthly earnings goal in GBP (e.g. 2000 for £2,000). Used for dashboard progress (KAN-69).';
