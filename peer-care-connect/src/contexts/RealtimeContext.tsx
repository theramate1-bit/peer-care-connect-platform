import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Notification } from '@/lib/database';
import { ClientSession } from '@/lib/data-services';
import { ExchangeRequest, MutualExchangeSession } from '@/lib/treatment-exchange/types';
import { SlotHold } from '@/lib/slot-holding';
import { CreditTransaction } from '@/lib/credits';
import { logger } from '@/lib/logger';

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
  
  // Performance optimization: Skip real-time subscriptions during onboarding (saves 1.5s)
  const isOnboarding = typeof window !== 'undefined' && window.location.pathname.includes('/onboarding');
  
  // Quick return for onboarding - no expensive queries or real-time setup
  if (isOnboarding || !user) {
    const emptyState: RealtimeState = {
      notifications: [],
      sessions: [],
      exchangeRequests: { sent: [], received: [] },
      slotHolds: [],
      mutualSessions: [],
      creditBalance: 0,
      creditTransactions: [],
      connectionStatus: 'disconnected',
      subscriptionStatus: null,
      verificationStatus: null,
      onboardingProgress: undefined,
    };
    
    return (
      <RealtimeContext.Provider value={emptyState}>
        {children}
      </RealtimeContext.Provider>
    );
  }

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [sessions, setSessions] = useState<ClientSession[]>([]);
  const [exchangeRequestsSent, setExchangeRequestsSent] = useState<ExchangeRequest[]>([]);
  const [exchangeRequestsReceived, setExchangeRequestsReceived] = useState<ExchangeRequest[]>([]);
  const [slotHolds, setSlotHolds] = useState<SlotHold[]>([]);
  const [mutualSessions, setMutualSessions] = useState<MutualExchangeSession[]>([]);
  const [creditBalance, setCreditBalance] = useState<number>(0);
  const [creditTransactions, setCreditTransactions] = useState<CreditTransaction[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [onboardingProgress, setOnboardingProgress] = useState<{ step: number; completed: boolean; blockers: string[] }>();
  
  // Use ref to store user role to avoid dependency issues
  const userRoleRef = React.useRef<string | null>(null);
  const hasHydrated = React.useRef(false);
  
  React.useEffect(() => {
    userRoleRef.current = userProfile?.user_role || null;
  }, [userProfile?.user_role]);

  const computeOnboarding = (userRow: { first_name?: string; last_name?: string; phone?: string; location?: string; stripe_connect_account_id?: string; verification_status?: string; onboarding_status?: string; profile_completed?: boolean } | null | undefined, subStatus: string | null) => {
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
      // Practitioner: SIMPLIFIED FLOW (3 steps: Basic Info → Stripe Connect → Subscription)
      step = 1;
      // Step 1: Basic Info (first_name, last_name, phone, location)
      if (userRow.first_name && userRow.last_name && userRow.phone && userRow.location) {
        step = 2; // Basic Info complete
      }
      // Step 2: Stripe Connect
      if (userRow.stripe_connect_account_id) {
        step = 3; // Stripe Connect complete
      }
      // Step 3: Subscription (final step for onboarding)
      if (subStatus === 'active' || subStatus === 'trialing') {
        step = 4; // Subscription active (onboarding complete)
      }
      
      // Blockers
      if (subStatus && subStatus !== 'active' && subStatus !== 'trialing') {
        blockers.push('subscription');
      }
      if (userRow.verification_status && userRow.verification_status !== 'verified') {
        blockers.push('verification');
      }
      if (isCompleted) {
        step = 4; // All onboarding steps completed
      }
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
    if (!user || !userProfile) return;
    
    // Prevent multiple hydrations
    if (hasHydrated.current) return;
    hasHydrated.current = true;

    const hydrate = async () => {
      try {
        // Notifications - handle case where table doesn't exist
        try {
          const { data: notifs, error: notifsError } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(50);
          
          if (notifsError) {
            logger.debug('Notifications table not found or error', { error: notifsError.message }, 'RealtimeContext');
            setNotifications([]);
          } else {
            setNotifications(notifs || []);
          }
        } catch (error) {
          logger.debug('Notifications query failed', { error }, 'RealtimeContext');
          setNotifications([]);
        }

        // Sessions (practitioner vs client) - handle case where table doesn't exist
        try {
          if (userRoleRef.current === 'client') {
            const { data: sess, error: sessError } = await supabase
              .from('client_sessions')
              .select('*')
              .eq('client_id', user.id)
              .order('created_at', { ascending: false })
              .limit(100);
            
            if (sessError) {
              logger.debug('Client sessions table not found or error', { error: sessError.message }, 'RealtimeContext');
              setSessions([]);
            } else {
              setSessions(sess || []);
            }
          } else {
            const { data: sess, error: sessError } = await supabase
              .from('client_sessions')
              .select('*')
              .eq('therapist_id', user.id)
              .order('created_at', { ascending: false })
              .limit(100);
            
            if (sessError) {
              logger.debug('Client sessions table not found or error', { error: sessError.message }, 'RealtimeContext');
              setSessions([]);
            } else {
              setSessions(sess || []);
            }
          }
        } catch (error) {
          logger.debug('Sessions query failed', { error }, 'RealtimeContext');
          setSessions([]);
        }

        // Exchange requests (sent) - handle case where table doesn't exist
        const { data: sent, error: sentError } = await supabase
          .from('treatment_exchange_requests')
          .select('*')
          .eq('requester_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100);
        
        if (sentError) {
          logger.debug('Treatment exchange requests table not found or error', { error: sentError }, 'RealtimeContext');
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
          logger.debug('Treatment exchange requests table not found or error', { error: receivedError }, 'RealtimeContext');
        }
        setExchangeRequestsReceived(received || []);

        // Slot holds (practitioner side) - handle case where table doesn't exist
        const { data: holds, error: holdsError } = await supabase
          .from('slot_holds')
          .select('*')
          .eq('practitioner_id', user.id)
          .order('created_at', { ascending: false });
        
        if (holdsError) {
          logger.debug('Slot holds table not found or error', { error: holdsError }, 'RealtimeContext');
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
          logger.debug('Mutual exchange sessions table not found or error', { error: msError }, 'RealtimeContext');
        }
        setMutualSessions(ms || []);

        // Credits: Table doesn't exist yet - skip for performance (saves 500ms)
        // TODO: Re-enable when credits system is implemented
        setCreditBalance(0);
        setCreditTransactions([]);

        // User core (verification/onboarding flags) - only select columns that exist
        try {
          const { data: me, error: userError } = await supabase
            .from('users')
            .select('onboarding_status, profile_completed, first_name, last_name, phone, bio, location')
            .eq('id', user.id)
            .maybeSingle();
          
          if (userError) {
            logger.debug('User profile not found or error', { error: userError.message }, 'RealtimeContext');
            // Don't set verification status if there's an error
            setVerificationStatus(null);
          } else {
            setVerificationStatus(null); // verification_status column doesn't exist yet
          }
        } catch (error) {
          logger.debug('User query failed, setting verification status to null', { error }, 'RealtimeContext');
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
          logger.debug('Subscriptions table not found or error', { error: subError }, 'RealtimeContext');
        }
        const subStat = sub?.status || null;
        setSubscriptionStatus(subStat);
        computeOnboarding(me, subStat);
      } catch (e) {
        // best effort
      }
    };

    hydrate();
  }, [user]);

  // Backfill on reconnect: refresh critical data when connection is established
  useEffect(() => {
    const backfill = async () => {
      if (!user || connectionStatus !== 'connected') return;
      
      try {
        // Credits: Skip for performance - table doesn't exist yet  
        // TODO: Re-enable when credits system is implemented
        setCreditBalance(0);
        setCreditTransactions([]);
      } catch (error) {
        logger.error('Backfill failed', error, 'RealtimeContext');
      }
    };
    backfill();
  }, [connectionStatus, user]);

  // Realtime subscriptions
  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel(`realtime-core-${user.id}`);
    setConnectionStatus('connecting');

    // Notifications - wrap in try-catch to handle missing table
    try {
      channel.on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, (payload: { eventType: string; new: Notification; old: Notification }) => {
        if (payload.eventType === 'INSERT') setNotifications(prev => [payload.new, ...prev]);
        if (payload.eventType === 'UPDATE') setNotifications(prev => prev.map(n => n.id === payload.new.id ? payload.new : n));
        if (payload.eventType === 'DELETE') setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
      });
    } catch (error) {
      logger.debug('Notifications subscription failed', { error }, 'RealtimeContext');
    }

    // Client sessions - wrap in try-catch to handle missing table
    try {
      const sessionFilter = userRoleRef.current === 'client' ? `client_id=eq.${user.id}` : `therapist_id=eq.${user.id}`;
      channel.on('postgres_changes', { event: '*', schema: 'public', table: 'client_sessions', filter: sessionFilter }, (payload: { eventType: string; new: ClientSession; old: ClientSession }) => {
        if (payload.eventType === 'INSERT') setSessions(prev => [payload.new, ...prev]);
        if (payload.eventType === 'UPDATE') setSessions(prev => prev.map(s => s.id === payload.new.id ? payload.new : s));
        if (payload.eventType === 'DELETE') setSessions(prev => prev.filter(s => s.id !== payload.old.id));
      });
    } catch (error) {
      logger.debug('Client sessions subscription failed', { error }, 'RealtimeContext');
    }

    // Exchange requests (sent) - wrap in try-catch
    try {
      channel.on('postgres_changes', { event: '*', schema: 'public', table: 'treatment_exchange_requests', filter: `requester_id=eq.${user.id}` }, (payload: { eventType: string; new: ExchangeRequest; old: ExchangeRequest }) => {
        if (payload.eventType === 'INSERT') setExchangeRequestsSent(prev => [payload.new, ...prev]);
        if (payload.eventType === 'UPDATE') setExchangeRequestsSent(prev => prev.map(r => r.id === payload.new.id ? payload.new : r));
        if (payload.eventType === 'DELETE') setExchangeRequestsSent(prev => prev.filter(r => r.id !== payload.old.id));
      });
    } catch (error) {
      logger.debug('Exchange requests sent subscription failed', { error }, 'RealtimeContext');
    }

    // Exchange requests (received) - wrap in try-catch
    try {
      channel.on('postgres_changes', { event: '*', schema: 'public', table: 'treatment_exchange_requests', filter: `recipient_id=eq.${user.id}` }, (payload: { eventType: string; new: ExchangeRequest; old: ExchangeRequest }) => {
        if (payload.eventType === 'INSERT') setExchangeRequestsReceived(prev => [payload.new, ...prev]);
        if (payload.eventType === 'UPDATE') setExchangeRequestsReceived(prev => prev.map(r => r.id === payload.new.id ? payload.new : r));
        if (payload.eventType === 'DELETE') setExchangeRequestsReceived(prev => prev.filter(r => r.id !== payload.old.id));
      });
    } catch (error) {
      logger.debug('Exchange requests received subscription failed', { error }, 'RealtimeContext');
    }

    // Slot holds (practitioner side) - wrap in try-catch
    try {
      channel.on('postgres_changes', { event: '*', schema: 'public', table: 'slot_holds', filter: `practitioner_id=eq.${user.id}` }, (payload: { eventType: string; new: SlotHold; old: SlotHold }) => {
        if (payload.eventType === 'INSERT') setSlotHolds(prev => [payload.new, ...prev]);
        if (payload.eventType === 'UPDATE') setSlotHolds(prev => prev.map(h => h.id === payload.new.id ? payload.new : h));
        if (payload.eventType === 'DELETE') setSlotHolds(prev => prev.filter(h => h.id !== payload.old.id));
      });
    } catch (error) {
      logger.debug('Slot holds subscription failed', { error }, 'RealtimeContext');
    }

    // Mutual exchange sessions - wrap in try-catch
    try {
      channel.on('postgres_changes', { event: '*', schema: 'public', table: 'mutual_exchange_sessions' }, (payload: { eventType: string; new: MutualExchangeSession; old: MutualExchangeSession }) => {
        const u = user.id;
        const row = payload.eventType === 'DELETE' ? payload.old : payload.new;
        if (!(row.practitioner_a_id === u || row.practitioner_b_id === u)) return;
        if (payload.eventType === 'INSERT') setMutualSessions(prev => [payload.new, ...prev]);
        if (payload.eventType === 'UPDATE') setMutualSessions(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
        if (payload.eventType === 'DELETE') setMutualSessions(prev => prev.filter(m => m.id !== payload.old.id));
      });
    } catch (error) {
      logger.debug('Mutual exchange sessions subscription failed', { error }, 'RealtimeContext');
    }

    // Credits (balance updates) - wrap in try-catch
    try {
      channel.on('postgres_changes', { event: '*', schema: 'public', table: 'credits', filter: `user_id=eq.${user.id}` }, (payload: { eventType: string; new: { balance: number; user_id: string }; old: { balance: number; user_id: string } }) => {
        const row = payload.eventType === 'DELETE' ? payload.old : payload.new;
        if (row?.balance !== undefined) setCreditBalance(row.balance);
      });
    } catch (error) {
      logger.debug('Credits subscription failed', { error }, 'RealtimeContext');
    }

    // Users updates for verification/onboarding - wrap in try-catch
    try {
      channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${user.id}` }, (payload: { eventType: string; new: { verification_status?: string; onboarding_status?: string; profile_completed?: boolean; [key: string]: unknown }; old: unknown }) => {
        setVerificationStatus(payload.new?.verification_status || null);
        computeOnboarding(payload.new, subscriptionStatus);
      });
    } catch (error) {
      logger.debug('Users subscription failed', { error }, 'RealtimeContext');
    }

    // Subscriptions updates - wrap in try-catch
    try {
      channel.on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions', filter: `user_id=eq.${user.id}` }, (payload: { eventType: string; new: { status: string; [key: string]: unknown }; old: { status: string; [key: string]: unknown } }) => {
        const row = payload.eventType === 'DELETE' ? payload.old : payload.new;
        const status = row?.status || null;
        setSubscriptionStatus(status);
        // Recompute onboarding on subscription change
        computeOnboarding({ verification_status: verificationStatus, onboarding_status: undefined, profile_completed: undefined }, status);
      });
    } catch (error) {
      logger.debug('Subscriptions subscription failed', { error }, 'RealtimeContext');
    }

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') setConnectionStatus('connected');
      if (status === 'CLOSED' || status === 'CHANNEL_ERROR') setConnectionStatus('disconnected');
    });

    return () => {
      try { supabase.removeChannel(channel); } catch {}
      setConnectionStatus('disconnected');
    };
  }, [user]);

  // Subscribe to credit transactions
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel(`realtime-credits-${user.id}`);
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'credit_transactions', filter: `user_id=eq.${user.id}` }, (payload: { eventType: string; new: CreditTransaction; old: CreditTransaction }) => {
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


