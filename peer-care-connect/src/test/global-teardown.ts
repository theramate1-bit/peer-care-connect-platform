/**
 * Global Teardown for OAuth Tests
 * 
 * This file runs once after all tests to clean up the test environment.
 */

export default async function globalTeardown() {
  console.log('🧹 Cleaning up OAuth test environment...');
  
  // Clear all mocks
  jest.clearAllMocks();
  
  // Reset environment variables
  delete process.env.NODE_ENV;
  delete process.env.VITE_SUPABASE_URL;
  delete process.env.VITE_SUPABASE_ANON_KEY;
  
  // Clear storage
  if (typeof window !== 'undefined') {
    window.localStorage.clear();
    window.sessionStorage.clear();
  }
  
  // Reset global objects
  if (typeof global !== 'undefined') {
    delete (global as any).crypto;
  }
  
  console.log('✅ OAuth test environment cleanup complete');
}
