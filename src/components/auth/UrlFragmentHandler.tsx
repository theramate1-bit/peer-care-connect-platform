import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const UrlFragmentHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleUrlFragment = async () => {
      // Check if there's a URL fragment with Supabase auth tokens
      const hash = window.location.hash;
      
      if (hash && (hash.includes('access_token') || hash.includes('error'))) {
        console.log('🔍 Detected Supabase auth tokens or error in URL fragment');
        
        try {
          // Parse the URL fragment to extract tokens or errors
          const urlParams = new URLSearchParams(hash.substring(1));
          const error = urlParams.get('error');
          const errorCode = urlParams.get('error_code');
          const errorDescription = urlParams.get('error_description');
          const accessToken = urlParams.get('access_token');
          const refreshToken = urlParams.get('refresh_token');
          const tokenType = urlParams.get('token_type');
          const expiresIn = urlParams.get('expires_in');
          const type = urlParams.get('type');
          
          // Handle error scenarios first
          if (error) {
            console.log('❌ Auth error detected:', { error, errorCode, errorDescription });
            
            let errorMessage = 'Verification failed. Please try again.';
            let userMessage = 'There was an issue with your verification link.';
            
            if (errorCode === 'otp_expired') {
              errorMessage = 'Verification link has expired';
              userMessage = 'Your verification link has expired. Please request a new verification email.';
            } else if (errorCode === 'access_denied') {
              errorMessage = 'Access denied';
              userMessage = 'Access to verification was denied. Please try again.';
            } else if (errorCode === 'invalid_token') {
              errorMessage = 'Invalid verification link';
              userMessage = 'The verification link appears to be invalid or corrupted. Please request a new verification email.';
            } else if (errorCode === 'token_already_used') {
              errorMessage = 'Link already used';
              userMessage = 'This verification link has already been used. Please request a new verification email if needed.';
            } else if (errorCode === 'rate_limit_exceeded') {
              errorMessage = 'Too many requests';
              userMessage = 'Too many verification requests. Please wait a few minutes before requesting another email.';
            } else if (errorDescription) {
              userMessage = errorDescription.replace(/\+/g, ' ');
            }
            
            navigate('/auth/verify-email', { 
              state: { 
                error: errorMessage,
                message: userMessage
              } 
            });
            return;
          }
          
          console.log('📧 Auth tokens detected:', { 
            type, 
            hasAccessToken: !!accessToken, 
            hasRefreshToken: !!refreshToken 
          });
          
          if (type === 'signup' && accessToken) {
            console.log('🔄 Processing email verification...');
            
            // Set the session using the tokens
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || ''
            });
            
            if (error) {
              console.error('❌ Session error:', error);
              // Redirect to verification page with error
              navigate('/auth/verify-email', { 
                state: { 
                  error: 'Verification failed. Please try again.',
                  message: 'There was an issue verifying your email. Please request a new verification email.'
                } 
              });
              return;
            }
            
            if (data.session?.user) {
              console.log('✅ Email verification successful!');
              console.log('👤 User:', data.session.user.email);
              console.log('📧 Email confirmed:', data.session.user.email_confirmed_at);
              
              // Check if user needs onboarding
              const { data: userProfile } = await supabase
                .from('users')
                .select('onboarding_status, profile_completed, user_role')
                .eq('id', data.session.user.id)
                .single();
              
              if (userProfile && (userProfile.onboarding_status === 'pending' || userProfile.onboarding_status === 'in_progress' || !userProfile.profile_completed)) {
                console.log('🔄 User needs onboarding, redirecting to onboarding');
                navigate('/onboarding', { 
                  state: { 
                    message: 'Email verified! Please complete your profile setup...',
                    userRole: userProfile.user_role
                  } 
                });
              } else {
                console.log('✅ User fully set up, redirecting to callback');
                navigate('/auth/callback');
              }
            }
          } else if (type === 'recovery' && accessToken) {
            console.log('🔄 Processing password reset tokens...');
            
            // Set the session using the tokens for password reset
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || ''
            });
            
            if (error) {
              console.error('❌ Password reset session error:', error);
              navigate('/reset-password', { 
                state: { 
                  error: 'Invalid or expired reset link. Please request a new one.'
                } 
              });
              return;
            }
            
            if (data.session?.user) {
              console.log('✅ Password reset tokens validated successfully');
              // Redirect to password reset confirmation page
              navigate('/auth/reset-password-confirm', { 
                replace: true 
              });
            }
          } else {
            console.log('⚠️ Unexpected token type or missing tokens');
            navigate('/auth/verify-email', { 
              state: { 
                error: 'Invalid verification link',
                message: 'The verification link appears to be invalid. Please request a new one.'
              } 
            });
          }
        } catch (error) {
          console.error('❌ Error processing URL fragment:', error);
          
          let errorMessage = 'Verification failed';
          let userMessage = 'There was an error processing your verification. Please try again.';
          
          if (error instanceof Error) {
            if (error.message.includes('network') || error.message.includes('fetch')) {
              errorMessage = 'Network error';
              userMessage = 'Network connection issue. Please check your internet connection and try again.';
            } else if (error.message.includes('timeout')) {
              errorMessage = 'Request timeout';
              userMessage = 'The request timed out. Please try again.';
            }
          }
          
          navigate('/auth/verify-email', { 
            state: { 
              error: errorMessage,
              message: userMessage,
              email: 'raymancapital@protonmail.com'
            } 
          });
        }
      }
    };

    handleUrlFragment();
  }, [navigate]);

  return null; // This component doesn't render anything
};

export default UrlFragmentHandler;
