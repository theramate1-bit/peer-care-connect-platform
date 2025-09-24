import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const AuthCallback = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('🔄 Processing auth callback...');
        
        // Wait for auth to finish loading
        if (loading) {
          console.log('🔄 Auth still loading, waiting...');
          return;
        }

        if (!user) {
          console.log('❌ No user found, redirecting to login');
          navigate('/login', { replace: true });
          return;
        }

        console.log('✅ User authenticated:', user.email);

        // Check if user has a profile
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) {
          console.error('❌ Profile fetch error:', profileError);
          navigate('/login', { replace: true });
          return;
        }

        if (!profile) {
          console.log('👤 No profile found, redirecting to role selection');
          navigate('/auth/role-selection', { replace: true });
          return;
        }

        console.log('👤 Profile found:', { 
          user_role: profile.user_role, 
          onboarding_status: profile.onboarding_status,
          profile_completed: profile.profile_completed
        });

        // Check if user needs role selection
        if (!profile.user_role) {
          console.log('🔗 User needs role selection');
          navigate('/auth/role-selection', { replace: true });
          return;
        }

        // Check if user needs onboarding
        if (profile.onboarding_status === 'pending' || !profile.profile_completed) {
          console.log('🔄 User needs onboarding');
          navigate('/onboarding', { replace: true });
          return;
        }

        // User has completed everything, redirect to appropriate dashboard
        const userRole = profile.user_role;
        console.log('✅ User has completed setup, redirecting to dashboard for role:', userRole);
        
        if (userRole === 'client') {
          navigate('/client/dashboard', { replace: true });
        } else if (['sports_therapist', 'massage_therapist', 'osteopath'].includes(userRole)) {
          navigate('/dashboard', { replace: true });
        } else if (userRole === 'admin') {
          navigate('/admin/verification', { replace: true });
        } else {
          navigate('/auth/role-selection', { replace: true });
        }

      } catch (error) {
        console.error('❌ Auth callback error:', error);
        setError(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setIsProcessing(false);
      }
    };

    handleCallback();
  }, [navigate, user, loading]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Authentication Error</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button 
            onClick={() => navigate('/login')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold mb-2">Completing Authentication</h2>
        <p className="text-muted-foreground">Please wait while we set up your account...</p>
      </div>
    </div>
  );
};

export default AuthCallback;