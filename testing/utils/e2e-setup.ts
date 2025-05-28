/**
 * End-to-end test setup utilities
 */

import { jest } from '@jest/globals';

// Extended timeout for E2E tests
jest.setTimeout(120000);

// Set test environment
process.env.NODE_ENV = 'test';
process.env.TEST_MODE = 'e2e';

// E2E test setup
beforeAll(async () => {
  console.log('Setting up E2E test environment...');
  // Setup test servers, databases, or external services
});

afterAll(async () => {
  console.log('Cleaning up E2E test environment...');
  // Cleanup E2E test resources
});

beforeEach(() => {
  // Reset state before each E2E test
  jest.clearAllMocks();
});

export {};

