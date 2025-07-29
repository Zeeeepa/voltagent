/**
 * Tests for AsyncTestUtils
 */

import { AsyncTestUtils } from './async-test-utils';

describe('AsyncTestUtils', () => {
  describe('delay', () => {
    it('should delay execution for specified time', async () => {
      const start = Date.now();
      await AsyncTestUtils.delay(100);
      const duration = Date.now() - start;
      
      expect(duration).toBeGreaterThanOrEqual(90); // Allow some variance
      expect(duration).toBeLessThan(150);
    });
  });

  describe('delayedReject', () => {
    it('should reject after specified delay', async () => {
      const start = Date.now();
      const error = new Error('Test error');
      
      await expect(
        AsyncTestUtils.delayedReject(100, error)
      ).rejects.toThrow('Test error');
      
      const duration = Date.now() - start;
      expect(duration).toBeGreaterThanOrEqual(90);
    });
  });

  describe('waitFor', () => {
    it('should wait for condition to become true', async () => {
      let counter = 0;
      const condition = () => {
        counter++;
        return counter >= 3;
      };
      
      await AsyncTestUtils.waitFor(condition, { interval: 50 });
      expect(counter).toBeGreaterThanOrEqual(3);
    });

    it('should timeout if condition never becomes true', async () => {
      const condition = () => false;
      
      await expect(
        AsyncTestUtils.waitFor(condition, { timeout: 200, interval: 50 })
      ).rejects.toThrow('Condition not met within timeout');
    });

    it('should work with async conditions', async () => {
      let counter = 0;
      const asyncCondition = async () => {
        await AsyncTestUtils.delay(10);
        counter++;
        return counter >= 2;
      };
      
      await AsyncTestUtils.waitFor(asyncCondition, { interval: 50 });
      expect(counter).toBeGreaterThanOrEqual(2);
    });
  });

  describe('waitForSettlement', () => {
    it('should return fulfilled result for resolved promise', async () => {
      const promise = Promise.resolve('success');
      
      const result = await AsyncTestUtils.waitForSettlement(promise);
      
      expect(result.status).toBe('fulfilled');
      expect(result.value).toBe('success');
    });

    it('should return rejected result for rejected promise', async () => {
      const error = new Error('Test error');
      const promise = Promise.reject(error);
      
      const result = await AsyncTestUtils.waitForSettlement(promise);
      
      expect(result.status).toBe('rejected');
      expect(result.reason).toBe(error);
    });

    it('should timeout for promises that take too long', async () => {
      const promise = AsyncTestUtils.delay(1000);
      
      await expect(
        AsyncTestUtils.waitForSettlement(promise, 100)
      ).rejects.toThrow('Promise settlement timeout');
    });
  });

  describe('createMockAsyncFunction', () => {
    it('should create mock that resolves with value', async () => {
      const mockFn = AsyncTestUtils.createMockAsyncFunction('test result');
      
      const result = await mockFn('arg1', 'arg2');
      
      expect(result).toBe('test result');
      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should create mock that rejects with error', async () => {
      const error = new Error('Mock error');
      const mockFn = AsyncTestUtils.createMockAsyncFunction(undefined, error);
      
      await expect(mockFn()).rejects.toThrow('Mock error');
    });

    it('should respect delay parameter', async () => {
      const mockFn = AsyncTestUtils.createMockAsyncFunction('result', undefined, 100);
      
      const start = Date.now();
      await mockFn();
      const duration = Date.now() - start;
      
      expect(duration).toBeGreaterThanOrEqual(90);
    });
  });

  describe('createControllablePromise', () => {
    it('should create promise that can be resolved manually', async () => {
      const { promise, resolve } = AsyncTestUtils.createControllablePromise<string>();
      
      setTimeout(() => resolve('controlled result'), 50);
      
      const result = await promise;
      expect(result).toBe('controlled result');
    });

    it('should create promise that can be rejected manually', async () => {
      const { promise, reject } = AsyncTestUtils.createControllablePromise();
      
      setTimeout(() => reject(new Error('controlled error')), 50);
      
      await expect(promise).rejects.toThrow('controlled error');
    });
  });

  describe('measureExecutionTime', () => {
    it('should measure execution time accurately', async () => {
      const asyncFn = async () => {
        await AsyncTestUtils.delay(100);
        return 'result';
      };
      
      const { result, duration } = await AsyncTestUtils.measureExecutionTime(asyncFn);
      
      expect(result).toBe('result');
      expect(duration).toBeGreaterThanOrEqual(90);
      expect(duration).toBeLessThan(150);
    });
  });

  describe('runConcurrently', () => {
    it('should run operations concurrently', async () => {
      const operations = [
        () => AsyncTestUtils.delay(100).then(() => 'result1'),
        () => AsyncTestUtils.delay(100).then(() => 'result2'),
        () => AsyncTestUtils.delay(100).then(() => 'result3')
      ];
      
      const { results, duration, errors } = await AsyncTestUtils.runConcurrently(operations);
      
      expect(results).toEqual(['result1', 'result2', 'result3']);
      expect(errors).toHaveLength(0);
      expect(duration).toBeLessThan(200); // Should be concurrent, not 300ms
    });

    it('should handle errors in concurrent operations', async () => {
      const operations = [
        () => Promise.resolve('success'),
        () => Promise.reject(new Error('operation error')),
        () => Promise.resolve('another success')
      ];
      
      const { results, errors } = await AsyncTestUtils.runConcurrently(operations);
      
      expect(results).toEqual(['success', 'another success']);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe('operation error');
    });

    it('should timeout concurrent operations', async () => {
      const operations = [
        () => AsyncTestUtils.delay(2000).then(() => 'slow result')
      ];
      
      const { results, errors } = await AsyncTestUtils.runConcurrently(
        operations,
        { timeout: 100 }
      );
      
      expect(results).toHaveLength(0);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe('Concurrent operations timeout');
    });
  });

  describe('retry', () => {
    it('should retry failed operations', async () => {
      let attempts = 0;
      const flakyOperation = async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      };
      
      const result = await AsyncTestUtils.retry(flakyOperation, {
        maxAttempts: 3,
        delay: 50
      });
      
      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    it('should fail after max attempts', async () => {
      const alwaysFailOperation = async () => {
        throw new Error('Persistent failure');
      };
      
      await expect(
        AsyncTestUtils.retry(alwaysFailOperation, {
          maxAttempts: 2,
          delay: 10
        })
      ).rejects.toThrow('Persistent failure');
    });

    it('should use exponential backoff', async () => {
      let attempts = 0;
      const timestamps: number[] = [];
      
      const operation = async () => {
        timestamps.push(Date.now());
        attempts++;
        if (attempts < 3) {
          throw new Error('Retry test');
        }
        return 'success';
      };
      
      await AsyncTestUtils.retry(operation, {
        maxAttempts: 3,
        delay: 100,
        backoff: 'exponential'
      });
      
      expect(timestamps).toHaveLength(3);
      
      // Check exponential backoff timing
      const delay1 = timestamps[1] - timestamps[0];
      const delay2 = timestamps[2] - timestamps[1];
      
      expect(delay1).toBeGreaterThanOrEqual(90); // ~100ms
      expect(delay2).toBeGreaterThanOrEqual(190); // ~200ms
    });

    it('should respect shouldRetry condition', async () => {
      let attempts = 0;
      const operation = async () => {
        attempts++;
        throw new Error('Non-retryable error');
      };
      
      await expect(
        AsyncTestUtils.retry(operation, {
          maxAttempts: 3,
          shouldRetry: (error) => error.message !== 'Non-retryable error'
        })
      ).rejects.toThrow('Non-retryable error');
      
      expect(attempts).toBe(1); // Should not retry
    });
  });
});

