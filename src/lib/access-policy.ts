/**
 * Single access policy for AuthRouter and SimpleProtectedRoute.
 * Session = Supabase Auth; authorization = profile (+ subscription in route guard).
 */

import type { User } from '@supabase/supabase-js';
import {
  isAuthPath,
  isProfileOptionalAuthPath,
  isPublicPath,
  isSetupPath,
} from '@/lib/auth-routes';
import {
  getDashboardRoute,
  shouldRedirectToOnboarding,
  type UserProfile as RoutingProfile,
} from '@/lib/dashboard-routing';

export type AccessProfile = RoutingProfile & {
  user_role: RoutingProfile['user_role'] | null;
  onboarding_status: RoutingProfile['onboarding_status'] | 'role_selected' | 'pending' | 'in_progress' | 'completed';
};

export type AccessDecision =
  | { action: 'allow' }
  | { action: 'redirect'; to: string; replace?: boolean }
  | { action: 'wait'; reason: 'session' | 'profile' | 'subscription' }
  | { action: 'session_stuck' };

/** Client-only area — practitioners must not enter. */
const CLIENT_AREA_PREFIX = '/client/';

/** Practitioner-only top-level areas — clients must not enter. */
const PRACTITIONER_ONLY_PREFIXES = ['/dashboard', '/practice', '/cpd', '/analytics', '/booking', '/credits'];

const UNIVERSAL_ROUTE_PREFIXES = [
  '/profile',
  '/client/profile',
  '/auth/callback',
  '/auth/oauth-completion',
  '/auth/role-selection',
  '/messages',
];

const PRACTITIONER_ROLES = ['sports_therapist', 'massage_therapist', 'osteopath'] as const;

export interface ResolveAccessInput {
  pathname: string;
  search: string;
  hash: string;
  loading: boolean;
  sessionStuck: boolean;
  user: User | null;
  userProfile: AccessProfile | null;
}

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isOAuthHomeRedirect(pathname: string, search: string): string | null {
  const params = new URLSearchParams(search);
  if (params.has('code') && pathname === '/' && !params.has('type')) {
    return `/auth/callback${search ? `?${params.toString()}` : ''}`;
  }
  if (params.has('code') && pathname === '/' && params.get('type') === 'recovery') {
    return '/auth/reset-password-confirm';
  }
  return null;
}

function isHashAuthFragment(hash: string): boolean {
  return hash.includes('access_token') || hash.includes('error');
}

function canStayWithoutProfile(pathname: string): boolean {
  return (
    isSetupPath(pathname) ||
    isAuthPath(pathname) ||
    isProfileOptionalAuthPath(pathname) ||
    pathname === '/login' ||
    pathname === '/register'
  );
}

/** Split redirect into pathname (policy) and suffix (?query/#hash) to preserve. */
function splitRedirectPath(raw: string): { pathname: string; suffix: string } {
  const trimmed = raw.trim();
  const q = trimmed.indexOf('?');
  const h = trimmed.indexOf('#');
  const cut =
    q >= 0 && h >= 0 ? Math.min(q, h) : q >= 0 ? q : h >= 0 ? h : trimmed.length;
  return {
    pathname: trimmed.slice(0, cut) || '/',
    suffix: trimmed.slice(cut),
  };
}

/**
 * Returns a safe path for post-login redirect, or null to fall back to home.
 * Uses resolveAccess so ?redirect= cannot bypass role/onboarding rules.
 */
export function resolveSafeRedirectTarget(
  userProfile: AccessProfile,
  rawPath: string
): string | null {
  const { pathname, suffix } = splitRedirectPath(rawPath);
  if (!pathname.startsWith('/') || pathname.startsWith('//')) {
    return null;
  }

  const decision = resolveAccess({
    pathname,
    search: '',
    hash: '',
    loading: false,
    sessionStuck: false,
    user: { id: userProfile.id } as User,
    userProfile,
  });

  if (decision.action === 'allow') {
    return `${pathname}${suffix}`;
  }
  if (decision.action === 'redirect') {
    return decision.to;
  }
  return null;
}

function homeForProfile(profile: AccessProfile): string {
  return getDashboardRoute({ userProfile: profile as RoutingProfile });
}

