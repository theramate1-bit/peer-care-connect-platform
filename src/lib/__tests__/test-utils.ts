/**
 * Test Utilities for TheraMate
 * Centralized test helpers and mock factories
 */

import { UserRole } from '@/types/roles';

export interface TestUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  user_role: UserRole;
  onboarding_status: 'pending' | 'role_selected' | 'in_progress' | 'completed';
  profile_completed: boolean;
  phone?: string;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TestState {
  user: TestUser | null;
  loading: boolean;
  error: string | null;
  timestamp: number;
}

export class TestStateGenerator {
  /**
   * Generates a test state with specific properties
   */
  static generateState(overrides: Partial<TestState> & { role?: string; nonce?: string } = {}): TestState | string {
    if ('role' in overrides || 'nonce' in overrides) {
      return JSON.stringify({ role: (overrides as any).role || 'client', nonce: (overrides as any).nonce || 'test-nonce' });
    }
    return {
      user: null,
      loading: false,
      error: null,
      timestamp: Date.now(),
      ...overrides,
    };
  }

  static verifyState(stateParam: string | null): { role: string } | null {
    if (!stateParam) return null;
    try {
      const parsed = JSON.parse(stateParam);
      if (parsed.exp !== undefined && parsed.exp < Math.floor(Date.now() / 1000)) return null;
      if (parsed.role && parsed.nonce) return { role: parsed.role };
      return null;
    } catch {
      return null;
    }
  }

  static generateTamperedState(opts: { role?: string; nonce?: string }): string {
    return 'tampered-' + JSON.stringify(opts);
  }

  static generateExpiredState(opts: { role?: string; nonce?: string }): string {
    return JSON.stringify({ role: opts.role || 'client', nonce: opts.nonce || 'test', exp: 0 });
  }

  /**
   * Generates a loading state
   */
  static generateLoadingState(): TestState {
    return this.generateState({ loading: true });
  }

  /**
   * Generates an error state
   */
  static generateErrorState(error: string): TestState {
    return this.generateState({ error, loading: false });
  }

  /**
   * Generates a success state with user
   */
  static generateSuccessState(user: TestUser): TestState {
    return this.generateState({ user, loading: false, error: null });
  }
}

export class TestUserFactory {
  /**
   * Creates a test user with default values
   */
  static createUser(overrides: Partial<TestUser> = {}): TestUser {
    const timestamp = Date.now();
    return {
      id: `test-user-${timestamp}`,
      email: `test${timestamp}@example.com`,
      first_name: 'Test',
      last_name: 'User',
      user_role: 'client',
      onboarding_status: 'pending',
      profile_completed: false,
      is_verified: false,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides,
    };
  }

  /**
   * Creates a client user
   */
  static createClient(overrides: Partial<TestUser> = {}): TestUser {
    return this.createUser({
      user_role: 'client',
      onboarding_status: 'completed',
      profile_completed: true,
      ...overrides,
    });
  }

  /**
   * Creates a sports therapist user
   */
  static createSportsTherapist(overrides: Partial<TestUser> = {}): TestUser {
    return this.createUser({
      user_role: 'sports_therapist',
      onboarding_status: 'completed',
      profile_completed: true,
      ...overrides,
    });
  }

  /**
   * Creates a massage therapist user
   */
  static createMassageTherapist(overrides: Partial<TestUser> = {}): TestUser {
    return this.createUser({
      user_role: 'massage_therapist',
      onboarding_status: 'completed',
      profile_completed: true,
      ...overrides,
    });
  }

  /**
   * Creates an osteopath user
   */
  static createOsteopath(overrides: Partial<TestUser> = {}): TestUser {
    return this.createUser({
      user_role: 'osteopath',
      onboarding_status: 'completed',
      profile_completed: true,
      ...overrides,
    });
  }

  /**
   * Creates an admin user
   */
  static createAdmin(overrides: Partial<TestUser> = {}): TestUser {
    return this.createUser({
      user_role: 'admin',
      onboarding_status: 'completed',
      profile_completed: true,
      ...overrides,
    });
  }

  static createTestUser(overrides: Partial<TestUser> = {}): TestUser {
    return this.createUser(overrides);
  }

  static createTestPractitioner(overrides: Partial<TestUser> = {}): TestUser {
    return this.createSportsTherapist(overrides);
  }

  /**
   * Creates a user with incomplete onboarding
   */
  static createIncompleteUser(overrides: Partial<TestUser> = {}): TestUser {
    return this.createUser({
      onboarding_status: 'in_progress',
      profile_completed: false,
      ...overrides,
    });
  }
}

