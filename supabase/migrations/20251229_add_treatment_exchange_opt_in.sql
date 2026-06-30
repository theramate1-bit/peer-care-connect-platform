ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS treatment_exchange_opt_in BOOLEAN DEFAULT false;

