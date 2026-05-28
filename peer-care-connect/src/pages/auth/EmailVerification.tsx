import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Mail, ArrowRight, RefreshCw, AlertTriangle, LogIn } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from "sonner";

const EmailVerification = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { signUp } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired' | 'pending'>('loading');
  const [email, setEmail] = useState<string>('');
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState<string>('');

  // Get email from location state (passed from registration)
  useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email);
      setMessage(location.state.message || '');
      setStatus('pending');
    }
    
    // Handle error state from URL fragment handler
    if (location.state?.error) {
      setStatus('error');
      setMessage(location.state.message || location.state.error);
      
      // Pre-fill email if provided in error state
      if (location.state.email) {
        setEmail(location.state.email);
      }
    }
  }, [location.state]);

  useEffect(() => {
    const handleEmailVerification = async () => {
      const token = searchParams.get('token');
      const token_hash = searchParams.get('token_hash');
      const type = searchParams.get('type');
      const emailParam = searchParams.get('email');

      console.log('🔍 Verification params:', { token, token_hash, type, emailParam });

      if (emailParam) {
        setEmail(emailParam);
      }

      // Handle both token and token_hash formats
      const verificationToken = token_hash || token;
      
      if (type === 'signup' && verificationToken) {
        console.log('🔄 Processing verification token...');
        try {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: verificationToken,
            type: 'email'
          });

          if (error) {
            console.error('❌ Verification error:', error);
            if (error.message.includes('expired') || error.message.includes('invalid')) {
              setStatus('expired');
              toast.error('Verification link has expired. Please request a new one.');
            } else {
              setStatus('error');
              toast.error('Verification failed. Please try again.');
            }
          } else {
            console.log('✅ Verification successful!');
            setStatus('success');
            toast.success('Email verified successfully! Setting up your account...');
            // Redirect to callback after a short delay to process the session
            setTimeout(() => {
              navigate('/auth/callback');
            }, 2000);
          }
        } catch (error) {
          console.error('❌ Verification error:', error);
          setStatus('error');
          toast.error('Verification failed. Please try again.');
        }
      } else {
        console.log('⚠️ No token provided, showing pending state');
        // No token provided, show pending state (waiting for email)
        setStatus('pending');
        
        // Check if user is already verified but still on this page
        // This can happen if email confirmations are disabled in Supabase
        const checkUserStatus = async () => {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user && user.email_confirmed_at) {
              console.log('✅ User already verified, checking onboarding status');
              
              // Check if user needs onboarding
              const { data: userProfile } = await supabase
                .from('users')
                .select('onboarding_status, profile_completed')
                .eq('id', user.id)
                .single();
              
              if (userProfile && (userProfile.onboarding_status === 'pending' || userProfile.onboarding_status === 'in_progress' || !userProfile.profile_completed)) {
                console.log('🔄 User needs onboarding, redirecting to onboarding');
                toast.success('Email verified! Please complete your profile setup...');
                setTimeout(() => {
                  navigate('/onboarding');
                }, 2000);
              } else {
                console.log('✅ User fully set up, redirecting to callback');
                toast.success('Email verified! Redirecting to your dashboard...');
                setTimeout(() => {
                  navigate('/auth/callback');
                }, 2000);
              }
            }
          } catch (error) {
            console.log('🔍 No user session found, showing pending state');
          }
        };
        
        checkUserStatus();
      }
    };

    handleEmailVerification();
  }, [searchParams, navigate]);

  const handleResendVerification = async () => {
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/verify-email`
        }
      });

      if (error) {
        console.error('Resend verification error:', error);
        
        // Handle specific error types
        if (error.message.includes('rate limit') || error.message.includes('too many')) {
          toast.error('Too many requests. Please wait a few minutes before requesting another email.');
          setStatus('error');
          setMessage('Rate limit exceeded. Please wait before requesting another verification email.');
        } else if (error.message.includes('already confirmed') || error.message.includes('already verified')) {
          toast.success('Email is already verified! You can now sign in.');
          setStatus('success');
          setTimeout(() => {
            navigate('/login', { state: { email } });
          }, 2000);
        } else if (error.message.includes('already registered') || error.message.includes('User already registered')) {
          // User exists but might be unverified - try to sign in instead
          toast.info('This email is already registered. Please try signing in instead.');
          setTimeout(() => {
            navigate('/login', { state: { email } });
          }, 2000);
        } else if (error.message.includes('invalid email')) {
          toast.error('Invalid email address. Please check and try again.');
          setStatus('error');
          setMessage('The email address appears to be invalid. Please check and try again.');
        } else {
          toast.error(error.message || 'Failed to resend verification email');
          setStatus('error');
          setMessage('Failed to send verification email. Please try again.');
        }
      } else {
        toast.success('Verification email sent! Please check your inbox and spam folder.');
        setStatus('pending');
        setMessage('We\'ve sent a new verification email. Please check your inbox and spam folder.');
      }
    } catch (error) {
      console.error('Resend verification error:', error);
      toast.error('Network error. Please check your connection and try again.');
      setStatus('error');
      setMessage('Network error occurred. Please check your internet connection and try again.');
    } finally {
      setResending(false);
    }
  };

  const handleGoToLogin = () => {
    navigate('/login');
  };

  const handleGoToRegister = () => {
    navigate('/register');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            {status === 'success' ? (
              <CheckCircle className="w-8 h-8 text-green-600" />
            ) : status === 'error' || status === 'expired' ? (
              <XCircle className="w-8 h-8 text-red-600" />
            ) : (
              <Mail className="w-8 h-8 text-primary" />
            )}
          </div>
          
          <CardTitle className="text-2xl">
            {status === 'success' && 'Email Verified!'}
            {status === 'error' && 'Verification Failed'}
            {status === 'expired' && 'Verification Link Expired'}
            {status === 'pending' && 'Check Your Email'}
            {status === 'loading' && 'Verifying Email...'}
          </CardTitle>
          
          <CardDescription>
            {status === 'success' && 'Your email has been successfully verified. You can now sign in to your account.'}
            {status === 'error' && 'There was an error verifying your email. The link may be invalid or expired.'}
            {status === 'expired' && 'Your verification link has expired. Please request a new one.'}
            {status === 'pending' && (message || 'We\'ve sent a verification email to your inbox. Please check your email and click the verification link.')}
            {status === 'loading' && 'Please wait while we verify your email address...'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Email Input for resending verification */}
          {(status === 'error' || status === 'expired' || status === 'pending') && (
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={resending}
              />
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-3">
              <Badge variant="outline" className="w-full justify-center">
                <CheckCircle className="w-4 h-4 mr-2" />
                Email Verified Successfully
              </Badge>
              <Button 
                onClick={handleGoToLogin}
                className="w-full"
              >
                Sign In to Your Account
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {(status === 'error' || status === 'expired') && (
            <div className="space-y-3">
              <Badge variant="destructive" className="w-full justify-center">
                <XCircle className="w-4 h-4 mr-2" />
                Verification Failed
              </Badge>
              
              <div className="space-y-2">
                <Button 
                  onClick={handleResendVerification}
                  disabled={resending}
                  variant="outline"
                  className="w-full"
                >
                  {resending ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Resend Verification Email
                    </>
                  )}
                </Button>
                
                <Button 
                  onClick={handleGoToRegister}
                  variant="ghost"
                  className="w-full"
                >
                  Back to Registration
                </Button>
                
                <Button 
                  onClick={() => navigate('/login', { state: { email } })}
                  variant="outline"
                  className="w-full"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Try Sign In Instead
                </Button>
                
              </div>
              
              {/* Email Troubleshooting Tips */}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Email Troubleshooting Tips:</h4>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• Check your spam/junk folder</li>
                  <li>• Add noreply@supabase.co to your contacts</li>
                  <li>• Wait 2-3 minutes for delivery</li>
                  <li>• Try a different email address</li>
                  <li>• Contact support if issues persist</li>
                </ul>
              </div>
            </div>
          )}

          {status === 'pending' && (
            <div className="space-y-3">
              <Badge variant="outline" className="w-full justify-center">
                <Mail className="w-4 h-4 mr-2" />
                Verification Email Sent
              </Badge>
              
              
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  We've sent a verification email to:
                </p>
                <p className="font-medium">{email}</p>
              </div>
              
              <div className="space-y-2">
                <Button 
                  onClick={handleResendVerification}
                  disabled={resending}
                  variant="outline"
                  className="w-full"
                >
                  {resending ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Resend Verification Email
                    </>
                  )}
                </Button>
                
                <Button 
                  onClick={handleGoToLogin}
                  variant="ghost"
                  className="w-full"
                >
                  Already verified? Sign In
                </Button>
                
              </div>
            </div>
          )}

          {status === 'loading' && (
            <div className="text-center">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
              <p className="text-sm text-muted-foreground">Verifying your email...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailVerification;