export class MockGoogleOAuth {
  /**
   * Mocks Google OAuth sign-in success
   */
  static mockSignInSuccess(user: TestUser) {
    return {
      data: {
        user: {
          id: user.id,
          email: user.email,
          user_metadata: {
            first_name: user.first_name,
            last_name: user.last_name,
            user_role: user.user_role,
          },
        },
        session: {
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token',
        },
      },
      error: null,
    };
  }

  /**
   * Mocks Google OAuth sign-in error
   */
  static mockSignInError(errorMessage: string) {
    return {
      data: null,
      error: {
        message: errorMessage,
        status: 400,
      },
    };
  }

  /**
   * Mocks Google OAuth callback success
   */
  static mockCallbackSuccess(user: TestUser) {
    return {
      data: {
        user: {
          id: user.id,
          email: user.email,
          user_metadata: {
            first_name: user.first_name,
            last_name: user.last_name,
            user_role: user.user_role,
          },
        },
        session: {
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token',
        },
      },
      error: null,
    };
  }

  static generateMockIdToken(payload: { email?: string; sub?: string; name?: string }): string {
    return btoa(JSON.stringify({ header: { alg: 'RS256' }, payload: { email: payload.email || '', sub: payload.sub || '', name: payload.name || '' }, signature: 'sig' }));
  }

  static generateMockTokenResponse(accessToken: string, idToken: string) {
    return { access_token: accessToken, id_token: idToken, refresh_token: 'refresh', expires_in: 3600 };
  }
}

export class TestDatabaseHelpers {
  /**
   * Mocks Supabase database responses
   */
  static mockSupabaseResponse<T>(data: T | null, error: any = null) {
    return {
      data,
      error,
    };
  }

  /**
   * Mocks a successful database query
   */
  static mockSuccessfulQuery<T>(data: T) {
    return this.mockSupabaseResponse(data, null);
  }

  /**
   * Mocks a failed database query
   */
  static mockFailedQuery(errorMessage: string) {
    return this.mockSupabaseResponse(null, { message: errorMessage });
  }

  static mockError(message: string) {
    return { data: null, error: { message } };
  }

  static mockUserQuery(user: TestUser | null) {
    return { data: user, error: null };
  }

  static mockUserCreation(user: TestUser) {
    return { data: user, error: null };
  }

  static mockUserUpdate(user: TestUser) {
    return { data: user, error: null };
  }

  /** Returns a default chain so tests can do from.mockReturnValueOnce(...).mockReturnValue(TestDatabaseHelpers.getDefaultChain()) */
  static getDefaultChain(responses: Record<string, any> = {}) {
    const chain: Record<string, unknown> = {};
    const thenable = { then: (res: (v: unknown) => void, rej?: (e: unknown) => void) => Promise.resolve([]).then(res, rej), catch: (fn: (e: unknown) => void) => Promise.resolve([]).catch(fn) };
    chain.select = jest.fn(() => chain);
    chain.insert = jest.fn(() => chain);
    chain.update = jest.fn(() => chain);
    chain.delete = jest.fn(() => chain);
    chain.upsert = jest.fn(() => chain);
    chain.eq = jest.fn(() => chain);
    chain.in = jest.fn(() => chain);
    chain.lt = jest.fn(() => chain);
    chain.gt = jest.fn(() => chain);
    chain.single = jest.fn().mockResolvedValue(responses.single ?? { data: null, error: null });
    chain.maybeSingle = jest.fn().mockResolvedValue(responses.maybeSingle ?? { data: null, error: null });
    Object.assign(chain, thenable);
    return chain;
  }

  /**
   * Mocks Supabase client with specific responses
   */
  static createMockSupabaseClient(responses: Record<string, any> = {}) {
    return {
      auth: {
        getUser: jest.fn().mockResolvedValue(responses.getUser || { data: { user: null }, error: null }),
        signInWithOAuth: jest.fn().mockResolvedValue(responses.signInWithOAuth || { data: null, error: null }),
        signOut: jest.fn().mockResolvedValue(responses.signOut || { error: null }),
        onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
      },
      from: jest.fn(() => TestDatabaseHelpers.getDefaultChain(responses)),
      rpc: jest.fn().mockResolvedValue(responses.rpc || { data: null, error: null }),
    };
  }
}

/**
 * Jest matcher extensions for better test assertions
 */
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeTypeOf(expected: string): R;
    }
  }
}

// Custom Jest matcher for type checking
expect.extend({
  toBeTypeOf(received: any, expected: string) {
    const actualType = typeof received;
    const pass = actualType === expected;
    
    return {
      message: () => `expected ${received} to be of type ${expected}, but got ${actualType}`,
      pass,
    };
  },
});

describe('test-utils', () => {
  it('exports TestStateGenerator and matchers', () => {
    expect(TestStateGenerator).toBeDefined();
  });
});

