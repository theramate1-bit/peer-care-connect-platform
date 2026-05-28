/**
 * Mock Google OAuth Service for Unit Testing
 * 
 * This service simulates Google OAuth endpoints and responses
 * to enable comprehensive testing without actual Google API calls.
 */

export interface MockGoogleUser {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  locale: string;
}

export interface MockGoogleTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
}

export interface MockGoogleError {
  error: string;
  error_description: string;
}

export class MockGoogleOAuthService {
  private static instance: MockGoogleOAuthService;
  private users: Map<string, MockGoogleUser> = new Map();
  private tokens: Map<string, MockGoogleTokenResponse> = new Map();

  private constructor() {
    this.initializeTestUsers();
  }

  public static getInstance(): MockGoogleOAuthService {
    if (!MockGoogleOAuthService.instance) {
      MockGoogleOAuthService.instance = new MockGoogleOAuthService();
    }
    return MockGoogleOAuthService.instance;
  }

  private initializeTestUsers(): void {
    // Test users for each role type
    const testUsers = [
      {
        id: 'client-oauth-123',
        email: 'client.oauth@test.com',
        verified_email: true,
        name: 'John Client',
        given_name: 'John',
        family_name: 'Client',
        picture: 'https://via.placeholder.com/150',
        locale: 'en',
      },
      {
        id: 'sports-therapist-oauth-123',
        email: 'sports.oauth@test.com',
        verified_email: true,
        name: 'Sarah Sports',
        given_name: 'Sarah',
        family_name: 'Sports',
        picture: 'https://via.placeholder.com/150',
        locale: 'en',
      },
      {
        id: 'massage-therapist-oauth-123',
        email: 'massage.oauth@test.com',
        verified_email: true,
        name: 'Mike Massage',
        given_name: 'Mike',
        family_name: 'Massage',
        picture: 'https://via.placeholder.com/150',
        locale: 'en',
      },
      {
        id: 'osteopath-oauth-123',
        email: 'osteo.oauth@test.com',
        verified_email: true,
        name: 'Dr. Emma Osteo',
        given_name: 'Emma',
        family_name: 'Osteo',
        picture: 'https://via.placeholder.com/150',
        locale: 'en',
      },
      {
        id: 'admin-oauth-123',
        email: 'admin.oauth@test.com',
        verified_email: true,
        name: 'Admin User',
        given_name: 'Admin',
        family_name: 'User',
        picture: 'https://via.placeholder.com/150',
        locale: 'en',
      },
    ];

    testUsers.forEach(user => {
      this.users.set(user.email, user);
    });
  }

  /**
   * Simulate Google OAuth authorization endpoint
   */
  public async authorize(
    clientId: string,
    redirectUri: string,
    scope: string,
    state?: string,
    responseType: string = 'code'
  ): Promise<{ code: string; state?: string } | MockGoogleError> {
    // Validate required parameters
    if (!clientId || !redirectUri || !scope) {
      return {
        error: 'invalid_request',
        error_description: 'Missing required parameters',
      };
    }

    // Simulate successful authorization
    const authCode = `mock_auth_code_${Date.now()}`;
    return {
      code: authCode,
      state,
    };
  }

  /**
   * Simulate Google OAuth token exchange endpoint
   */
  public async exchangeToken(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string,
    grantType: string = 'authorization_code'
  ): Promise<MockGoogleTokenResponse | MockGoogleError> {
    // Validate required parameters
    if (!code || !clientId || !clientSecret || !redirectUri) {
      return {
        error: 'invalid_request',
        error_description: 'Missing required parameters',
      };
    }

    // Simulate token generation
    const tokenResponse: MockGoogleTokenResponse = {
      access_token: `mock_access_token_${Date.now()}`,
      expires_in: 3600,
      refresh_token: `mock_refresh_token_${Date.now()}`,
      scope: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
      token_type: 'Bearer',
    };

    this.tokens.set(tokenResponse.access_token, tokenResponse);
    return tokenResponse;
  }

