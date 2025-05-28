/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  projects: [
    // Unit tests configuration
    {
      ...require('./testing/config/jest.unit.config'),
      rootDir: '.',
    },
    // Integration tests configuration
    {
      ...require('./testing/config/jest.integration.config'),
      rootDir: '.',
    },
    // E2E tests configuration
    {
      ...require('./testing/config/jest.e2e.config'),
      rootDir: '.',
    },
  ],
  
  // Global coverage settings
  collectCoverage: false, // Controlled per project
  coverageDirectory: 'testing/reports/coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  
  // Global settings
  verbose: true,
  passWithNoTests: true,
  
  // Watch mode settings
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],
};

