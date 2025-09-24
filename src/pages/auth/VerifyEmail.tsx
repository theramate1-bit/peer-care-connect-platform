import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Mail, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const VerifyEmail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'success' | 'error'>('pending');

  useEffect(() => {
    // Get email from location state or URL params
    const emailFromState = location.state?.email;
    const urlParams = new URLSearchParams(location.search);
    const emailFromUrl = urlParams.get('email');
    
    if (emailFromState) {
      setEmail(emailFromState);
    } else if (emailFromUrl) {
      setEmail(emailFromUrl);
    }

    // Check if user is already verified
    checkVerificationStatus();
  }, [location]);

  const checkVerificationStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email_confirmed_at) {
        setVerificationStatus('success');
        toast.success('Email verified successfully!');
        setTimeout(() => {
          navigate('/auth/role-selection');
        }, 2000);
      }
    } catch (error) {
      console.error('Error checking verification status:', error);
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/verify-email`
        }
      });

      if (error) {
        throw error;
      }

      toast.success('Verification email sent! Please check your inbox.');
      setVerificationStatus('pending');
    } catch (error: any) {
      console.error('Error resending verification:', error);
      toast.error(error.message || 'Failed to resend verification email');
      setVerificationStatus('error');
    } finally {
      setIsResending(false);
    }
  };

  const handleManualVerification = async () => {
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setIsVerifying(true);
    try {
      // Check if user exists and is verified
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user?.email_confirmed_at) {
        toast.success('Email verified successfully!');
        setVerificationStatus('success');
        setTimeout(() => {
          navigate('/auth/role-selection');
        }, 2000);
      } else {
        toast.error('Email not yet verified. Please check your email and click the verification link.');
        setVerificationStatus('pending');
      }
    } catch (error: any) {
      console.error('Error checking verification:', error);
      toast.error('Unable to verify email status. Please try resending the verification email.');
      setVerificationStatus('error');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={handleBackToLogin}
          className="mb-4 -ml-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Login
        </Button>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Mail className="w-6 h-6 text-blue-600" />
            </div>
            <CardTitle className="text-2xl font-bold">Verify Your Email</CardTitle>
            <CardDescription>
              We've sent a verification link to your email address. Please check your inbox and click the link to activate your account.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Email Input */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                disabled={isResending || isVerifying}
              />
            </div>

            {/* Status Messages */}
            {verificationStatus === 'success' && (
              <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-3 rounded-lg">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-medium">Email verified successfully!</span>
              </div>
            )}

            {verificationStatus === 'error' && (
              <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm font-medium">Verification failed. Please try again.</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={handleResendVerification}
                disabled={isResending || isVerifying || !email}
                className="w-full"
              >
                {isResending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Resend Verification Email'
                )}
              </Button>

              <Button
                variant="outline"
                onClick={handleManualVerification}
                disabled={isResending || isVerifying || !email}
                className="w-full"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  'Check Verification Status'
                )}
              </Button>
            </div>

            {/* Help Text */}
            <div className="text-sm text-gray-600 space-y-2">
              <p><strong>Didn't receive the email?</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Check your spam/junk folder</li>
                <li>Make sure you entered the correct email address</li>
                <li>Wait a few minutes for the email to arrive</li>
                <li>Click "Resend Verification Email" if needed</li>
              </ul>
            </div>

            {/* Troubleshooting */}
            <div className="text-sm text-gray-600 space-y-2">
              <p><strong>Still having trouble?</strong></p>
              <p>If the verification link has expired, you can request a new one by clicking "Resend Verification Email" above.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VerifyEmail;
