/**
 * Supabase Mock for OAuth Tests
 * 
 * This mock provides a complete Supabase client implementation
 * for testing OAuth flows without actual database calls.
 */

export const mockSupabaseClient = {
  auth: {
    getUser: jest.fn(),
    signInWithOAuth: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChange: jest.fn(),
    updateUser: jest.fn(),
    signUp: jest.fn(),
    signInWithPassword: jest.fn(),
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
    maybeSingle: jest.fn(),
  })),
  rpc: jest.fn(),
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn(),
      download: jest.fn(),
      remove: jest.fn(),
      list: jest.fn(),
    })),
  },
};

// Mock the createClient function
export const createClient = jest.fn(() => mockSupabaseClient);

// Export default mock
export default {
  createClient,
  mockSupabaseClient,
};
