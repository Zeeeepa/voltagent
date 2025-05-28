/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
  coverageDirectory: "coverage",
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/**/index.ts",
    "!src/**/*.spec.ts",
    "!src/**/*.test.ts",
  ],
  setupFilesAfterEnv: ["<rootDir>/testing/utils/setup.ts"],
  testTimeout: 30000,
  verbose: true,
  collectCoverage: false, // Enable per test type
  coverageReporters: ["text", "lcov", "html", "json"],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  moduleNameMapping: {
    "^@voltagent/(.*)$": "<rootDir>/packages/$1/src",
    "^@testing/(.*)$": "<rootDir>/testing/$1",
  },
  testPathIgnorePatterns: [
    "/node_modules/",
    "/dist/",
    "/build/",
    "/coverage/",
  ],
  transformIgnorePatterns: [
    "node_modules/(?!(.*\\.mjs$))",
  ],
};

