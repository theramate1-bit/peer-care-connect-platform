/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^expo-constants$": "<rootDir>/test/mocks/expo-constants.js",
    "^@sentry/react-native$": "<rootDir>/test/mocks/sentry-react-native.js",
  },
  testPathIgnorePatterns: ["/node_modules/"],
};
