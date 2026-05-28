import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { resolveAccess, type AccessProfile } from '@/lib/access-policy';
import { isSetupPath } from '@/lib/auth-routes';
import { AuthLoadingShell, SessionStuckShell } from '@/components/auth/AuthLoadingShell';

const SESSION_STUCK_MS = 8_000;
const PROFILE_WAIT_MS = 12_000;

interface AuthRouterProps {
  children: React.ReactNode;
}

const AuthRouter = ({ children }: AuthRouterProps) => {
  const { user, userProfile, loading, profileSyncing } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [redirectCount, setRedirectCount] = useState(0);
  const redirectCountRef = useRef(0);
  const [sessionStuck, setSessionStuck] = useState(false);
  const [profileWaitExceeded, setProfileWaitExceeded] = useState(false);

  const pathname = location.pathname;
  const searchParams = new URLSearchParams(location.search);
  const isSpecialOAuthHome =
    searchParams.has('code') && pathname === '/' && !searchParams.has('type');

  useEffect(() => {
    if (!loading) {
      setSessionStuck(false);
      return;
    }
    const timer = setTimeout(() => setSessionStuck(true), SESSION_STUCK_MS);
    return () => clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    if (userProfile || !user) {
      setProfileWaitExceeded(false);
      return;
    }
    const timer = setTimeout(() => setProfileWaitExceeded(true), PROFILE_WAIT_MS);
    return () => clearTimeout(timer);
  }, [user, userProfile, pathname]);

  const decision = resolveAccess({
    pathname,
    search: location.search,
    hash: location.hash,
    loading,
    sessionStuck,
    user,
    userProfile: userProfile as AccessProfile | null,
  });

  const redirectTo = decision.action === 'redirect' ? decision.to : null;

  useEffect(() => {
    if (redirectCountRef.current > 5) {
      console.error('Too many redirects — stopping');
      return;
    }

    if (!redirectTo) {
      if (decision.action === 'allow') {
        redirectCountRef.current = 0;
        setRedirectCount(0);
      }
      return;
    }

    if (redirectTo === '/auth/reset-password-confirm') {
      redirectCountRef.current += 1;
      setRedirectCount(redirectCountRef.current);
      navigate('/auth/reset-password-confirm', {
        state: {
          token_hash: searchParams.get('code'),
          type: 'recovery',
        },
        replace: true,
      });
      return;
    }

    redirectCountRef.current += 1;
    setRedirectCount(redirectCountRef.current);
    navigate(redirectTo, {
      replace: decision.action === 'redirect' ? decision.replace !== false : true,
      ...(redirectTo === '/login' ? { state: { from: location } } : {}),
    });
  }, [redirectTo, decision.action, navigate, location.pathname, location.search, searchParams]);

  if (decision.action === 'session_stuck') {
    return (
      <SessionStuckShell
        onRetry={() => window.location.reload()}
        onSignIn={() => navigate('/login')}
      />
    );
  }

  if (decision.action === 'wait' && decision.reason === 'session') {
    if (isSpecialOAuthHome || isSetupPath(pathname) || pathname === '/login') {
      return <>{children}</>;
    }
    return <AuthLoadingShell message="Loading…" />;
  }

  if (decision.action === 'wait' && decision.reason === 'profile') {
    if (profileWaitExceeded) {
      return (
        <SessionStuckShell
          onRetry={() => window.location.reload()}
          onSignIn={() => navigate('/login')}
          secondaryLabel="Sign in again"
        />
      );
    }
    const msg = profileSyncing ? 'Syncing your account…' : 'Loading your profile…';
    return <AuthLoadingShell message={msg} />;
  }

  return <>{children}</>;
};

export default AuthRouter;
