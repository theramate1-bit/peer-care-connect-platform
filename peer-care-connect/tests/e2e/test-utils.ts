/**
 * E2E-only helpers (no Jest). Used by Playwright specs.
 */
export const TestStateGenerator = {
  generateRoleState(role: string, nonce: string): string {
    return JSON.stringify({ role, nonce });
  },
  generateExpiredState(opts: { role?: string; nonce?: string }): string {
    return JSON.stringify({ role: opts.role ?? 'client', nonce: opts.nonce ?? 'test', exp: 0 });
  },
  generateTamperedState(opts: { role?: string; nonce?: string }): string {
    return 'tampered-' + JSON.stringify(opts);
  },
};

export const MockGoogleOAuth = {
  generateMockIdToken(payload: { email?: string; sub?: string; name?: string }): string {
    return btoa(
      JSON.stringify({
        header: { alg: 'RS256' },
        payload: { email: payload.email ?? '', sub: payload.sub ?? '', name: payload.name ?? '' },
        signature: 'sig',
      })
    );
  },
};
