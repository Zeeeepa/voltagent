/**
 * Utility functions for async testing in AI Agent Framework
 */

export class AsyncTestUtils {
  /**
   * Creates a promise that resolves after a specified delay
   */
  static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Creates a promise that rejects after a specified delay
   */
  static delayedReject(ms: number, error: Error = new Error('Delayed rejection')): Promise<never> {
    return new Promise((_, reject) => setTimeout(() => reject(error), ms));
  }

  /**
   * Waits for a condition to become true with polling
   */
  static async waitFor(
    condition: () => boolean | Promise<boolean>,
    options: {
      timeout?: number;
      interval?: number;
      timeoutMessage?: string;
    } = {}
  ): Promise<void> {
    const { timeout = 5000, interval = 100, timeoutMessage = 'Condition not met within timeout' } = options;
    const start = Date.now();

    while (Date.now() - start < timeout) {
      const result = await condition();
      if (result) {
        return;
      }
      await this.delay(interval);
    }

    throw new Error(timeoutMessage);
  }

  /**
   * Waits for a promise to settle (resolve or reject)
   */
  static async waitForSettlement<T>(
    promise: Promise<T>,
    timeout: number = 5000
  ): Promise<{ status: 'fulfilled' | 'rejected'; value?: T; reason?: any }> {
    try {
      const result = await Promise.race([
        promise.then(value => ({ status: 'fulfilled' as const, value })),
        this.delayedReject(timeout, new Error('Promise settlement timeout'))
      ]);
      return result;
    } catch (error) {
      if (error instanceof Error && error.message === 'Promise settlement timeout') {
        throw error;
      }
      return { status: 'rejected', reason: error };
    }
  }

  /**
   * Creates a mock async function that can be controlled
   */
  static createMockAsyncFunction<T = any>(
    resolveValue?: T,
    rejectError?: Error,
    delay: number = 0
  ) {
    const mockFn = jest.fn();
    
    if (rejectError) {
      mockFn.mockImplementation(async (...args: any[]) => {
        if (delay > 0) await this.delay(delay);
        throw rejectError;
      });
    } else {
      mockFn.mockImplementation(async (...args: any[]) => {
        if (delay > 0) await this.delay(delay);
        return resolveValue;
      });
    }

    return mockFn;
  }

  /**
   * Creates a controllable promise for testing
   */
  static createControllablePromise<T = any>() {
    let resolve: (value: T) => void;
    let reject: (error: Error) => void;
    
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    return {
      promise,
      resolve: resolve!,
      reject: reject!
    };
  }

  /**
   * Measures the execution time of an async function
   */
  static async measureExecutionTime<T>(
    asyncFn: () => Promise<T>
  ): Promise<{ result: T; duration: number }> {
    const start = Date.now();
    const result = await asyncFn();
    const duration = Date.now() - start;
    return { result, duration };
  }

  /**
   * Runs multiple async operations concurrently and measures total time
   */
  static async runConcurrently<T>(
    operations: (() => Promise<T>)[],
    options: { timeout?: number } = {}
  ): Promise<{ results: T[]; duration: number; errors: Error[] }> {
    const { timeout = 10000 } = options;
    const start = Date.now();
    const errors: Error[] = [];

    const promises = operations.map(async (op, index) => {
      try {
        return await op();
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(`Operation ${index} failed`));
        throw error;
      }
    });

    try {
      const results = await Promise.race([
        Promise.allSettled(promises),
        this.delayedReject(timeout, new Error('Concurrent operations timeout'))
      ]);

      const successfulResults = results
        .filter((result): result is PromiseFulfilledResult<T> => result.status === 'fulfilled')
        .map(result => result.value);

      const duration = Date.now() - start;
      return { results: successfulResults, duration, errors };
    } catch (error) {
      const duration = Date.now() - start;
      return { results: [], duration, errors: [error instanceof Error ? error : new Error('Unknown error')] };
    }
  }

  /**
   * Creates a retry mechanism for flaky async operations
   */
  static async retry<T>(
    operation: () => Promise<T>,
    options: {
      maxAttempts?: number;
      delay?: number;
      backoff?: 'linear' | 'exponential';
      shouldRetry?: (error: Error) => boolean;
    } = {}
  ): Promise<T> {
    const {
      maxAttempts = 3,
      delay = 1000,
      backoff = 'linear',
      shouldRetry = () => true
    } = options;

    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt === maxAttempts || !shouldRetry(lastError)) {
          throw lastError;
        }

        const waitTime = backoff === 'exponential' 
          ? delay * Math.pow(2, attempt - 1)
          : delay * attempt;
        
        await this.delay(waitTime);
      }
    }

    throw lastError!;
  }
}

