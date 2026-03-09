/**
 * Supabase Test Client Factory
 * Creates test instances of Supabase client with mocked responses
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface MockSupabaseResponse<T = any> {
  data: T | null;
  error: any | null;
}

export class SupabaseTestClient {
  private mockResponses: Map<string, MockSupabaseResponse> = new Map();
  private mockAuth: any = {};
  private mockRpc: any = jest.fn();

  /**
   * Create a mock Supabase client for testing
   */
  static createMockClient(): Partial<SupabaseClient> {
    const client = new SupabaseTestClient();
    return client.getClient();
  }

  /**
   * Set mock response for a query
   */
  setMockResponse(key: string, response: MockSupabaseResponse) {
    this.mockResponses.set(key, response);
  }

  /**
   * Set mock auth response
   */
  setMockAuth(auth: any) {
    this.mockAuth = auth;
  }

  /**
   * Set mock RPC response
   */
  setMockRpc(fn: jest.Mock) {
    this.mockRpc = fn;
  }

  /**
   * Get the mock client
   */
  getClient(): Partial<SupabaseClient> {
    const queryBuilder = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      contains: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    };

    return {
      from: jest.fn(() => queryBuilder),
      rpc: this.mockRpc,
      auth: {
        getUser: jest.fn().mockResolvedValue(this.mockAuth.getUser || { data: { user: null }, error: null }),
        signInWithOAuth: jest.fn().mockResolvedValue(this.mockAuth.signInWithOAuth || { data: {}, error: null }),
        signOut: jest.fn().mockResolvedValue(this.mockAuth.signOut || { error: null }),
        onAuthStateChange: jest.fn(() => ({
          data: { subscription: null },
          unsubscribe: jest.fn(),
        })),
        getSession: jest.fn().mockResolvedValue(this.mockAuth.getSession || { data: { session: null }, error: null }),
        signInWithPassword: jest.fn().mockResolvedValue(this.mockAuth.signInWithPassword || { data: {}, error: null }),
        signUp: jest.fn().mockResolvedValue(this.mockAuth.signUp || { data: {}, error: null }),
      },
    } as any;
  }

  /**
   * Reset all mocks
   */
  reset() {
    this.mockResponses.clear();
    this.mockAuth = {};
    this.mockRpc = jest.fn();
  }
}

/**
 * Create a test Supabase client with default mock responses
 */
export function createTestSupabaseClient(overrides: Partial<SupabaseClient> = {}): Partial<SupabaseClient> {
  const baseClient = SupabaseTestClient.createMockClient();
  return { ...baseClient, ...overrides };
}

