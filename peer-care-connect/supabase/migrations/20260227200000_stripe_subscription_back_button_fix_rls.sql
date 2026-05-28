-- Stripe as source of truth: only webhook (service_role) may insert subscription rows.
-- Public INSERT on subscriptions removed so clients cannot create fake subscription rows.
DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON public.subscriptions;

-- Helper for RLS: true if the user has an active or trialing subscription (for use in premium table policies).
CREATE OR REPLACE FUNCTION public.has_active_subscription(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = p_user_id
      AND s.status IN ('active', 'trialing')
      AND (s.current_period_end IS NULL OR s.current_period_end > now())
  );
$$;

COMMENT ON FUNCTION public.has_active_subscription(uuid) IS 'Use in RLS policies for premium tables: allow access only when user has active/trialing subscription.';

GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid) TO service_role;
