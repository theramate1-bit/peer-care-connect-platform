import {
  createContext,
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  useContext,
  type ReactNode,
} from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AuthErrorHandler } from '@/lib/auth-error-handler';
import {
  clearCachedProfile,
  PROFILE_FETCH_TIMEOUT_MS,
  PROFILE_FULL_SELECT,
  PROFILE_ROUTING_SELECT,
  readCachedProfile,
  writeCachedProfile,
  isCacheStaleForProfile,
} from '@/lib/auth-profile-cache';
import {
  isSessionOnlyAuthEvent,
  shouldInvalidateProfileCache,
  shouldSkipProfileSyncOnAuthEvent,
} from '@/lib/auth-bootstrap';

interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  user_role: 'sports_therapist' | 'massage_therapist' | 'osteopath' | 'client' | 'admin' | null;
  onboarding_status: 'pending' | 'role_selected' | 'in_progress' | 'completed';
  phone?: string;
  profile_completed: boolean;
  bio?: string;
  location?: string;
  clinic_address?: string;
  clinic_latitude?: number | null;
  clinic_longitude?: number | null;
  therapist_type?: 'clinic_based' | 'mobile' | 'hybrid' | null;
  base_address?: string | null;
  base_latitude?: number | null;
  base_longitude?: number | null;
  mobile_service_radius_km?: number | null;
  service_radius_km?: number | null;
  experience_years?: number;
  professional_body?: string;
  professional_body_other?: string | null;
  registration_number?: string;
  qualification_type?: string;
  professional_statement?: string;
  treatment_philosophy?: string;
  response_time_hours?: number;
  services_offered?: string[];
  treatment_exchange_opt_in?: boolean;
  has_liability_insurance?: boolean;
  avatar_url?: string;
  profile_photo_url?: string;
  stripe_connect_account_id?: string;
  monthly_earnings_goal?: number | null;
  preferences?: {
    emailNotifications?: boolean;
    smsNotifications?: boolean;
    calendarReminders?: boolean;
    marketingEmails?: boolean;
    profileVisible?: boolean;
    showContactInfo?: boolean;
    autoAcceptBookings?: boolean;
    receiveInAppNotifications?: boolean;
    platformUpdates?: boolean;
  };
  created_at?: string;
  updated_at?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userProfile: UserProfile | null;
  isProfileComplete: boolean;
  /** True until first Supabase session read completes (local storage / refresh). */
  loading: boolean;
  /** True while a background profile revalidation is in flight (never blocks the shell). */
  profileSyncing: boolean;
  intendedRole: string | null;
  setIntendedRole: (role: string | null) => void;
  signUp: (email: string, password: string, userData: { first_name: string; last_name: string; user_role: string }) => Promise<{ data: any; error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: any }>;
  refreshProfile: () => Promise<{ error: any; profile: UserProfile | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('TIMEOUT')), ms);
    promise
      .then((v) => {
        clearTimeout(timer);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(timer);
        reject(e);
      });
  });
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileSyncing, setProfileSyncing] = useState(false);
  const [intendedRole, setIntendedRole] = useState<string | null>(null);

  const profileSyncRef = useRef<Promise<UserProfile | null> | null>(null);
  const lastSyncedUserId = useRef<string | null>(null);
  const lastProfileRef = useRef<UserProfile | null>(null);

  const applyProfile = useCallback((userId: string, profile: UserProfile) => {
    lastProfileRef.current = profile;
    setUserProfile(profile);
    writeCachedProfile(userId, profile as unknown as Record<string, unknown>);
  }, []);

  const performSilentLogout = async () => {
    setUser(null);
    setSession(null);
    setUserProfile(null);
    clearCachedProfile();
    lastSyncedUserId.current = null;
    await AuthErrorHandler.performSilentLogout();
  };

  const handleAuthError = async (error: unknown): Promise<boolean> => {
    return AuthErrorHandler.handleAuthError(error);
  };

  const fetchProfileRow = async (userId: string, select: string) => {
    return withTimeout(
      supabase.from('users').select(select).eq('id', userId).single(),
      PROFILE_FETCH_TIMEOUT_MS
    );
  };

  const ensureProfileRow = async (userId: string): Promise<UserProfile | null> => {
    const { data: { session: liveSession } } = await supabase.auth.getSession();
    if (liveSession?.user?.id !== userId) return null;
    const u = liveSession.user;
    const { error: rpcError } = await supabase.rpc('convert_guest_to_client_or_create_profile', {
      p_new_id: userId,
      p_email: u.email ?? '',
      p_first_name: u.user_metadata?.first_name || 'User',
      p_last_name: u.user_metadata?.last_name || 'User',
      p_user_role: u.user_metadata?.user_role || 'client',
    });
    if (rpcError) return null;
    const { data } = await fetchProfileRow(userId, PROFILE_FULL_SELECT);
    return (data as UserProfile) ?? null;
  };

  const syncUserProfile = useCallback(
    async (userId: string, retryCount = 0): Promise<UserProfile | null> => {
      if (profileSyncRef.current) {
        return profileSyncRef.current;
      }

      const run = async (): Promise<UserProfile | null> => {
        setProfileSyncing(true);
        let resolved: UserProfile | null = lastProfileRef.current;
        try {
          let routing: UserProfile | null = null;
          let routingError: { code?: string; message?: string } | null = null;
          try {
            const result = await fetchProfileRow(userId, PROFILE_ROUTING_SELECT);
            routing = result.data as UserProfile | null;
            routingError = result.error;
          } catch (e) {
            if (e instanceof Error && e.message === 'TIMEOUT') {
              if (import.meta.env.DEV) {
                console.warn('Profile routing fetch timed out; using cache if present');
              }
              return resolved;
            }
            throw e;
          }

          if (routingError) {

            if (routingError.code === 'PGRST116') {
              const created = await ensureProfileRow(userId);
              if (created) {
                applyProfile(userId, created);
                resolved = created;
              } else {
                setUserProfile(null);
                lastProfileRef.current = null;
                resolved = null;
              }
              return resolved;
            }

            if (AuthErrorHandler.isAuthenticationError(routingError)) {
              if (retryCount === 0 && (await handleAuthError(routingError))) {
                profileSyncRef.current = null;
                return syncUserProfile(userId, retryCount + 1);
              }
              await performSilentLogout();
              return null;
            }

            setUserProfile(null);
            lastProfileRef.current = null;
            return null;
          }

          const cached = readCachedProfile(userId);
          if (cached && routing && isCacheStaleForProfile(cached, routing as Record<string, unknown>)) {
            clearCachedProfile();
          }

          if (routing) {
            setUserProfile((prev) => ({ ...prev, ...(routing as UserProfile) } as UserProfile));
          }

          try {
            const { data: full, error: fullError } = await fetchProfileRow(userId, PROFILE_FULL_SELECT);
            if (!fullError && full) {
              const fullRow = full as UserProfile;
              if (cached && isCacheStaleForProfile(cached, fullRow as unknown as Record<string, unknown>)) {
                clearCachedProfile();
              }
              applyProfile(userId, fullRow);
              resolved = fullRow;
            } else if (routing) {
              applyProfile(userId, routing);
              resolved = routing;
            }
          } catch (e) {
            if (e instanceof Error && e.message === 'TIMEOUT' && routing) {
              applyProfile(userId, routing);
              return routing;
            }
            throw e;
          }
          return lastProfileRef.current;
        } catch (err) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Profile sync error:', err);
          }
          return lastProfileRef.current;
        } finally {
          setProfileSyncing(false);
          profileSyncRef.current = null;
        }
      };

      profileSyncRef.current = run();
      return profileSyncRef.current;
    },
    [applyProfile]
  );

  // Session bootstrap — one listener + initial getSession (Supabase recommended pattern)
  useEffect(() => {
    let mounted = true;

    const applySession = (next: Session | null) => {
      setSession(next);
      setUser(next?.user ?? null);
      if (!next?.user) {
        setUserProfile(null);
        clearCachedProfile();
        lastSyncedUserId.current = null;
      }
    };

    supabase.auth.getSession().then(({ data: { session: initial } }) => {
      if (!mounted) return;
      applySession(initial);
      if (initial?.user) {
        const cached = readCachedProfile(initial.user.id);
        if (cached) {
          setUserProfile(cached as UserProfile);
        }
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;
      if (isSessionOnlyAuthEvent(event)) return;

      applySession(nextSession);
      setLoading(false);

      if (!nextSession?.user) {
        return;
      }

      if (shouldInvalidateProfileCache(event)) {
        clearCachedProfile();
        lastSyncedUserId.current = null;
      }

      if (shouldSkipProfileSyncOnAuthEvent(event)) {
        const cached = readCachedProfile(nextSession.user.id);
        if (cached) setUserProfile(cached as UserProfile);
        return;
      }

      lastSyncedUserId.current = null;
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Profile sync when user id changes — decoupled from auth events (no duplicate INITIAL_SESSION fetch)
  useEffect(() => {
    const userId = user?.id ?? null;
    if (!userId) return;

    if (lastSyncedUserId.current === userId) return;
    lastSyncedUserId.current = userId;

    const cached = readCachedProfile(userId);
    if (cached) {
      setUserProfile(cached as UserProfile);
    }

    void syncUserProfile(userId);
  }, [user?.id, syncUserProfile]);

  const createUserProfile = async (authUser: User) => {
    try {
      const profileData = {
        id: authUser.id,
        email: authUser.email || '',
        first_name: authUser.user_metadata?.first_name || 'User',
        last_name: authUser.user_metadata?.last_name || 'User',
        user_role: authUser.user_metadata?.user_role || null,
        onboarding_status: 'pending' as const,
        profile_completed: false,
        phone: null,
        is_verified: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('users')
        .upsert(profileData, { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        console.error('Error creating user profile:', error);
        return;
      }

      applyProfile(authUser.id, data as UserProfile);
    } catch (err) {
      console.error('Unexpected error creating profile:', err);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    userData: { first_name: string; last_name: string; user_role: string }
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: userData.first_name,
          last_name: userData.last_name,
          user_role: userData.user_role,
        },
      },
    });

    if (data.user) {
      const { data: profileRows, error: rpcError } = await supabase.rpc(
        'convert_guest_to_client_or_create_profile',
        {
          p_new_id: data.user.id,
          p_email: data.user.email ?? email,
          p_first_name: userData.first_name || data.user.user_metadata?.first_name || 'User',
          p_last_name: userData.last_name || data.user.user_metadata?.last_name || 'User',
          p_user_role: userData.user_role || data.user.user_metadata?.user_role || 'client',
        }
      );

      const profileRow = Array.isArray(profileRows) ? profileRows[0] : profileRows;
      if (rpcError) {
        console.error('Convert guest / create profile RPC error:', rpcError);
        toast.error(rpcError.message || 'Account created but profile setup failed. Please try signing in.');
        await createUserProfile(data.user);
      } else if (profileRow) {
        applyProfile(data.user.id, profileRow as UserProfile);
      } else {
        await createUserProfile(data.user);
      }
      lastSyncedUserId.current = data.user.id;
    }

    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    setUser(null);
    setSession(null);
    setUserProfile(null);
    clearCachedProfile();
    lastSyncedUserId.current = null;

    try {
      await Promise.race([
        supabase.auth.signOut(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Sign out timed out')), 3000)),
      ]);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Sign out:', error);
      }
    }

    window.location.href = '/';
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) {
      return { error: { message: 'No user logged in' } };
    }

    const { error } = await supabase
      .from('users')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (!error) {
      setUserProfile((prev) => {
        const next = prev ? { ...prev, ...updates } : null;
        if (next) writeCachedProfile(user.id, next as unknown as Record<string, unknown>);
        return next;
      });
    }

    return { error };
  };

  const refreshProfile = async () => {
    if (!user) {
      return { error: { message: 'No user logged in' }, profile: null };
    }
    lastSyncedUserId.current = null;
    profileSyncRef.current = null;
    const profile = await syncUserProfile(user.id);
    return { error: null, profile: profile ?? lastProfileRef.current };
  };

  const value = useMemo(
    () => ({
      user,
      session,
      userProfile,
      isProfileComplete: !!userProfile?.profile_completed,
      loading,
      profileSyncing,
      intendedRole,
      setIntendedRole,
      signUp,
      signIn,
      signOut,
      updateProfile,
      refreshProfile,
    }),
    [user, session, userProfile, loading, profileSyncing, intendedRole, syncUserProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
