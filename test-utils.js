// Test utilities for OAuth flow testing
// This is a JavaScript version of the TypeScript test utilities

export class TestStateGenerator {
  static generateState(payload) {
    const now = Math.floor(Date.now() / 1000);
    const tokenPayload = {
      ...payload,
      iat: payload.iat || now,
      exp: payload.exp || (now + 300), // 5 minutes default
    };

    // Simple base64 encoding for testing (not secure, just for testing)
    return Buffer.from(JSON.stringify(tokenPayload)).toString('base64');
  }

  static generateRoleState(role, nonce) {
    return this.generateState({
      role,
      nonce: nonce || `test-nonce-${Date.now()}`,
    });
  }

  static generateExpiredState(payload) {
    const now = Math.floor(Date.now() / 1000);
    return this.generateState({
      ...payload,
      iat: now - 600, // 10 minutes ago
      exp: now - 300, // 5 minutes ago
    });
  }

  static generateTamperedState(payload) {
    const now = Math.floor(Date.now() / 1000);
    const tokenPayload = {
      ...payload,
      iat: payload.iat || now,
      exp: payload.exp || (now + 300),
    };

    // Add tampered data
    tokenPayload.tampered = true;
    return Buffer.from(JSON.stringify(tokenPayload)).toString('base64');
  }

  static verifyState(token) {
    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
      
      // Check if expired
      const now = Math.floor(Date.now() / 1000);
      if (decoded.exp && decoded.exp < now) {
        return null; // Expired
      }
      
      // Check if tampered
      if (decoded.tampered) {
        return null; // Tampered
      }
      
      return decoded;
    } catch (error) {
      return null;
    }
  }
}

export class MockGoogleOAuth {
  static generateMockIdToken(payload) {
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

    return Buffer.from(JSON.stringify(tokenPayload)).toString('base64');
  }

  static generateMockTokenResponse(accessToken, idToken) {
    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      id_token: idToken,
    };
  }

  static generateMockUserInfo(payload) {
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
  static createTestUser(overrides = {}) {
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

  static createTestPractitioner(overrides = {}) {
    return this.createTestUser({
      user_role: 'sports_therapist',
      onboarding_status: 'in_progress',
      ...overrides,
    });
  }

  static createTestClient(overrides = {}) {
    return this.createTestUser({
      user_role: 'client',
      onboarding_status: 'pending',
      ...overrides,
    });
  }
}
