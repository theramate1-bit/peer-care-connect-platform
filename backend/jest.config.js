/** @type {import('jest').Config} */
module.exports = {
  rootDir: "..",
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/backend/tests"],
  setupFilesAfterEnv: ["<rootDir>/backend/tests/setup/jest.setup.ts"],
  testMatch: [
    "<rootDir>/backend/tests/unit/**/*.test.ts",
    "<rootDir>/backend/tests/integration/**/*.test.ts",
  ],
  collectCoverageFrom: [
    "<rootDir>/supabase/functions/_shared/validation.ts",
    "<rootDir>/supabase/functions/_shared/cors.ts",
    "<rootDir>/supabase/functions/_shared/security-headers.ts",
    "<rootDir>/supabase/functions/_shared/booking-email-data.ts",
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  moduleFileExtensions: ["ts", "js", "json"],
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        tsconfig: "<rootDir>/backend/tsconfig.json",
      },
    ],
  },
};
