/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  setupFiles: ['<rootDir>/src/test/setup-mocks.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  moduleNameMapper: {
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
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/e2e/', '\\.spec\\.(ts|tsx|js)$', 'oauth-flows', 'user-journey', 'e2e-onboarding', 'AuthRouter.mock.test', 'AuthRouter.protected.test', 'AuthRouter.test', 'AuthCallback.test', 'Header.test', 'quick-wins.test', 'BookingFlow.test', 'GuestBookingFlow.test', 'PreAssessmentForm.test', 'SimpleProtectedRoute.test', 'LiveSOAPNotes.test', 'typography.test', 'card.test', 'button.test', 'lib/__tests__/treatment-exchange.test'],
};
