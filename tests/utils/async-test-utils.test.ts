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
      expect(duration).toBeLessThan(200);
    });
  });

  describe('delayedReject', () => {
    it('should reject after specified delay', async () => {
      const start = Date.now();
      const error = new Error('Test error');
      
      await expect(AsyncTestUtils.delayedReject(100, error)).rejects.toThrow('Test error');
      
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
  });

  describe('waitForSettlement', () => {
    it('should return fulfilled status for resolved promise', async () => {
      const promise = Promise.resolve('test value');
      
      const result = await AsyncTestUtils.waitForSettlement(promise);
      
      expect(result.status).toBe('fulfilled');
      expect(result.value).toBe('test value');
    });

    it('should return rejected status for rejected promise', async () => {
      const error = new Error('Test error');
      const promise = Promise.reject(error);
      
      const result = await AsyncTestUtils.waitForSettlement(promise);
      
      expect(result.status).toBe('rejected');
      expect(result.reason).toBe(error);
    });

    it('should timeout for promises that take too long', async () => {
      const promise = new Promise(resolve => setTimeout(resolve, 1000));
      
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
    it('should create promise that can be manually resolved', async () => {
      const { promise, resolve } = AsyncTestUtils.createControllablePromise<string>();
      
      setTimeout(() => resolve('manual result'), 50);
      
      const result = await promise;
      expect(result).toBe('manual result');
    });

    it('should create promise that can be manually rejected', async () => {
      const { promise, reject } = AsyncTestUtils.createControllablePromise();
      
      setTimeout(() => reject(new Error('manual error')), 50);
      
      await expect(promise).rejects.toThrow('manual error');
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
      expect(duration).toBeLessThan(200);
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
      expect(duration).toBeLessThan(200); // Should be concurrent, not sequential
    });

    it('should handle errors in concurrent operations', async () => {
      const operations = [
        () => Promise.resolve('success'),
        () => Promise.reject(new Error('failure')),
        () => Promise.resolve('success2')
      ];
      
      const { results, errors } = await AsyncTestUtils.runConcurrently(operations);
      
      expect(results).toEqual(['success', 'success2']);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe('failure');
    });

    it('should timeout concurrent operations', async () => {
      const operations = [
        () => AsyncTestUtils.delay(200).then(() => 'slow result')
      ];
      
      const { results, errors } = await AsyncTestUtils.runConcurrently(operations, { timeout: 100 });
      
      expect(results).toHaveLength(0);
      expect(errors).toHaveLength(1);
    });
  });

  describe('retry', () => {
    it('should retry failed operations', async () => {
      let attempts = 0;
      const operation = async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Not ready yet');
        }
        return 'success';
      };
      
      const result = await AsyncTestUtils.retry(operation, { maxAttempts: 3, delay: 50 });
      
      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    it('should fail after max attempts', async () => {
      const operation = async () => {
        throw new Error('Always fails');
      };
      
      await expect(
        AsyncTestUtils.retry(operation, { maxAttempts: 2, delay: 10 })
      ).rejects.toThrow('Always fails');
    });

    it('should use exponential backoff', async () => {
      let attempts = 0;
      const operation = async () => {
        attempts++;
        throw new Error('Fail');
      };
      
      const start = Date.now();
      
      await expect(
        AsyncTestUtils.retry(operation, { 
          maxAttempts: 3, 
          delay: 50, 
          backoff: 'exponential' 
        })
      ).rejects.toThrow('Fail');
      
      const duration = Date.now() - start;
      // Should take at least 50 + 100 = 150ms for exponential backoff
      expect(duration).toBeGreaterThanOrEqual(140);
    });

    it('should respect shouldRetry condition', async () => {
      let attempts = 0;
      const operation = async () => {
        attempts++;
        throw new Error('Critical error');
      };
      
      const shouldRetry = (error: Error) => !error.message.includes('Critical');
      
      await expect(
        AsyncTestUtils.retry(operation, { maxAttempts: 3, shouldRetry })
      ).rejects.toThrow('Critical error');
      
      expect(attempts).toBe(1); // Should not retry
    });
  });
});

