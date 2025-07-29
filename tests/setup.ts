// Global test setup for async testing
import { jest } from '@jest/globals';

// Extend Jest matchers for async testing
declare global {
  namespace jest {
    interface Matchers<R> {
      toResolveWithin(timeout: number): Promise<R>;
      toRejectWithin(timeout: number): Promise<R>;
      toEventuallyEqual(expected: any, timeout?: number): Promise<R>;
    }
  }
}

// Custom matcher for promises that should resolve within a timeout
expect.extend({
  async toResolveWithin(received: Promise<any>, timeout: number) {
    const start = Date.now();
    try {
      await Promise.race([
        received,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Promise did not resolve within ${timeout}ms`)), timeout)
        )
      ]);
      const duration = Date.now() - start;
      return {
        message: () => `Promise resolved in ${duration}ms (within ${timeout}ms)`,
        pass: true,
      };
    } catch (error) {
      const duration = Date.now() - start;
      return {
        message: () => `Promise failed to resolve within ${timeout}ms (took ${duration}ms): ${error}`,
        pass: false,
      };
    }
  },

  async toRejectWithin(received: Promise<any>, timeout: number) {
    const start = Date.now();
    try {
      await Promise.race([
        received.then(
          () => { throw new Error('Promise resolved when it should have rejected'); },
          (error) => error
        ),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Promise did not reject within ${timeout}ms`)), timeout)
        )
      ]);
      const duration = Date.now() - start;
      return {
        message: () => `Promise rejected in ${duration}ms (within ${timeout}ms)`,
        pass: true,
      };
    } catch (error) {
      const duration = Date.now() - start;
      return {
        message: () => `Promise failed to reject within ${timeout}ms (took ${duration}ms): ${error}`,
        pass: false,
      };
    }
  },

  async toEventuallyEqual(received: () => Promise<any>, expected: any, timeout: number = 5000) {
    const start = Date.now();
    const interval = 100;
    
    while (Date.now() - start < timeout) {
      try {
        const actual = await received();
        if (JSON.stringify(actual) === JSON.stringify(expected)) {
          return {
            message: () => `Value eventually equaled expected value`,
            pass: true,
          };
        }
      } catch (error) {
        // Continue polling
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    return {
      message: () => `Value did not equal expected value within ${timeout}ms`,
      pass: false,
    };
  },
});

// Global timeout for all tests
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Setup for async test utilities
beforeEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

afterEach(() => {
  jest.restoreAllMocks();
});

