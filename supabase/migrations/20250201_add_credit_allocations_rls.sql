-- Add Row Level Security policies to credit_allocations table
-- This is a HIGH PRIORITY security fix

-- Enable RLS on credit_allocations table
ALTER TABLE public.credit_allocations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own credit allocations
CREATE POLICY "Users can view their own credit allocations" 
ON public.credit_allocations
FOR SELECT 
USING (auth.uid() = user_id);

-- Policy: Service role can manage all credit allocations (for automated processes)
CREATE POLICY "Service role can manage credit allocations"
ON public.credit_allocations
FOR ALL
USING (auth.role() = 'service_role');

-- Add helpful comments
COMMENT ON POLICY "Users can view their own credit allocations" ON public.credit_allocations IS 
'Allows users to view their own credit allocation history';

COMMENT ON POLICY "Service role can manage credit allocations" ON public.credit_allocations IS 
'Allows service role (Edge Functions, webhooks) to create and manage credit allocations';

