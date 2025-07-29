/**
 * Async tests for Agent class
 */

import { Agent, AgentConfig } from '../src/agent';
import { AsyncTestUtils } from './utils/async-test-utils';

describe('Agent - Async Operations', () => {
  let agent: Agent;
  const defaultConfig: AgentConfig = {
    name: 'test-agent',
    timeout: 2000,
    retryAttempts: 2
  };

  beforeEach(async () => {
    agent = new Agent(defaultConfig);
    await agent.initialize();
  });

  afterEach(async () => {
    await agent.cleanup();
  });

  describe('Initialization', () => {
    it('should initialize agent asynchronously', async () => {
      const newAgent = new Agent({ name: 'init-test' });
      
      // Test that initialization completes within reasonable time
      await expect(newAgent.initialize()).toResolveWithin(1000);
      
      expect(newAgent.name).toBe('init-test');
      await newAgent.cleanup();
    });

    it('should handle multiple concurrent initializations', async () => {
      const agents = Array.from({ length: 5 }, (_, i) => 
        new Agent({ name: `concurrent-${i}` })
      );

      const { results, duration } = await AsyncTestUtils.runConcurrently(
        agents.map(a => () => a.initialize())
      );

      expect(results).toHaveLength(5);
      expect(duration).toBeLessThan(2000); // Should be concurrent, not sequential

      // Cleanup
      await Promise.all(agents.map(a => a.cleanup()));
    });
  });

  describe('Request Processing', () => {
    it('should process requests asynchronously', async () => {
      const input = 'test input';
      
      const { result, duration } = await AsyncTestUtils.measureExecutionTime(
        () => agent.processRequest(input)
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe(`Processed: ${input}`);
      expect(result.timestamp).toBeGreaterThan(0);
      expect(duration).toBeGreaterThan(500); // Should take some time due to simulation
    });

    it('should handle errors in async processing', async () => {
      const errorInput = 'error test';
      
      const response = await agent.processRequest(errorInput);
      
      expect(response.success).toBe(false);
      expect(response.error).toBe('Processing failed');
      expect(response.timestamp).toBeGreaterThan(0);
    });

    it('should prevent concurrent processing', async () => {
      const promise1 = agent.processRequest('input1');
      
      // Try to process another request while first is still running
      await expect(agent.processRequest('input2')).rejects.toThrow(
        'Agent is already processing a request'
      );
      
      // Wait for first request to complete
      await promise1;
      
      // Now second request should work
      const response = await agent.processRequest('input2');
      expect(response.success).toBe(true);
    });

    it('should handle batch processing', async () => {
      const inputs = ['input1', 'input2', 'input3'];
      
      const responses = await agent.batchProcess(inputs);
      
      expect(responses).toHaveLength(3);
      responses.forEach((response, index) => {
        expect(response.success).toBe(true);
        expect(response.data).toBe(`Processed: ${inputs[index]}`);
      });
    });
  });

  describe('Timeout Handling', () => {
    it('should respect timeout in processWithTimeout', async () => {
      const shortTimeout = 100;
      
      // This should timeout since processing takes longer than 100ms
      await expect(
        agent.processWithTimeout('test', shortTimeout)
      ).toRejectWithin(200);
    });

    it('should complete within timeout when processing is fast', async () => {
      // Mock faster processing
      const fastAgent = new Agent({ name: 'fast-agent', timeout: 5000 });
      await fastAgent.initialize();
      
      // Override the delay to be very short
      (fastAgent as any).delay = () => Promise.resolve();
      
      const response = await fastAgent.processWithTimeout('test', 1000);
      expect(response.success).toBe(true);
      
      await fastAgent.cleanup();
    });
  });

  describe('Stream Processing', () => {
    it('should process stream asynchronously', async () => {
      const inputs = ['stream1', 'stream2', 'stream3'];
      const results: any[] = [];
      
      for await (const response of agent.streamProcess(inputs)) {
        results.push(response);
      }
      
      expect(results).toHaveLength(3);
      results.forEach((response, index) => {
        expect(response.success).toBe(true);
        expect(response.data).toBe(`Processed: ${inputs[index]}`);
      });
    });

    it('should handle errors in stream processing', async () => {
      const inputs = ['good', 'error', 'good'];
      const results: any[] = [];
      
      for await (const response of agent.streamProcess(inputs)) {
        results.push(response);
      }
      
      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);
    });
  });

  describe('Health Check', () => {
    it('should perform health check asynchronously', async () => {
      const health = await agent.healthCheck();
      
      expect(health.healthy).toBe(true);
      expect(health.latency).toBeGreaterThan(0);
      expect(health.latency).toBeLessThan(1000);
    });

    it('should measure health check latency accurately', async () => {
      const { result: health, duration } = await AsyncTestUtils.measureExecutionTime(
        () => agent.healthCheck()
      );
      
      expect(health.latency).toBeCloseTo(duration, -1); // Within 10ms
    });
  });

  describe('Async State Management', () => {
    it('should track processing state correctly', async () => {
      expect(agent.isActive).toBe(false);
      
      const processingPromise = agent.processRequest('test');
      
      // Should be active during processing
      expect(agent.isActive).toBe(true);
      
      await processingPromise;
      
      // Should be inactive after processing
      expect(agent.isActive).toBe(false);
    });

    it('should handle cleanup properly', async () => {
      const cleanupSpy = jest.spyOn(console, 'log');
      
      await agent.cleanup();
      
      expect(cleanupSpy).toHaveBeenCalledWith('Agent test-agent cleaned up');
    });
  });

  describe('Error Recovery', () => {
    it('should recover from processing errors', async () => {
      // First request with error
      const errorResponse = await agent.processRequest('error test');
      expect(errorResponse.success).toBe(false);
      
      // Second request should work normally
      const successResponse = await agent.processRequest('normal test');
      expect(successResponse.success).toBe(true);
    });

    it('should handle promise rejections gracefully', async () => {
      const mockAgent = new Agent({ name: 'mock-agent' });
      await mockAgent.initialize();
      
      // Mock processRequest to reject
      const originalProcess = mockAgent.processRequest;
      mockAgent.processRequest = jest.fn().mockRejectedValue(new Error('Mock error'));
      
      await expect(mockAgent.processRequest('test')).rejects.toThrow('Mock error');
      
      // Restore original method
      mockAgent.processRequest = originalProcess;
      
      await mockAgent.cleanup();
    });
  });

  describe('Performance Testing', () => {
    it('should handle high concurrency', async () => {
      const concurrentRequests = 10;
      const agents = Array.from({ length: concurrentRequests }, (_, i) => 
        new Agent({ name: `perf-agent-${i}` })
      );
      
      // Initialize all agents
      await Promise.all(agents.map(a => a.initialize()));
      
      const { results, duration, errors } = await AsyncTestUtils.runConcurrently(
        agents.map(a => () => a.processRequest('performance test')),
        { timeout: 10000 }
      );
      
      expect(errors).toHaveLength(0);
      expect(results).toHaveLength(concurrentRequests);
      expect(duration).toBeLessThan(5000); // Should complete reasonably fast
      
      // Cleanup
      await Promise.all(agents.map(a => a.cleanup()));
    });
  });
});

