import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Mail, Lock, AlertCircle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { getDashboardRoute, shouldRedirectToOnboarding } from "@/lib/dashboard-routing";
import { checkAndFixPractitionerOnboardingStatus } from "@/lib/onboarding-utils";
import { MessagingManager } from "@/lib/messaging";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, userProfile, loading: authLoading } = useAuth();
  const [email, setEmail] = useState(searchParams.get('email') ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Check for error parameters in URL and clear them so the message doesn't show on every visit
    const error = searchParams.get('error');
    if (error === 'session_expired') {
      setErrorMessage('Your session has expired. Please sign in again.');
      navigate('/login', { replace: true });
    } else if (error === 'auth_error') {
      setErrorMessage('Authentication error occurred. Please sign in again.');
      navigate('/login', { replace: true });
    }
  }, [searchParams, navigate]);

  // Redirect authenticated users away from login page
  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;
    
    // If user is authenticated and profile is loaded, redirect them
    if (user && userProfile) {
      // Check if user needs onboarding
      if (shouldRedirectToOnboarding(userProfile)) {
        navigate('/onboarding', { replace: true });
        return;
      }
      
      // Check if user needs role selection
      if (!userProfile.user_role) {
        navigate('/auth/role-selection', { replace: true });
        return;
      }
      
      // Respect redirect param or state.from when user arrived from protected route
      const redirectParam = searchParams.get('redirect');
      const fromState = (location.state as { from?: { pathname?: string; search?: string } })?.from;
      const redirectTo = redirectParam ?? (fromState ? `${fromState.pathname || ''}${fromState.search || ''}` : null);
      if (redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//')) {
        navigate(redirectTo, { replace: true });
        return;
      }
      
      // User is fully set up, redirect to appropriate dashboard
      const dashboardRoute = getDashboardRoute({ userProfile });
      navigate(dashboardRoute, { replace: true });
    }
  }, [user, userProfile, authLoading, navigate, searchParams, location.state]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        toast.success("Signed in successfully!");
        
        // Wait a moment for AuthContext to update, then fetch profile and redirect
        setTimeout(async () => {
          // Link guest sessions and conversations to this user (guest-to-client)
          try {
            await MessagingManager.linkGuestConversationsToUser(data.user.email ?? '', data.user.id);
            await MessagingManager.linkGuestSessionsToUser(data.user.email ?? '', data.user.id);
          } catch (linkError) {
            console.error('Error linking guest data on login:', linkError);
          }

          // Fetch user profile to determine redirect destination
          let { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .single();
          
          if (profile) {
            // FALLBACK CHECK: For practitioners with incomplete status but who may have completed onboarding
            const isPractitioner = profile.user_role && 
              ['sports_therapist', 'massage_therapist', 'osteopath'].includes(profile.user_role);
            
            if (isPractitioner && profile.onboarding_status !== 'completed') {
              const fixResult = await checkAndFixPractitionerOnboardingStatus(data.user.id);
              
              if (fixResult.wasFixed) {
                console.log('✅ Practitioner onboarding status was automatically fixed on login');
                // Refresh the profile to get the updated status
                const { data: refreshedProfile } = await supabase
                  .from('users')
                  .select('*')
                  .eq('id', data.user.id)
                  .single();
                
                if (refreshedProfile) {
                  profile = refreshedProfile;
                }
              }
            }
            
            // Check if user needs onboarding
            if (shouldRedirectToOnboarding(profile)) {
              navigate('/onboarding', { replace: true });
              return;
            }
            
            // Check if user needs role selection
            if (!profile.user_role) {
              navigate('/auth/role-selection', { replace: true });
              return;
            }
            
            // Respect redirect param (e.g. from email links) or state.from (from AuthRouter)
            const redirectTo = searchParams.get('redirect') ?? (location.state as { from?: { pathname?: string; search?: string } })?.from;
            if (redirectTo) {
              const targetPath = typeof redirectTo === 'string'
                ? redirectTo
                : `${redirectTo.pathname || ''}${redirectTo.search || ''}`.replace(/^\/+/, '/') || '/client/dashboard';
              if (targetPath.startsWith('/') && !targetPath.startsWith('//')) {
                navigate(targetPath, { replace: true });
                return;
              }
            }

            // User is fully set up, redirect to appropriate dashboard
            const dashboardRoute = getDashboardRoute({ userProfile: profile });
            navigate(dashboardRoute, { replace: true });
          } else {
            // No profile found, redirect to role selection
            navigate('/auth/role-selection', { replace: true });
          }
        }, 500); // Small delay to allow AuthContext to update
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
      setLoading(false);
    }
    // Note: Don't set loading to false here if redirect is happening
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const redirectParam = searchParams.get('redirect');
      const fromPath = (location.state as { from?: { pathname?: string; search?: string } })?.from;
      const redirectTo = redirectParam ?? (fromPath ? `${fromPath.pathname || ''}${fromPath.search || ''}` : null);
      const callbackBase = `${window.location.origin}/auth/callback`;
      const callbackUrl = redirectTo
        ? `${callbackBase}?redirect=${encodeURIComponent(typeof redirectTo === 'string' ? redirectTo : `${redirectTo.pathname || ''}${redirectTo.search || ''}`)}`
        : callbackBase;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl,
          queryParams: {
            prompt: 'select_account', // Force account selection instead of using cached account
          },
        }
      });

      if (error) {
        toast.error(`OAuth error: ${error.message}`);
        setLoading(false);
        return;
      }
      // Don't set loading to false here as the user will be redirected
    } catch (error) {
      toast.error("OAuth authentication failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-0 top-0"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <CardTitle className="text-2xl">Welcome to TheraMate.</CardTitle>
          <CardDescription>
            Sign in to your account
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Google OAuth Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or sign in with email
              </span>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Error Message */}
            {errorMessage && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="link"
                className="p-0 h-auto text-sm text-muted-foreground"
                asChild
              >
                <Link to="/booking/find">Find my booking</Link>
              </Button>
              <Button
                type="button"
                variant="link"
                className="p-0 h-auto text-sm"
                asChild
              >
                <Link to="/reset-password">
                  Forgot password?
                </Link>
              </Button>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <Button
              variant="link"
              className="p-0 h-auto font-normal"
              onClick={() => {
                const redirectParam = searchParams.get('redirect');
                const emailParam = email ? `email=${encodeURIComponent(email)}` : '';
                const redirectQuery = redirectParam ? `redirect=${encodeURIComponent(redirectParam)}` : '';
                const query = [emailParam, redirectQuery].filter(Boolean).join('&');
                navigate(query ? `/register?${query}` : '/register');
              }}
            >
              Sign up
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;