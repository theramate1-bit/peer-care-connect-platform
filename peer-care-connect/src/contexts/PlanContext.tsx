import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type PlanId = 'practitioner' | 'pro' | 'clinic' | null;

interface PlanState {
  plan: PlanId;
  billingCycle: 'monthly' | 'yearly' | null;
  loading: boolean;
  isPro: boolean;
}

const PlanContext = React.createContext<PlanState>({ plan: null, billingCycle: null, loading: true, isPro: false });

export function PlanProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = React.useState<PlanState>({ plan: null, billingCycle: null, loading: true, isPro: false });

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user?.id) {
        setState({ plan: null, billingCycle: null, loading: false, isPro: false });
        return;
      }
      const { data, error } = await supabase
        .from('subscriptions')
        .select('plan, billing_cycle, status')
        .eq('user_id', user.id)
        .in('status', ['active', 'trialing'])
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setState({ plan: null, billingCycle: null, loading: false, isPro: false });
        return;
      }
      const plan = (data?.plan as PlanId) || null;
      const billingCycle = (data?.billing_cycle as 'monthly' | 'yearly' | null) || null;
      setState({ plan, billingCycle, loading: false, isPro: plan === 'pro' });
    }
    load();
    return () => { cancelled = true; };
  }, [user?.id]);

  return <PlanContext.Provider value={state}>{children}</PlanContext.Provider>;
}

export function usePlan() {
  return React.useContext(PlanContext);
}


