-- Supplement for treatment_exchange_opt_in (index + comment).
-- Canonical column add: 20251229_add_treatment_exchange_opt_in.sql
-- Legacy peer-care-connect copy had index/comment; merged here for idempotent apply.

COMMENT ON COLUMN public.users.treatment_exchange_opt_in IS
  'Whether the practitioner has opted in to the peer treatment exchange program. Default false — explicit opt-in required.';

CREATE INDEX IF NOT EXISTS idx_users_treatment_exchange_opt_in
  ON public.users (treatment_exchange_opt_in)
  WHERE treatment_exchange_opt_in = true;
