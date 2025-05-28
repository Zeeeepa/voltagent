/**
 * Integration test setup utilities
 */

import { jest } from '@jest/globals';

// Extended timeout for integration tests
jest.setTimeout(60000);

// Set test environment
process.env.NODE_ENV = 'test';
process.env.TEST_MODE = 'integration';

// Mock external services for integration tests
beforeAll(async () => {
  // Setup test database or external service mocks
  console.log('Setting up integration test environment...');
});

afterAll(async () => {
  // Cleanup integration test resources
  console.log('Cleaning up integration test environment...');
});

beforeEach(() => {
  // Reset mocks before each integration test
  jest.clearAllMocks();
});

export {};

