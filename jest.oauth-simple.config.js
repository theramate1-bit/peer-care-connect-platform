export default {
  testEnvironment: 'jsdom',
  testMatch: ['**/GoogleOAuth*.test.tsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
      },
    }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  collectCoverage: false,
  verbose: true,
  testTimeout: 10000,
  clearMocks: true,
  restoreMocks: true,
};