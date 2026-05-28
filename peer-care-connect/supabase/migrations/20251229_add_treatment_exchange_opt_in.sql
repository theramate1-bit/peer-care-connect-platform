-- Add treatment_exchange_opt_in column to users table
-- This allows practitioners to opt-in or opt-out of the peer treatment exchange program

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS treatment_exchange_opt_in BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN users.treatment_exchange_opt_in IS 'Whether the practitioner has opted in to the peer treatment exchange program. Default is false - practitioners must explicitly opt-in.';

-- Create index for faster filtering when querying opted-in practitioners
CREATE INDEX IF NOT EXISTS idx_users_treatment_exchange_opt_in 
ON users(treatment_exchange_opt_in) 
WHERE treatment_exchange_opt_in = true;

-- Note: Existing practitioners will be opted-out by default (false)
-- They will need to manually opt-in to participate in treatment exchange
