/**
 * Global test setup utilities for VoltAgent testing framework
 */

import { jest } from '@jest/globals';

// Global test timeout
jest.setTimeout(30000);

// Mock console methods in test environment to reduce noise
const originalConsole = global.console;

beforeAll(() => {
  global.console = {
    ...originalConsole,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: originalConsole.error, // Keep errors visible
  };
});

afterAll(() => {
  global.console = originalConsole;
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  throw reason;
});

// Clean up environment variables after each test
afterEach(() => {
  // Reset any test-specific environment variables
  delete process.env.TEST_MODE;
  delete process.env.MOCK_PROVIDERS;
});

export {};

