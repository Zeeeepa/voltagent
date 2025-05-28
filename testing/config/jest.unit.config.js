const baseConfig = require('./jest.base.config');

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  ...baseConfig,
  displayName: 'Unit Tests',
  testMatch: [
    "**/src/**/*.spec.ts",
    "**/src/**/*.test.ts",
  ],
  collectCoverage: true,
  coverageDirectory: "testing/reports/coverage/unit",
  testPathIgnorePatterns: [
    ...baseConfig.testPathIgnorePatterns,
    "**/integration/**",
    "**/e2e/**",
  ],
};

