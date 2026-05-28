import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { MessagingManager } from "@/lib/messaging";
import { checkAndFixPractitionerOnboardingStatus } from "@/lib/onboarding-utils";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading } = useAuth();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("Processing authentication...");
  const hasProcessed = useRef(false);


  useEffect(() => {
    // Prevent multiple executions
    if (hasProcessed.current) {
      return;
    }
    
    // Add timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      setIsProcessing(false);
    }, 10000); // 10 second timeout
    
    const handleCallback = async () => {
      try {
        // Wait for auth to finish loading
        if (loading) {
          setStatus("Loading authentication...");
          return;
        }

        // Mark as processed to prevent multiple executions
        hasProcessed.current = true;
        
        // Set processing to false when we start handling the callback
        setIsProcessing(false);

        if (!user) {
          // Check if this is an email verification flow
          const urlParams = new URLSearchParams(window.location.search);
          const hasVerificationToken = urlParams.has('token') || window.location.hash.includes('access_token');
          
          if (hasVerificationToken) {
            setStatus("Email verification in progress...");
            // Wait a bit longer for email verification to complete
            await new Promise(resolve => setTimeout(resolve, 2000));
            return;
          }
          
          setError('Authentication failed. Please try again.');
          setTimeout(() => navigate('/login', { replace: true }), 2000);
          return;
        }

        setStatus("User authenticated, checking profile...");
        // User is authenticated

        // Check if user has a profile
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();


        if (profileError) {
          setError(`Database error: ${profileError.message}`);
          setTimeout(() => navigate('/login', { replace: true }), 3000);
          return;
        }

        // Variable to hold the final profile
        let finalProfile = profile;

        // If no profile exists, wait a moment for the database trigger to create it
        if (!profile) {
          setStatus("Creating user profile...");
          
          // Wait for the database trigger to create the profile
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Check again for the profile
          const { data: retryProfile, error: retryError } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();
            
          if (retryError) {
            console.error('Profile retry error:', retryError);
            setError(`Database error: ${retryError.message}`);
            setTimeout(() => navigate('/login', { replace: true }), 3000);
            return;
          }
          
          if (!retryProfile) {
            // Last chance: merge guest profile (e.g. guest booking → sign up with same email)
            setStatus("Linking your account...");
            const { error: mergeError } = await supabase.rpc('convert_guest_to_client_or_create_profile', {
              p_new_id: user.id,
              p_email: user.email ?? '',
              p_first_name: user.user_metadata?.first_name || 'User',
              p_last_name: user.user_metadata?.last_name || 'User',
              p_user_role: 'client',
            });
            if (mergeError) {
              console.error('Guest merge / create profile RPC error:', mergeError);
              setError('Failed to create user profile. Please try again.');
              setTimeout(() => navigate('/login', { replace: true }), 3000);
              return;
            }
            const { data: afterMergeProfile, error: afterMergeError } = await supabase
              .from('users')
              .select('*')
              .eq('id', user.id)
              .maybeSingle();
            if (afterMergeError || !afterMergeProfile) {
              setError('Failed to create user profile. Please try again.');
              setTimeout(() => navigate('/login', { replace: true }), 3000);
              return;
            }
            finalProfile = afterMergeProfile;
          } else {
            finalProfile = retryProfile;
          }
        }

        // Link guest conversations and sessions if this is a guest account creation
        if (user.email && finalProfile) {
          try {
            setStatus("Linking your sessions and messages...");
            
            // Link guest conversations
            await MessagingManager.linkGuestConversationsToUser(user.email, user.id);
            
            // Link guest sessions
            const linkedSessionsCount = await MessagingManager.linkGuestSessionsToUser(user.email, user.id);
            
            if (linkedSessionsCount > 0) {
              console.log(`Linked ${linkedSessionsCount} guest sessions to account`);
            }
          } catch (linkError) {
            console.error('Error linking guest data:', linkError);
            // Don't fail the flow - linking is non-critical
          }
        }

        // Check if user needs role selection
        // Both OAuth users and email users without roles should go to role selection
        if (!finalProfile.user_role) {
          setStatus("Redirecting to role selection...");
          setTimeout(() => navigate('/auth/role-selection', { replace: true }), 1000);
          return;
        }

        // FALLBACK CHECK: For practitioners with incomplete status but who may have completed onboarding
        // This catches cases where the completion update failed silently
        const isPractitioner = finalProfile.user_role && 
          ['sports_therapist', 'massage_therapist', 'osteopath'].includes(finalProfile.user_role);
        
        if (isPractitioner && finalProfile.onboarding_status !== 'completed') {
          setStatus("Verifying account status...");
          const fixResult = await checkAndFixPractitionerOnboardingStatus(user.id);
          
          if (fixResult.wasFixed) {
            console.log('✅ Practitioner onboarding status was automatically fixed');
            // Refresh the profile to get the updated status
            const { data: refreshedProfile } = await supabase
              .from('users')
              .select('*')
              .eq('id', user.id)
              .single();
            
            if (refreshedProfile) {
              finalProfile = refreshedProfile;
            }
          }
        }
        
        // Check if user needs onboarding
        if (finalProfile.onboarding_status !== 'completed' && !finalProfile.profile_completed) {
          setStatus("Redirecting to onboarding...");
          setTimeout(() => navigate('/onboarding', { replace: true }), 1000);
          return;
        }

        // Check if there's a redirect parameter (from guest message email)
        const redirectParam = searchParams.get('redirect');
        if (redirectParam) {
          setStatus("Redirecting to your messages...");
          setTimeout(() => navigate(decodeURIComponent(redirectParam), { replace: true }), 1000);
          return;
        }

        // User has completed everything, redirect to appropriate dashboard
        const userRole = finalProfile.user_role;
        setStatus("Redirecting to dashboard...");
        
        setTimeout(() => {
          if (userRole === 'client') {
            navigate('/client/dashboard', { replace: true });
          } else if (['sports_therapist', 'massage_therapist', 'osteopath'].includes(userRole)) {
            navigate('/dashboard', { replace: true });
          } else if (userRole === 'admin') {
            navigate('/admin/verification', { replace: true });
          } else {
            navigate('/auth/role-selection', { replace: true });
          }
        }, 1000);

      } catch (error) {
        setError(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setIsProcessing(false);
      }
    };

    handleCallback();
    
    return () => {
      clearTimeout(timeout);
    };
  }, [user, loading, navigate, searchParams]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center p-4">
        <div className="text-center max-w-md mx-auto">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-red-600 mb-4">Authentication Error</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <div className="space-y-3">
            <button 
              onClick={() => navigate('/login')}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Return to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center p-4">
      <div className="text-center max-w-md mx-auto">
        <div className="text-primary text-6xl mb-4">🔄</div>
        <h2 className="text-2xl font-bold mb-4">Processing Authentication</h2>
        <p className="text-muted-foreground mb-6">{status}</p>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;