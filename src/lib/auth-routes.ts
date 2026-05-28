/** Routes that never require session or profile to render. */
export const PUBLIC_PATHS = [
  '/',
  '/marketplace',
  '/explore',
  '/how-it-works',
  '/pricing',
  '/about',
  '/contact',
  '/help',
  '/terms',
  '/privacy',
  '/cookies',
  '/dpa',
  '/dpa/',
  '/subprocessors',
  '/subprocessors/',
  '/booking-success',
  '/mobile-booking/success',
  '/guest/mobile-requests',
  '/booking/find',
  '/review',
  '/pricing',
] as const;

export const AUTH_PATH_PREFIXES = [
  '/login',
  '/register',
  '/reset-password',
  '/auth/verify-email',
  '/auth/reset-password-confirm',
  '/auth/registration-success',
  '/auth/role-selection',
  '/auth/callback',
  '/auth/oauth-completion',
  '/onboarding',
] as const;

/** OAuth/session handoff — must render before profile row is loaded. */
export const PROFILE_OPTIONAL_AUTH_PATHS = ['/auth/callback', '/auth/oauth-completion'] as const;

export function isProfileOptionalAuthPath(pathname: string): boolean {
  return PROFILE_OPTIONAL_AUTH_PATHS.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export const SETUP_PATH_PREFIXES = ['/onboarding', '/auth/role-selection', '/profile'] as const;

export function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname as (typeof PUBLIC_PATHS)[number])) return true;
  if (/^\/therapist\/[^/]+\/public\/?$/.test(pathname)) return true;
  if (pathname.startsWith('/therapist/') && pathname.includes('/public')) return true;
  if (/^\/book\/[^/]+\/?$/.test(pathname)) return true;
  if (/^\/booking\/view\/[^/]+\/?$/.test(pathname)) return true;
  return false;
}

export function isAuthPath(pathname: string): boolean {
  return AUTH_PATH_PREFIXES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export function isSetupPath(pathname: string): boolean {
  return SETUP_PATH_PREFIXES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}
