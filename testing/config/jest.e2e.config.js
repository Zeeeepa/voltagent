const baseConfig = require('./jest.base.config');

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  ...baseConfig,
  displayName: 'E2E Tests',
  testMatch: [
    "**/testing/e2e/**/*.test.ts",
    "**/testing/e2e/**/*.spec.ts",
  ],
  collectCoverage: false, // E2E tests don't need coverage
  testTimeout: 120000,
  setupFilesAfterEnv: [
    ...baseConfig.setupFilesAfterEnv,
    "<rootDir>/testing/utils/e2e-setup.ts"
  ],
  globalSetup: "<rootDir>/testing/utils/global-setup.ts",
  globalTeardown: "<rootDir>/testing/utils/global-teardown.ts",
  maxWorkers: 1, // Run E2E tests sequentially
};

