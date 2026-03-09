/**
 * Jest Configuration for Google OAuth Tests
 * 
 * This configuration is optimized for testing OAuth flows
 * with proper mocking and coverage reporting.
 */

module.exports = {
  // Test environment
  testEnvironment: 'jsdom',
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  
  // Module name mapping for absolute imports
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  
  // Transform files
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  
  // File extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Test patterns
  testMatch: [
    '<rootDir>/src/components/__tests__/GoogleOAuth*.test.tsx',
    '<rootDir>/src/components/__tests__/GoogleOAuth*.test.ts',
  ],
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage/oauth',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  
  // Files to include in coverage
  collectCoverageFrom: [
    'src/pages/auth/Register.tsx',
    'src/pages/auth/Login.tsx',
    'src/pages/auth/OAuthCompletion.tsx',
    'src/components/auth/AuthCallback.tsx',
    'src/lib/role-management.ts',
    'src/contexts/AuthContext.tsx',
    'src/integrations/supabase/client.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.*',
    '!src/**/*.spec.*',
  ],
  
  // Mock modules
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@supabase/supabase-js$': '<rootDir>/src/test/mocks/supabase.mock.ts',
    '^sonner$': '<rootDir>/src/test/mocks/sonner.mock.ts',
  },
  
  // Test timeout
  testTimeout: 30000,
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  
  // Verbose output
  verbose: true,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Globals
  globals: {
    'ts-jest': {
      tsconfig: {
        jsx: 'react-jsx',
      },
    },
  },
  
  // Test environment options
  testEnvironmentOptions: {
    url: 'http://localhost:3000',
  },
  
  // Module paths
  modulePaths: ['<rootDir>/src'],
  
  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|@supabase|sonner))',
  ],
  
  // Setup files
  setupFiles: ['<rootDir>/src/test/setup.ts'],
  
  // Global setup
  globalSetup: '<rootDir>/src/test/global-setup.ts',
  
  // Global teardown
  globalTeardown: '<rootDir>/src/test/global-teardown.ts',
};
