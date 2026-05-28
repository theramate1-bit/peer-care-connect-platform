#!/usr/bin/env node

/**
 * OAuth Authentication Fix Script
 * 
 * This script addresses the issue where Google OAuth authorization
 * doesn't reflect properly after the user completes the OAuth flow.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 OAuth Authentication Fix Script');
console.log('==================================\n');

// 1. Fix AuthCallback Component - Add better session handling
console.log('1️⃣ Fixing AuthCallback Component...');

const authCallbackPath = path.join(__dirname, 'src/components/auth/AuthCallback.tsx');
const authCallbackContent = `import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { RoleManager, isValidRole } from "@/lib/role-management";

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, session } = useAuth();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("Processing authentication...");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('🔄 AuthCallback: Processing auth callback...');
        console.log('🔄 AuthCallback: Current URL:', window.location.href);
        console.log('🔄 AuthCallback: User:', user?.email);
        console.log('🔄 AuthCallback: Session:', !!session);
        console.log('🔄 AuthCallback: Loading:', loading);
        
        // Wait for auth to finish loading
        if (loading) {
          console.log('🔄 Auth still loading, waiting...');
          setStatus("Loading authentication...");
          return;
        }

        // Check if we have a session but no user (OAuth callback scenario)
        if (session && !user) {
          console.log('🔄 Session exists but no user yet, waiting for user to be set...');
          setStatus("Processing OAuth session...");
          return;
        }

        if (!user) {
          console.log('❌ No user found, redirecting to login');
          setError('Authentication failed. Please try again.');
          setTimeout(() => navigate('/login', { replace: true }), 2000);
          return;
        }

        console.log('✅ User authenticated:', user.email);
        setStatus("User authenticated, checking profile...");

        // Check if user has a profile
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) {
          console.error('❌ Profile fetch error:', profileError);
          setError(\`Database error: \${profileError.message}\`);
          setTimeout(() => navigate('/login', { replace: true }), 3000);
          return;
        }

        // If no profile exists, create one manually (fallback)
        if (!profile) {
          console.log('👤 No profile found, creating one manually...');
          setStatus("Creating user profile...");
          
          // Extract name information from OAuth metadata
          const firstName = user.user_metadata?.first_name || 
                           user.user_metadata?.given_name || 
                           user.user_metadata?.name?.split(' ')[0] || 
                           'User';
          
          const lastName = user.user_metadata?.last_name || 
                          user.user_metadata?.family_name || 
                          user.user_metadata?.name?.split(' ').slice(1).join(' ') || 
                          '';
          
          console.log('👤 Creating profile with:', { firstName, lastName, email: user.email });
          
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              id: user.id,
              email: user.email || '',
              first_name: firstName,
              last_name: lastName,
              onboarding_status: 'pending',
              profile_completed: false,
              is_verified: true,
              is_active: true,
            });

          if (insertError) {
            console.error('❌ Profile creation error:', insertError);
            setError(\`Failed to create profile: \${insertError.message}\`);
            setTimeout(() => navigate('/login', { replace: true }), 3000);
            return;
          }

          console.log('✅ Profile created successfully');
        }

        // Get the intended role from session storage
        setStatus("Checking intended role...");
        const intendedRole = RoleManager.consumePendingRole();
        console.log('🎯 Consumed intended role:', intendedRole);

        // Fetch the profile again to get the latest data
        const { data: updatedProfile, error: updatedProfileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (updatedProfileError) {
          console.error('❌ Updated profile fetch error:', updatedProfileError);
          setError(\`Database error: \${updatedProfileError.message}\`);
          setTimeout(() => navigate('/login', { replace: true }), 3000);
          return;
        }

        // Assign the intended role if we have one and user doesn't have a role yet
        if (intendedRole && isValidRole(intendedRole) && !updatedProfile.user_role) {
          console.log('🎯 Assigning intended role:', intendedRole);
          setStatus(\`Assigning role: \${intendedRole}...\`);
          
          const success = await RoleManager.assignRole(user.id, intendedRole);
          
          if (!success) {
            console.error('❌ Failed to assign role');
            setError('Failed to assign user role. Please try again.');
            setTimeout(() => navigate('/auth/role-selection', { replace: true }), 3000);
            return;
          } else {
            console.log('✅ Role assigned successfully');
            setStatus("Role assigned successfully!");
          }
        }

        // Fetch the profile one more time to get the updated role
        const { data: finalProfile, error: finalProfileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (finalProfileError) {
          console.error('❌ Final profile fetch error:', finalProfileError);
          setError(\`Database error: \${finalProfileError.message}\`);
          setTimeout(() => navigate('/login', { replace: true }), 3000);
          return;
        }

        console.log('👤 Final profile:', { 
          user_role: finalProfile.user_role, 
          onboarding_status: finalProfile.onboarding_status,
          profile_completed: finalProfile.profile_completed
        });

        // Clear ALL role state sources to prevent conflicts
        RoleManager.clearAllRoleState();

        // Check if user needs role selection
        if (!finalProfile.user_role) {
          console.log('🔗 User needs role selection');
          setStatus("Redirecting to role selection...");
          setTimeout(() => navigate('/auth/role-selection', { replace: true }), 1000);
          return;
        }

        // Check if user needs onboarding
        if (finalProfile.onboarding_status !== 'completed' && !finalProfile.profile_completed) {
          console.log('🔄 User needs onboarding');
          setStatus("Redirecting to onboarding...");
          setTimeout(() => navigate('/onboarding', { replace: true }), 1000);
          return;
        }

        // User has completed everything, redirect to appropriate dashboard
        const userRole = finalProfile.user_role;
        console.log('✅ User has completed setup, redirecting to dashboard for role:', userRole);
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
        console.error('❌ Auth callback error:', error);
        setError(\`Authentication failed: \${error instanceof Error ? error.message : 'Unknown error'}\`);
        setIsProcessing(false);
      }
    };

    handleCallback();
  }, [user, loading, session, navigate]);

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
            <button 
              onClick={() => navigate('/auth/role-selection')}
              className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
            >
              Select Role Manually
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center p-4">
      <div className="text-center max-w-md mx-auto">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-6"></div>
        <h2 className="text-2xl font-semibold mb-4">Completing Authentication</h2>
        <p className="text-muted-foreground mb-4">{status}</p>
        <div className="bg-white/50 rounded-lg p-4 text-sm text-muted-foreground">
          <p>Setting up your account...</p>
          <p>This may take a few moments.</p>
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;
`;

fs.writeFileSync(authCallbackPath, authCallbackContent);
console.log('✅ AuthCallback component updated with better session handling');

console.log('\n🎉 OAuth Authentication Fix Complete!');
console.log('=====================================');
console.log('✅ Fixed AuthCallback component with better session handling');
console.log('✅ Enhanced session state management');
console.log('✅ Added comprehensive error handling and logging');
console.log('');
console.log('The main issues that were fixed:');
console.log('1. Session State Management: AuthCallback now properly waits for session');
console.log('2. OAuth Callback Handling: Better handling of OAuth callback scenarios');
console.log('3. Error Handling: Improved error messages and fallback mechanisms');
console.log('4. Debugging: Enhanced logging for troubleshooting');
console.log('');
console.log('To test the fixes:');
console.log('1. Start dev server: npm run dev');
console.log('2. Test Google OAuth sign-up');
console.log('3. Check browser console for detailed logs');
console.log('');
console.log('The OAuth authentication should now properly reflect after Google authorization!');
