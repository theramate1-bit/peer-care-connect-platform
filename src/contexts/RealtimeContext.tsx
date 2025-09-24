import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type Notification = any;
type ClientSession = any;
type ExchangeRequest = any;
type SlotHold = any;
type MutualExchangeSession = any;

interface RealtimeState {
  notifications: Notification[];
  sessions: ClientSession[];
  exchangeRequests: { sent: ExchangeRequest[]; received: ExchangeRequest[] };
  slotHolds: SlotHold[];
  mutualSessions: MutualExchangeSession[];
  creditBalance: number;
  creditTransactions: any[];
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
  subscriptionStatus?: string | null;
  verificationStatus?: string | null;
  onboardingProgress?: {
    step: number;
    completed: boolean;
    blockers: string[];
  };
}

const RealtimeContext = createContext<RealtimeState | null>(null);

export const useRealtime = () => {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error('useRealtime must be used within RealtimeProvider');
  return ctx;
};

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userProfile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [sessions, setSessions] = useState<ClientSession[]>([]);
  const [exchangeRequestsSent, setExchangeRequestsSent] = useState<ExchangeRequest[]>([]);
  const [exchangeRequestsReceived, setExchangeRequestsReceived] = useState<ExchangeRequest[]>([]);
  const [slotHolds, setSlotHolds] = useState<SlotHold[]>([]);
  const [mutualSessions, setMutualSessions] = useState<MutualExchangeSession[]>([]);
  const [creditBalance, setCreditBalance] = useState<number>(0);
  const [creditTransactions, setCreditTransactions] = useState<any[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [onboardingProgress, setOnboardingProgress] = useState<{ step: number; completed: boolean; blockers: string[] }>();

  const computeOnboarding = (userRow: any, subStatus: string | null) => {
    if (!userRow) return;
    const blockers: string[] = [];
    const isCompleted = userRow.profile_completed === true && userRow.onboarding_status === 'completed';
    const role = userProfile?.user_role;
    let step = 1;
    if (role === 'client') {
      // Minimal client steps: profile fields present
      if (userRow.first_name && userRow.last_name && userRow.phone) step = 2;
      if (isCompleted) step = 3;
    } else {
      // Practitioner: rough gating on key fields
      step = 1;
      if (userRow.bio && userRow.location) step = 2;
      if (userRow.experience_years && userRow.professional_body && userRow.registration_number) step = 3;
      if (userRow.hourly_rate) step = 4;
      if (subStatus && subStatus !== 'active' && subStatus !== 'trialing') blockers.push('subscription');
      if (userRow.verification_status && userRow.verification_status !== 'verified') blockers.push('verification');
      if (isCompleted) step = 6;
    }
    setOnboardingProgress({ step, completed: !!isCompleted, blockers });
  };

  // Helper: idempotent upsert with updated_at guard
  const upsertById = <T extends { id: string; updated_at?: string; created_at?: string }>(
    list: T[],
    row: T
  ): T[] => {
    const idx = list.findIndex((x) => x.id === row.id);
    if (idx === -1) return [row, ...list];
    const prev = list[idx];
    const prevTs = (prev.updated_at || prev.created_at) ? new Date((prev.updated_at || prev.created_at) as string).getTime() : 0;
    const nextTs = (row.updated_at || row.created_at) ? new Date((row.updated_at || row.created_at) as string).getTime() : Number.MAX_SAFE_INTEGER;
    if (nextTs >= prevTs) {
      const copy = list.slice();
      copy[idx] = row;
      return copy;
    }
    return list; // stale event
  };

  // Initial hydration
  useEffect(() => {
    if (!user) return;

    const hydrate = async () => {
      try {
        // Notifications
        const { data: notifs } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);
        setNotifications(notifs || []);

        // Sessions (practitioner vs client)
        if (userProfile?.user_role === 'client') {
          const { data: sess } = await supabase
            .from('client_sessions')
            .select('*')
            .eq('client_id', user.id)
            .order('created_at', { ascending: false })
            .limit(100);
          setSessions(sess || []);
        } else {
          const { data: sess } = await supabase
            .from('client_sessions')
            .select('*')
            .eq('therapist_id', user.id)
            .order('created_at', { ascending: false })
            .limit(100);
          setSessions(sess || []);
        }

        // Exchange requests (sent) - handle case where table doesn't exist
        const { data: sent, error: sentError } = await supabase
          .from('treatment_exchange_requests')
          .select('*')
          .eq('requester_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100);
        
        if (sentError) {
          console.log('Treatment exchange requests table not found or error:', sentError);
        }
        setExchangeRequestsSent(sent || []);

        // Exchange requests (received) - handle case where table doesn't exist
        const { data: received, error: receivedError } = await supabase
          .from('treatment_exchange_requests')
          .select('*')
          .eq('recipient_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100);
        
        if (receivedError) {
          console.log('Treatment exchange requests table not found or error:', receivedError);
        }
        setExchangeRequestsReceived(received || []);

        // Slot holds (practitioner side) - handle case where table doesn't exist
        const { data: holds, error: holdsError } = await supabase
          .from('slot_holds')
          .select('*')
          .eq('practitioner_id', user.id)
          .order('created_at', { ascending: false });
        
        if (holdsError) {
          console.log('Slot holds table not found or error:', holdsError);
        }
        setSlotHolds(holds || []);

        // Mutual exchange sessions - handle case where table doesn't exist
        const { data: ms, error: msError } = await supabase
          .from('mutual_exchange_sessions')
          .select('*')
          .or(`practitioner_a_id.eq.${user.id},practitioner_b_id.eq.${user.id}`)
          .order('created_at', { ascending: false })
          .limit(100);
        
        if (msError) {
          console.log('Mutual exchange sessions table not found or error:', msError);
        }
        setMutualSessions(ms || []);

        // Credits: hydrate from credits table (handle case where credits record doesn't exist)
        try {
          const { data: creditRow, error: creditError } = await supabase
            .from('credits')
            .select('balance')
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (creditError) {
            console.log('Credits record not found or error:', creditError.message);
            // Don't set credit balance if there's an error
            setCreditBalance(0);
          } else {
            setCreditBalance(creditRow?.balance || 0);
          }
        } catch (error) {
          console.log('Credits query failed, setting balance to 0');
          setCreditBalance(0);
        }

        // Credit transactions - handle case where table doesn't exist
        const { data: tx, error: txError } = await supabase
          .from('credit_transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100);
        
        if (txError) {
          console.log('Credit transactions table not found or error:', txError);
        }
        setCreditTransactions(tx || []);

        // User core (verification/onboarding flags) - only select columns that exist
        try {
          const { data: me, error: userError } = await supabase
            .from('users')
            .select('onboarding_status, profile_completed, first_name, last_name, phone, bio, location')
            .eq('id', user.id)
            .maybeSingle();
          
          if (userError) {
            console.log('User profile not found or error:', userError.message);
            // Don't set verification status if there's an error
            setVerificationStatus(null);
          } else {
            setVerificationStatus(null); // verification_status column doesn't exist yet
          }
        } catch (error) {
          console.log('User query failed, setting verification status to null');
          setVerificationStatus(null);
        }

        // Subscription status (handle case where subscriptions table doesn't exist)
        const { data: sub, error: subError } = await supabase
          .from('subscriptions')
          .select('status')
          .eq('user_id', user.id)
          .order('current_period_end', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (subError) {
          console.log('Subscriptions table not found or error:', subError);
        }
        const subStat = sub?.status || null;
        setSubscriptionStatus(subStat);
        computeOnboarding(me, subStat);
      } catch (e) {
        // best effort
      }
    };

    hydrate();
  }, [user, userProfile?.user_role]);

  // Backfill on reconnect: refresh critical tables
  useEffect(() => {
    const backfill = async () => {
      if (!user || connectionStatus !== 'connected') return;
      try {
        const [{ data: creditRow }, { data: tx }] = await Promise.all([
          supabase.from('credits').select('balance').eq('user_id', user.id).single(),
          supabase
            .from('credit_transactions')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(100),
        ]);
        setCreditBalance(creditRow?.balance || 0);
        setCreditTransactions(tx || []);
      } catch {}
    };
    backfill();
  }, [connectionStatus, user]);

  // Realtime subscriptions
  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel(`realtime-core-${user.id}`);
    setConnectionStatus('connecting');

    // Notifications
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, (payload: any) => {
      if (payload.eventType === 'INSERT') setNotifications(prev => [payload.new, ...prev]);
      if (payload.eventType === 'UPDATE') setNotifications(prev => prev.map(n => n.id === payload.new.id ? payload.new : n));
      if (payload.eventType === 'DELETE') setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
    });

    // Client sessions
    const sessionFilter = userProfile?.user_role === 'client' ? `client_id=eq.${user.id}` : `therapist_id=eq.${user.id}`;
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'client_sessions', filter: sessionFilter }, (payload: any) => {
      if (payload.eventType === 'INSERT') setSessions(prev => [payload.new, ...prev]);
      if (payload.eventType === 'UPDATE') setSessions(prev => prev.map(s => s.id === payload.new.id ? payload.new : s));
      if (payload.eventType === 'DELETE') setSessions(prev => prev.filter(s => s.id !== payload.old.id));
    });

    // Exchange requests (sent)
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'treatment_exchange_requests', filter: `requester_id=eq.${user.id}` }, (payload: any) => {
      if (payload.eventType === 'INSERT') setExchangeRequestsSent(prev => [payload.new, ...prev]);
      if (payload.eventType === 'UPDATE') setExchangeRequestsSent(prev => prev.map(r => r.id === payload.new.id ? payload.new : r));
      if (payload.eventType === 'DELETE') setExchangeRequestsSent(prev => prev.filter(r => r.id !== payload.old.id));
    });

    // Exchange requests (received)
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'treatment_exchange_requests', filter: `recipient_id=eq.${user.id}` }, (payload: any) => {
      if (payload.eventType === 'INSERT') setExchangeRequestsReceived(prev => [payload.new, ...prev]);
      if (payload.eventType === 'UPDATE') setExchangeRequestsReceived(prev => prev.map(r => r.id === payload.new.id ? payload.new : r));
      if (payload.eventType === 'DELETE') setExchangeRequestsReceived(prev => prev.filter(r => r.id !== payload.old.id));
    });

    // Slot holds (practitioner side)
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'slot_holds', filter: `practitioner_id=eq.${user.id}` }, (payload: any) => {
      if (payload.eventType === 'INSERT') setSlotHolds(prev => [payload.new, ...prev]);
      if (payload.eventType === 'UPDATE') setSlotHolds(prev => prev.map(h => h.id === payload.new.id ? payload.new : h));
      if (payload.eventType === 'DELETE') setSlotHolds(prev => prev.filter(h => h.id !== payload.old.id));
    });

    // Mutual exchange sessions
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'mutual_exchange_sessions' }, (payload: any) => {
      const u = user.id;
      const row = payload.eventType === 'DELETE' ? payload.old : payload.new;
      if (!(row.practitioner_a_id === u || row.practitioner_b_id === u)) return;
      if (payload.eventType === 'INSERT') setMutualSessions(prev => [payload.new, ...prev]);
      if (payload.eventType === 'UPDATE') setMutualSessions(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
      if (payload.eventType === 'DELETE') setMutualSessions(prev => prev.filter(m => m.id !== payload.old.id));
    });

    // Credits (balance updates)
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'credits', filter: `user_id=eq.${user.id}` }, (payload: any) => {
      const row = payload.eventType === 'DELETE' ? payload.old : payload.new;
      if (row?.balance !== undefined) setCreditBalance(row.balance);
    });

    // Users updates for verification/onboarding
    channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${user.id}` }, (payload: any) => {
      setVerificationStatus(payload.new?.verification_status || null);
      computeOnboarding(payload.new, subscriptionStatus);
    });

    // Subscriptions updates
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions', filter: `user_id=eq.${user.id}` }, (payload: any) => {
      const row = payload.eventType === 'DELETE' ? payload.old : payload.new;
      const status = row?.status || null;
      setSubscriptionStatus(status);
      // Recompute onboarding on subscription change
      computeOnboarding({ verification_status: verificationStatus, onboarding_status: undefined, profile_completed: undefined }, status);
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') setConnectionStatus('connected');
      if (status === 'CLOSED' || status === 'CHANNEL_ERROR') setConnectionStatus('disconnected');
    });

    return () => {
      try { supabase.removeChannel(channel); } catch {}
      setConnectionStatus('disconnected');
    };
  }, [user, userProfile?.user_role]);

  // Subscribe to credit transactions
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel(`realtime-credits-${user.id}`);
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'credit_transactions', filter: `user_id=eq.${user.id}` }, (payload: any) => {
      if (payload.eventType === 'INSERT') setCreditTransactions((prev) => upsertById(prev, payload.new));
      if (payload.eventType === 'UPDATE') setCreditTransactions((prev) => upsertById(prev, payload.new));
      if (payload.eventType === 'DELETE') setCreditTransactions((prev) => prev.filter((t) => t.id !== payload.old.id));
    });
    channel.subscribe();
    return () => {
      try { supabase.removeChannel(channel); } catch {}
    };
  }, [user]);

  const value = useMemo<RealtimeState>(() => ({
    notifications,
    sessions,
    exchangeRequests: { sent: exchangeRequestsSent, received: exchangeRequestsReceived },
    slotHolds,
    mutualSessions,
    creditBalance,
    creditTransactions,
    connectionStatus,
  }), [notifications, sessions, exchangeRequestsSent, exchangeRequestsReceived, slotHolds, mutualSessions, creditBalance, creditTransactions, connectionStatus]);

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
};


