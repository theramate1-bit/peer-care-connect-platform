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

interface UserProfile {
  // Basic fields
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  user_role: 'sports_therapist' | 'massage_therapist' | 'osteopath' | 'client' | 'admin' | null;
  onboarding_status: 'pending' | 'role_selected' | 'in_progress' | 'completed';
  phone?: string;
  profile_completed: boolean;

  // Professional fields (for practitioners)
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

  // Profile photo
  avatar_url?: string;
  profile_photo_url?: string; // Legacy field name for backward compatibility

  // Stripe Connect
  stripe_connect_account_id?: string;

  // Dashboard goals (KAN-69). Reserved for future pricing/insights feature; not used in current UI (no session-estimate or revenue calculator).
  monthly_earnings_goal?: number | null;

  // Preferences (stored as JSONB)
  preferences?: {
    emailNotifications?: boolean;
    smsNotifications?: boolean;
    calendarReminders?: boolean;
    marketingEmails?: boolean;
    profileVisible?: boolean;
    showContactInfo?: boolean;
    autoAcceptBookings?: boolean;
    /** In-app / in-platform message notifications (booking, reminders, etc.) */
    receiveInAppNotifications?: boolean;
    /** Platform updates and product news */
    platformUpdates?: boolean;
  };

  // Timestamps
  created_at?: string;
  updated_at?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userProfile: UserProfile | null;
  /** True when userProfile.profile_completed is true; used for dashboard CTAs */
  isProfileComplete: boolean;
  loading: boolean;
  profileLoading: boolean; // Separate state for profile fetches after auth state changes
  intendedRole: string | null;
  setIntendedRole: (role: string | null) => void;
  signUp: (email: string, password: string, userData: { first_name: string; last_name: string; user_role: string }) => Promise<{ data: any; error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: any }>;
  refreshProfile: () => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false); // Track profile fetches separately
  const [intendedRole, setIntendedRole] = useState<string | null>(null);
  const isFetchingProfile = useRef(false);

  const performSilentLogout = async () => {
    // Clear state IMMEDIATELY to stop any pending operations
    setUser(null);
    setSession(null);
    setUserProfile(null);

    // Then perform the actual logout
    await AuthErrorHandler.performSilentLogout();
  };

  const handleAuthError = async (error: any): Promise<boolean> => {
    return await AuthErrorHandler.handleAuthError(error);
  };

  const fetchUserProfile = async (userId: string, retryCount = 0, isAuthStateChange = false) => {
    // Prevent duplicate fetches
    if (isFetchingProfile.current) {
      return;
    }

    isFetchingProfile.current = true;
    // Set profileLoading only for auth state changes (not initial load) to prevent UI flash
    if (isAuthStateChange) {
      setProfileLoading(true);
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        AuthErrorHandler.logErrorDetails(error, 'Profile fetch');

        // No profile row (e.g. guest-to-client account): create/merge profile then refetch
        if (error.code === 'PGRST116') {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.id === userId) {
            const u = session.user;
            const { error: rpcError } = await supabase.rpc('convert_guest_to_client_or_create_profile', {
              p_new_id: userId,
              p_email: u.email ?? '',
              p_first_name: u.user_metadata?.first_name || 'User',
              p_last_name: u.user_metadata?.last_name || 'User',
              p_user_role: u.user_metadata?.user_role || 'client',
            });
            if (!rpcError) {
              const { data: retryData, error: retryErr } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();
              if (!retryErr && retryData) {
                setUserProfile(retryData as UserProfile);
                return;
              }
            }
          }
          setUserProfile(null);
          return;
        }

        // Handle other authentication errors
        if (AuthErrorHandler.isAuthenticationError(error)) {

          // Try to refresh session (only once)
          if (retryCount === 0) {
            const canRetry = await handleAuthError(error);
            if (canRetry) {
              isFetchingProfile.current = false;
              return fetchUserProfile(userId, retryCount + 1, isAuthStateChange);
            }
          } else {
            // Retry failed, perform silent logout
            await performSilentLogout();
          }
          if (isAuthStateChange) {
            setProfileLoading(false);
          }
          return;
        }

        setUserProfile(null);
        return;
      }
      setUserProfile(data as UserProfile);
    } catch (err) {
      // Only log critical profile fetch errors in development
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Profile fetch error:', err);
      }
      setUserProfile(null);
    } finally {
      isFetchingProfile.current = false;
      if (isAuthStateChange) {
        setProfileLoading(false);
      }
    }
  };

  const createUserProfile = async (user: User) => {
    try {
      const profileData = {
        id: user.id,
        email: user.email || '',
        first_name: user.user_metadata?.first_name || 'User',
        last_name: user.user_metadata?.last_name || 'User',
        user_role: user.user_metadata?.user_role || null,
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

      setUserProfile(data as UserProfile);
    } catch (err) {
      console.error('Unexpected error creating profile:', err);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Get initial session - optimized for speed
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!mounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        // Fetch profile in background (non-blocking)
        if (session?.user) {
          fetchUserProfile(session.user.id, 0, false); // Initial load, not auth state change
        } else {
          setUserProfile(null);
        }

        // Set loading false immediately - don't wait for profile
        setLoading(false);
      } catch (error) {
        console.error('Auth init error:', error);
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      // DON'T set loading to true - prevents UI flash
      setSession(session);
      setUser(session?.user ?? null);

      // Skip profile fetch for TOKEN_REFRESHED - profile unchanged, avoids unmounting app on tab return
      if (event === 'TOKEN_REFRESHED') {
        return;
      }

      // Fetch profile in background - track loading separately to prevent UI flash
      if (session?.user) {
        // Set profileLoading to track this fetch (separate from initial loading)
        setProfileLoading(true);
        // Non-blocking: fetch profile but don't wait for it
        fetchUserProfile(session.user.id, 0, true).catch(error => {
          console.error('❌ Error fetching profile in auth state change:', error);
          setProfileLoading(false);
          // Don't set null here - let existing profile remain if fetch fails
        });
      } else {
        setUserProfile(null);
        setProfileLoading(false);
      }
      // Don't set loading false here - it's already false from init
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, userData: { first_name: string; last_name: string; user_role: string }) => {
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
        setUserProfile(profileRow as UserProfile);
      } else {
        await createUserProfile(data.user);
      }
    }

    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error };
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out from Supabase:', error);
        // We continue to clear local state even if server logout fails
      }
    } catch (error) {
      console.error('Unexpected error during sign out:', error);
    }

    // Clear state
    setUser(null);
    setSession(null);
    setUserProfile(null);

    // Note: supabase.auth.signOut() already clears the session from localStorage
    // The prompt: 'select_account' parameter in OAuth options will force Google
    // to show account selection instead of using cached account

    // Redirect to landing page
    window.location.href = '/';
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) {
      return { error: { message: 'No user logged in' } };
    }

    console.log('📝 AuthContext: updateProfile called with:', updates);

    const { error } = await supabase
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (!error) {
      // Optimistically update userProfile
      setUserProfile(prev => prev ? { ...prev, ...updates } : null);
      console.log('✅ AuthContext: userProfile updated optimistically:', updates);
    } else {
      // Only log critical update errors in development
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ AuthContext: updateProfile error:', error);
      }
    }

    return { error };
  };

  const refreshProfile = async () => {
    if (!user) {
      return { error: { message: 'No user logged in' } };
    }

    console.log('🔄 AuthProvider: Refreshing profile for user:', user.id);
    // Force refresh by clearing the fetching flag if set
    isFetchingProfile.current = false;
    await fetchUserProfile(user.id);

    // Verify the refresh worked by checking what was actually fetched
    const { data: verifyData } = await supabase
      .from('users')
      .select('first_name, last_name, email')
      .eq('id', user.id)
      .single();

    if (verifyData) {
      console.log('✅ RefreshProfile: Verified fresh data from DB:', {
        first_name: verifyData.first_name,
        last_name: verifyData.last_name,
        email: verifyData.email
      });
    }

    return { error: null };
  };

  const value = useMemo(() => ({
    user,
    session,
    userProfile,
    isProfileComplete: !!userProfile?.profile_completed,
    loading,
    profileLoading,
    intendedRole,
    setIntendedRole,
    signUp,
    signIn,
    signOut,
    updateProfile,
    refreshProfile,
  }), [user, session, userProfile, loading, profileLoading, intendedRole]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}