  /**
   * Simulate Google User Info endpoint
   */
  public async getUserInfo(accessToken: string): Promise<MockGoogleUser | MockGoogleError> {
    // Validate access token
    if (!accessToken || !this.tokens.has(accessToken)) {
      return {
        error: 'invalid_token',
        error_description: 'Invalid or expired access token',
      };
    }

    // For testing, we'll return a user based on the token
    // In real implementation, this would decode the token or make an API call
    const testEmails = Array.from(this.users.keys());
    const randomEmail = testEmails[Math.floor(Math.random() * testEmails.length)];
    const user = this.users.get(randomEmail);

    if (!user) {
      return {
        error: 'user_not_found',
        error_description: 'User not found',
      };
    }

    return user;
  }

  /**
   * Simulate Google OAuth error scenarios
   */
  public async simulateError(
    errorType: 'access_denied' | 'invalid_client' | 'invalid_grant' | 'server_error'
  ): Promise<MockGoogleError> {
    const errorMap = {
      access_denied: {
        error: 'access_denied',
        error_description: 'The user denied the request',
      },
      invalid_client: {
        error: 'invalid_client',
        error_description: 'Client authentication failed',
      },
      invalid_grant: {
        error: 'invalid_grant',
        error_description: 'The provided authorization grant is invalid',
      },
      server_error: {
        error: 'server_error',
        error_description: 'The authorization server encountered an unexpected condition',
      },
    };

    return errorMap[errorType];
  }

  /**
   * Get test user by email
   */
  public getTestUser(email: string): MockGoogleUser | undefined {
    return this.users.get(email);
  }

  /**
   * Get all test users
   */
  public getAllTestUsers(): MockGoogleUser[] {
    return Array.from(this.users.values());
  }

  /**
   * Add a custom test user
   */
  public addTestUser(user: MockGoogleUser): void {
    this.users.set(user.email, user);
  }

  /**
   * Remove a test user
   */
  public removeTestUser(email: string): boolean {
    return this.users.delete(email);
  }

  /**
   * Clear all test data
   */
  public clearTestData(): void {
    this.users.clear();
    this.tokens.clear();
    this.initializeTestUsers();
  }

  /**
   * Validate OAuth flow for a specific user type
   */
  public async validateOAuthFlowForUserType(
    userType: 'client' | 'sports_therapist' | 'massage_therapist' | 'osteopath' | 'admin'
  ): Promise<{
    success: boolean;
    user?: MockGoogleUser;
    error?: string;
  }> {
    try {
      // Find a test user for this role type
      const testUsers = this.getAllTestUsers();
      const userForRole = testUsers.find(user => 
        user.email.includes(userType.replace('_', '.'))
      );

      if (!userForRole) {
        return {
          success: false,
          error: `No test user found for role: ${userType}`,
        };
      }

      // Simulate the OAuth flow
      const authResult = await this.authorize(
        'test_client_id',
        'http://localhost:3000/auth/callback',
        'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile'
      );

      if ('error' in authResult) {
        return {
          success: false,
          error: authResult.error_description,
        };
      }

      const tokenResult = await this.exchangeToken(
        authResult.code,
        'test_client_id',
        'test_client_secret',
        'http://localhost:3000/auth/callback'
      );

      if ('error' in tokenResult) {
        return {
          success: false,
          error: tokenResult.error_description,
        };
      }

      const userInfoResult = await this.getUserInfo(tokenResult.access_token);

      if ('error' in userInfoResult) {
        return {
          success: false,
          error: userInfoResult.error_description,
        };
      }

      return {
        success: true,
        user: userInfoResult,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Export singleton instance
export const mockGoogleOAuthService = MockGoogleOAuthService.getInstance();

// Export utility functions for testing
export const createMockGoogleUser = (
  overrides: Partial<MockGoogleUser> = {}
): MockGoogleUser => ({
  id: `mock-user-${Date.now()}`,
  email: 'test@example.com',
  verified_email: true,
  name: 'Test User',
  given_name: 'Test',
  family_name: 'User',
  picture: 'https://via.placeholder.com/150',
  locale: 'en',
  ...overrides,
});

export const createMockGoogleTokenResponse = (
  overrides: Partial<MockGoogleTokenResponse> = {}
): MockGoogleTokenResponse => ({
  access_token: `mock_token_${Date.now()}`,
  expires_in: 3600,
  refresh_token: `mock_refresh_${Date.now()}`,
  scope: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
  token_type: 'Bearer',
  ...overrides,
});

export const createMockGoogleError = (
  error: string,
  description: string
): MockGoogleError => ({
  error,
  error_description: description,
});
