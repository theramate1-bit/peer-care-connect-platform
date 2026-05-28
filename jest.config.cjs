/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  setupFiles: ['<rootDir>/src/test/setup-mocks.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  collectCoverageFrom: [
    'src/lib/**/*.{ts,tsx}',
    'src/services/**/*.{ts,tsx}',
    'src/utils/**/*.{ts,tsx}',
    'src/hooks/**/*.{ts,tsx}',
    'src/config/**/*.{ts,tsx}',
    'src/emails/**/*.{ts,tsx}',
    'src/integrations/**/*.{ts,tsx}',
    'src/types/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/__tests__/**',
    '!src/**/test/**',
    '!src/test/**',
    '!src/**/mocks/**',
    '!src/main.tsx',
    '!src/vite-env.d.ts',
    '!src/polyfills.ts',
    '!src/setupTests.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
  },
  moduleNameMapper: {
    '^react$': require.resolve('react'),
    '^react-dom$': require.resolve('react-dom'),
    '^react/jsx-runtime$': require.resolve('react/jsx-runtime'),
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        isolatedModules: true,
        useESM: false,
        tsconfig: { jsx: 'react' },
      },
    ],
  },
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
    '**/tests/**/*.[jt]s?(x)',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/e2e/', '\\.spec\\.(ts|tsx|js)$', 'oauth-flows', 'user-journey', 'e2e-onboarding', 'AuthRouter.mock.test', 'AuthRouter.protected.test', 'AuthRouter.test', 'AuthCallback.test', 'Header.test', 'quick-wins.test', 'BookingFlow.test', 'GuestBookingFlow.test', 'PreAssessmentForm.test', 'SimpleProtectedRoute.test', 'LiveSOAPNotes.test', 'typography.test', 'card.test', 'button.test', 'HybridBookingChooser.test', 'lib/__tests__/treatment-exchange.test', 'lib/__tests__/address-validation.test'],
};
