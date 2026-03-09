/**
 * Global Setup for OAuth Tests
 * 
 * This file runs once before all tests to set up the test environment.
 */

export default async function globalSetup() {
  console.log('🚀 Setting up OAuth test environment...');
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
  process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key';
  
  // Mock window.location for OAuth redirects
  Object.defineProperty(window, 'location', {
    value: {
      href: 'http://localhost:3000',
      origin: 'http://localhost:3000',
      pathname: '/',
      search: '',
      hash: '',
      assign: jest.fn(),
      replace: jest.fn(),
      reload: jest.fn(),
    },
    writable: true,
  });
  
  // Mock window.history
  Object.defineProperty(window, 'history', {
    value: {
      pushState: jest.fn(),
      replaceState: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      go: jest.fn(),
    },
    writable: true,
  });
  
  // Mock crypto for UUID generation
  Object.defineProperty(global, 'crypto', {
    value: {
      randomUUID: jest.fn(() => 'test-uuid-' + Math.random().toString(36).substr(2, 9)),
    },
    writable: true,
  });
  
  console.log('✅ OAuth test environment setup complete');
}
