import '@testing-library/jest-dom';
import React from 'react';

// Ensure React is available for createElement (ts-jest with jsx: 'react')
(global as any).React = React;

// Mock logger (uses import.meta.env which Jest does not support)
jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(),
      signInWithOAuth: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    })),
    rpc: jest.fn(),
  })),
}));

// Mock crypto for RoleManager tests
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: jest.fn(() => 'test-uuid-123'),
  },
});

// Mock sessionStorage and localStorage with backing store so RoleManager and tests can use them
const createStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] ?? null),
    setItem: jest.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: jest.fn((key: string) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
  };
};
const localStorageMock = createStorageMock();
const sessionStorageMock = createStorageMock();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

// Do not mock window.location: JSDOM's location is non-configurable and assignment triggers "Not implemented: navigation".
// Tests that need a specific origin can mock at the call site or use relative URLs.

// Mock window.history
Object.defineProperty(window, 'history', {
  value: {
    replaceState: jest.fn(),
    pushState: jest.fn(),
  },
});

// Reset mocks and storage before each test
beforeEach(() => {
  jest.clearAllMocks();
  localStorageMock.clear();
  sessionStorageMock.clear();
});
