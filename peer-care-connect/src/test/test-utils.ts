import jwt from 'jsonwebtoken';

export interface TestStatePayload {
  role: string;
  nonce: string;
  exp?: number;
  iat?: number;
}

export class TestStateGenerator {
  private static readonly SECRET = process.env.STATE_SECRET || 'test-secret-key';
  private static readonly ALGORITHM = 'HS256';

  /**
   * Generate a signed state token for testing
   */
  static generateState(payload: TestStatePayload): string {
    const now = Math.floor(Date.now() / 1000);
    const tokenPayload = {
      ...payload,
      iat: payload.iat || now,
      exp: payload.exp || (now + 300), // 5 minutes default
    };

    return jwt.sign(tokenPayload, this.SECRET, {
      algorithm: this.ALGORITHM,
    });
  }

  /**
   * Generate a test state for a specific role
   */
  static generateRoleState(role: string, nonce?: string): string {
    return this.generateState({
      role,
      nonce: nonce || `test-nonce-${Date.now()}`,
    });
  }

  /**
   * Generate an expired state token
   */
  static generateExpiredState(payload: TestStatePayload): string {
    const now = Math.floor(Date.now() / 1000);
    return this.generateState({
      ...payload,
      iat: now - 600, // 10 minutes ago
      exp: now - 300, // 5 minutes ago
    });
  }

  /**
   * Generate a tampered state token (invalid signature)
   */
  static generateTamperedState(payload: TestStatePayload): string {
    const now = Math.floor(Date.now() / 1000);
    const tokenPayload = {
      ...payload,
      iat: payload.iat || now,
      exp: payload.exp || (now + 300),
    };

    // Sign with wrong secret to create tampered token
    return jwt.sign(tokenPayload, 'wrong-secret', {
      algorithm: this.ALGORITHM,
    });
  }

  /**
   * Verify a state token (for testing verification logic)
   */
  static verifyState(token: string): TestStatePayload | null {
    try {
      const decoded = jwt.verify(token, this.SECRET, {
        algorithms: [this.ALGORITHM],
      }) as TestStatePayload;
      return decoded;
    } catch (error) {
      return null;
    }
  }
}

export class MockGoogleOAuth {
  /**
   * Generate a mock Google ID token
   */
  static generateMockIdToken(payload: {
    email: string;
    sub: string;
    name?: string;
    picture?: string;
  }): string {
    const now = Math.floor(Date.now() / 1000);
    const tokenPayload = {
      iss: 'https://accounts.google.com',
      aud: process.env.GOOGLE_CLIENT_ID || 'test-client-id',
      sub: payload.sub,
      email: payload.email,
      email_verified: true,
      name: payload.name || 'Test User',
      picture: payload.picture || 'https://example.com/avatar.jpg',
      iat: now,
      exp: now + 3600, // 1 hour
    };

    // Use a test key for mock tokens
    return jwt.sign(tokenPayload, 'google-test-key', {
      algorithm: 'HS256',
    });
  }

  /**
   * Generate mock Google token response
   */
  static generateMockTokenResponse(accessToken: string, idToken: string) {
    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      id_token: idToken,
    };
  }

  /**
   * Generate mock Google userinfo response
   */
  static generateMockUserInfo(payload: {
    email: string;
    sub: string;
    name?: string;
    picture?: string;
  }) {
    return {
      sub: payload.sub,
      email: payload.email,
      email_verified: true,
      name: payload.name || 'Test User',
      picture: payload.picture || 'https://example.com/avatar.jpg',
      given_name: 'Test',
      family_name: 'User',
      locale: 'en',
    };
  }
}

export class TestUserFactory {
  /**
   * Create a test user object
   */
  static createTestUser(overrides: Partial<any> = {}) {
    return {
      id: 'test-user-id-123',
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      user_role: 'client',
      onboarding_status: 'pending',
      profile_completed: false,
      is_verified: true,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides,
    };
  }

  /**
   * Create a test practitioner user
   */
  static createTestPractitioner(overrides: Partial<any> = {}) {
    return this.createTestUser({
      user_role: 'sports_therapist',
      onboarding_status: 'in_progress',
      ...overrides,
    });
  }

  /**
   * Create a test client user
   */
  static createTestClient(overrides: Partial<any> = {}) {
    return this.createTestUser({
      user_role: 'client',
      onboarding_status: 'pending',
      ...overrides,
    });
  }
}

export class TestDatabaseHelpers {
  /**
   * Mock Supabase response for user creation
   */
  static mockUserCreation(user: any) {
    return {
      data: user,
      error: null,
    };
  }

  /**
   * Mock Supabase response for user update
   */
  static mockUserUpdate(user: any) {
    return {
      data: user,
      error: null,
    };
  }

  /**
   * Mock Supabase response for user query
   */
  static mockUserQuery(user: any) {
    return {
      data: user,
      error: null,
    };
  }

  /**
   * Mock Supabase error response
   */
  static mockError(message: string, code?: string) {
    return {
      data: null,
      error: {
        message,
        code: code || 'PGRST_ERROR',
        details: null,
        hint: null,
      },
    };
  }
}