function isPractitionerOnlyPath(pathname: string): boolean {
  return PRACTITIONER_ONLY_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

function isClientAreaPath(pathname: string): boolean {
  return pathname === '/client' || pathname.startsWith(CLIENT_AREA_PREFIX);
}

/**
 * Post-login / post-OAuth redirect target (respects ?redirect= and router state.from).
 */
export function getPostAuthRedirectPath(
  userProfile: AccessProfile,
  options?: {
    redirectParam?: string | null;
    fromPath?: string | null;
  }
): string {
  if (!userProfile.user_role) {
    return '/auth/role-selection';
  }
  if (shouldRedirectToOnboarding(userProfile as RoutingProfile)) {
    return '/onboarding';
  }

  const explicit = options?.redirectParam?.trim() || options?.fromPath?.trim();
  if (explicit) {
    const safe = resolveSafeRedirectTarget(userProfile, explicit);
    if (safe) {
      return safe;
    }
  }

  return homeForProfile(userProfile);
}

function redirectUnlessHere(pathname: string, to: string, replace = true): AccessDecision {
  if (pathname === to || pathname.startsWith(`${to}/`)) {
    return { action: 'allow' };
  }
  return { action: 'redirect', to, replace };
}

/**
 * Global navigation policy (AuthRouter). Does not check subscription — use resolveRouteGuard for that.
 */
export function resolveAccess(input: ResolveAccessInput): AccessDecision {
  const { pathname, search, hash, loading, sessionStuck, user, userProfile } = input;

  const oauthTarget = isOAuthHomeRedirect(pathname, search);
  if (oauthTarget) {
    return { action: 'redirect', to: oauthTarget, replace: true };
  }

  if (isHashAuthFragment(hash)) {
    return { action: 'allow' };
  }

  if (isPublicPath(pathname)) {
    return { action: 'allow' };
  }

  if (loading && !sessionStuck && !isSetupPath(pathname)) {
    return { action: 'wait', reason: 'session' };
  }

  if (sessionStuck) {
    return { action: 'session_stuck' };
  }

  if (!user) {
    if (isAuthPath(pathname) || pathname === '/login' || pathname === '/register') {
      return { action: 'allow' };
    }
    return redirectUnlessHere(pathname, '/login');
  }

  if (!userProfile) {
    if (canStayWithoutProfile(pathname)) {
      return { action: 'allow' };
    }
    return { action: 'wait', reason: 'profile' };
  }

  if (pathname === '/login' || pathname === '/register') {
    if (!userProfile.user_role) {
      return redirectUnlessHere(pathname, '/auth/role-selection');
    }
    if (shouldRedirectToOnboarding(userProfile as RoutingProfile)) {
      return redirectUnlessHere(pathname, '/onboarding');
    }
    return redirectUnlessHere(pathname, homeForProfile(userProfile));
  }

  if (!userProfile.user_role) {
    return redirectUnlessHere(pathname, '/auth/role-selection');
  }

  if (pathname === '/auth/role-selection') {
    return { action: 'allow' };
  }

  if (shouldRedirectToOnboarding(userProfile as RoutingProfile)) {
    return redirectUnlessHere(pathname, '/onboarding');
  }

  if (matchesPrefix(pathname, UNIVERSAL_ROUTE_PREFIXES)) {
    return { action: 'allow' };
  }

  const role = userProfile.user_role;

  if (role === 'client') {
    if (isClientAreaPath(pathname) || matchesPrefix(pathname, UNIVERSAL_ROUTE_PREFIXES)) {
      return { action: 'allow' };
    }
    if (isPractitionerOnlyPath(pathname)) {
      return redirectUnlessHere(pathname, '/client/dashboard');
    }
    if (!isPublicPath(pathname) && !isAuthPath(pathname)) {
      return redirectUnlessHere(pathname, '/client/dashboard');
    }
    return { action: 'allow' };
  }

  if (PRACTITIONER_ROLES.includes(role as (typeof PRACTITIONER_ROLES)[number])) {
    if (isClientAreaPath(pathname) || pathname.startsWith('/admin/')) {
      return redirectUnlessHere(pathname, '/dashboard');
    }
    return { action: 'allow' };
  }

  if (role === 'admin') {
    if (pathname.startsWith('/admin/')) {
      return { action: 'allow' };
    }
    if (isClientAreaPath(pathname) || isPractitionerOnlyPath(pathname)) {
      return redirectUnlessHere(pathname, '/admin/verification');
    }
    if (!isPublicPath(pathname) && !isAuthPath(pathname)) {
      return redirectUnlessHere(pathname, '/admin/verification');
    }
    return { action: 'allow' };
  }

  if (isPublicPath(pathname) || isAuthPath(pathname)) {
    return { action: 'allow' };
  }

  return redirectUnlessHere(pathname, homeForProfile(userProfile));
}

export interface RouteGuardInput {
  pathname: string;
  user: User | null;
  userProfile: AccessProfile | null;
  authLoading: boolean;
  requireSubscription: boolean;
  subscribed: boolean;
  subscriptionLoading: boolean;
}

/**
 * Per-route guard (SimpleProtectedRoute): onboarding + optional subscription.
 */
export function resolveRouteGuard(input: RouteGuardInput): AccessDecision {
  const {
    pathname,
    user,
    userProfile,
    authLoading,
    requireSubscription,
    subscribed,
    subscriptionLoading,
  } = input;

  if (authLoading || !user) {
    return { action: 'allow' };
  }

  if (!userProfile) {
    return { action: 'wait', reason: 'profile' };
  }

  if (shouldRedirectToOnboarding(userProfile as RoutingProfile)) {
    const onSetup =
      pathname === '/onboarding' ||
      pathname.startsWith('/onboarding/') ||
      pathname === '/auth/role-selection';
    if (!onSetup) {
      return { action: 'redirect', to: '/onboarding' };
    }
    return { action: 'allow' };
  }

  if (!requireSubscription || !userProfile.user_role) {
    return { action: 'allow' };
  }

  const isPractitioner = PRACTITIONER_ROLES.includes(
    userProfile.user_role as (typeof PRACTITIONER_ROLES)[number]
  );

  if (subscriptionLoading) {
    return { action: 'wait', reason: 'subscription' };
  }

  if (isPractitioner && !subscribed) {
    return { action: 'redirect', to: '/pricing' };
  }

  if (!isPractitioner && !subscribed) {
    return { action: 'redirect', to: '/pricing' };
  }

  return { action: 'allow' };
}

/** Legacy helper — prefer resolveAccess(). */
export function canAccessRoute(userProfile: AccessProfile | null, route: string): boolean {
  if (!userProfile) return false;
  const decision = resolveAccess({
    pathname: route,
    search: '',
    hash: '',
    loading: false,
    sessionStuck: false,
    user: { id: userProfile.id } as User,
    userProfile,
  });
  return decision.action === 'allow';
}
