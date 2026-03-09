import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ResetPasswordConfirm = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);

  useEffect(() => {
    const checkToken = async () => {
      // First, check if we already have a valid session (set by UrlFragmentHandler)
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        console.log('✅ Valid session found, allowing password reset');
        setIsValidToken(true);
        return;
      }

      // Check for token_hash from route state (from RouteGuard)
      const token_hash = location.state?.token_hash;
      const type = location.state?.type;
      
      // Check for access_token/refresh_token in URL fragment (from hash)
      const hash = window.location.hash;
      let accessToken: string | null = null;
      let refreshToken: string | null = null;
      
      if (hash) {
        const urlParams = new URLSearchParams(hash.substring(1));
        accessToken = urlParams.get('access_token');
        refreshToken = urlParams.get('refresh_token');
      }
      
      // Also check query parameters (fallback)
      if (!accessToken) {
        accessToken = searchParams.get('access_token');
        refreshToken = searchParams.get('refresh_token');
      }
      
      console.log('🔍 Checking reset tokens:', { 
        token_hash: !!token_hash, 
        type, 
        accessToken: !!accessToken, 
        refreshToken: !!refreshToken,
        hasSession: !!session
      });
      
      // Check for code parameter in query string (Supabase sends this format)
      const codeParam = searchParams.get('code');
      const typeParam = searchParams.get('type');
      
      if (codeParam && typeParam === 'recovery') {
        // Handle password reset code from query string
        console.log('🔄 Processing password reset code from query string...');
        try {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: codeParam,
            type: 'recovery'
          });

          if (error) {
            console.error('❌ Token hash validation error:', error);
            toast.error('Invalid or expired reset link. Please request a new one.');
            navigate('/reset-password');
          } else {
            console.log('✅ Reset token hash validated successfully');
            setIsValidToken(true);
          }
        } catch (error) {
          console.error('❌ Token hash validation error:', error);
          toast.error('Invalid or expired reset link. Please request a new one.');
          navigate('/reset-password');
        }
      } else if (token_hash && type) {
        // Handle password reset token hash from route state
        console.log('🔄 Processing password reset token hash from state...');
        try {
          const { error } = await supabase.auth.verifyOtp({
            token_hash,
            type: type as any
          });

          if (error) {
            console.error('❌ Token hash validation error:', error);
            toast.error('Invalid or expired reset link. Please request a new one.');
            navigate('/reset-password');
          } else {
            console.log('✅ Reset token hash validated successfully');
            setIsValidToken(true);
          }
        } catch (error) {
          console.error('❌ Token hash validation error:', error);
          toast.error('Invalid or expired reset link. Please request a new one.');
          navigate('/reset-password');
        }
      } else if (accessToken && refreshToken) {
        // Handle session tokens
        console.log('🔄 Processing session tokens...');
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          console.error('❌ Token validation error:', error);
          toast.error('Invalid or expired reset link. Please request a new one.');
          navigate('/reset-password');
        } else {
          console.log('✅ Reset token validated successfully');
          setIsValidToken(true);
        }
      } else {
        console.log('❌ No valid reset parameters found');
        toast.error('Invalid reset link. Please request a new one.');
        navigate('/reset-password');
      }
    };

    checkToken();
  }, [searchParams, location.state, navigate]);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        console.error('❌ Password update error:', error);
        toast.error('Failed to update password. Please try again.');
      } else {
        console.log('✅ Password updated successfully');
        
        // Sign out user after password reset (security best practice)
        // This ensures user must sign in with new password and prevents redirect loops
        await supabase.auth.signOut();
        
        toast.success('Password updated successfully! Please sign in with your new password.');
        navigate('/login');
      }
    } catch (error) {
      console.error('❌ Password update error:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isValidToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-wellness-50 to-wellness-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Validating Reset Link</h2>
              <p className="text-muted-foreground">Please wait while we validate your reset link...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-wellness-50 to-wellness-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl font-semibold">Set New Password</CardTitle>
          <CardDescription>
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-wellness-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your new password"
                  className="pl-10 pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-3 h-4 w-4 text-wellness-400 hover:text-wellness-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-wellness-400" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your new password"
                  className="pl-10 pr-10"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-3 h-4 w-4 text-wellness-400 hover:text-wellness-600"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Password must be at least 6 characters long.
              </AlertDescription>
            </Alert>
            
            <Button 
              type="submit"
              className="w-full"
              disabled={isLoading || !password || !confirmPassword}
            >
              {isLoading ? "Updating Password..." : "Update Password"}
            </Button>
          </form>
          
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Remember your password?{" "}
              <Button variant="link" className="p-0 h-auto" onClick={() => navigate('/login')}>
                Sign in
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPasswordConfirm;
