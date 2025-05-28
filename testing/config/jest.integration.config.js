const baseConfig = require('./jest.base.config');

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  ...baseConfig,
  displayName: 'Integration Tests',
  testMatch: [
    "**/testing/integration/**/*.test.ts",
    "**/testing/integration/**/*.spec.ts",
  ],
  collectCoverage: true,
  coverageDirectory: "testing/reports/coverage/integration",
  testTimeout: 60000,
  setupFilesAfterEnv: [
    ...baseConfig.setupFilesAfterEnv,
    "<rootDir>/testing/utils/integration-setup.ts"
  ],
  globalSetup: "<rootDir>/testing/utils/global-setup.ts",
  globalTeardown: "<rootDir>/testing/utils/global-teardown.ts",
};

