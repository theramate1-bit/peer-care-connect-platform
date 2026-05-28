import { getPostAuthRedirectPath, resolveAccess, resolveRouteGuard } from '@/lib/access-policy';

const baseProfile = {
  id: 'u1',
  email: 'a@b.com',
  first_name: 'A',
  last_name: 'B',
  user_role: 'client' as const,
  onboarding_status: 'completed' as const,
  profile_completed: true,
};

describe('resolveAccess', () => {
  it('allows public marketplace without session', () => {
    expect(
      resolveAccess({
        pathname: '/marketplace',
        search: '',
        hash: '',
        loading: false,
        sessionStuck: false,
        user: null,
        userProfile: null,
      })
    ).toEqual({ action: 'allow' });
  });

  it('waits for profile on protected route when signed in without profile', () => {
    expect(
      resolveAccess({
        pathname: '/client/dashboard',
        search: '',
        hash: '',
        loading: false,
        sessionStuck: false,
        user: { id: 'u1' } as never,
        userProfile: null,
      })
    ).toEqual({ action: 'wait', reason: 'profile' });
  });

  it('redirects unauthenticated users to login', () => {
    expect(
      resolveAccess({
        pathname: '/client/dashboard',
        search: '',
        hash: '',
        loading: false,
        sessionStuck: false,
        user: null,
        userProfile: null,
      })
    ).toEqual({ action: 'redirect', to: '/login', replace: true });
  });

  it('allows setup paths without profile', () => {
    expect(
      resolveAccess({
        pathname: '/onboarding',
        search: '',
        hash: '',
        loading: false,
        sessionStuck: false,
        user: { id: 'u1' } as never,
        userProfile: null,
      })
    ).toEqual({ action: 'allow' });
  });
});

describe('resolveAccess practitioner paths', () => {
  it('allows practitioner on /settings without redirect', () => {
    expect(
      resolveAccess({
        pathname: '/settings',
        search: '',
        hash: '',
        loading: false,
        sessionStuck: false,
        user: { id: 'u1' } as never,
        userProfile: {
          ...baseProfile,
          user_role: 'sports_therapist',
          onboarding_status: 'completed',
          profile_completed: true,
        },
      })
    ).toEqual({ action: 'allow' });
  });
});

describe('getPostAuthRedirectPath', () => {
  it('sends admin to verification dashboard', () => {
    expect(
      getPostAuthRedirectPath({
        ...baseProfile,
        user_role: 'admin',
      })
    ).toBe('/admin/verification');
  });

  it('rejects cross-role redirect and uses client home', () => {
    expect(
      getPostAuthRedirectPath(baseProfile, { redirectParam: '/dashboard' })
    ).toBe('/client/dashboard');
  });

  it('allows same-role redirect with query string', () => {
    expect(
      getPostAuthRedirectPath(baseProfile, {
        redirectParam: '/client/booking?tab=upcoming',
      })
    ).toBe('/client/booking?tab=upcoming');
  });
});

describe('profile-optional OAuth paths', () => {
  it('allows /auth/callback without profile', () => {
    expect(
      resolveAccess({
        pathname: '/auth/callback',
        search: '',
        hash: '',
        loading: false,
        sessionStuck: false,
        user: { id: 'u1' } as never,
        userProfile: null,
      })
    ).toEqual({ action: 'allow' });
  });
});

describe('resolveRouteGuard', () => {
  it('redirects incomplete practitioner to onboarding', () => {
    expect(
      resolveRouteGuard({
        pathname: '/dashboard',
        user: { id: 'u1' } as never,
        userProfile: {
          ...baseProfile,
          user_role: 'sports_therapist',
          onboarding_status: 'in_progress',
          profile_completed: false,
        },
        authLoading: false,
        requireSubscription: false,
        subscribed: false,
        subscriptionLoading: false,
      })
    ).toEqual({ action: 'redirect', to: '/onboarding' });
  });
});
