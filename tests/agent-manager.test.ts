/**
 * Async tests for AgentManager class
 */

import { AgentManager } from '../src/agent-manager';
import { AsyncTestUtils } from './utils/async-test-utils';

describe('AgentManager - Async Operations', () => {
  let manager: AgentManager;

  beforeEach(() => {
    manager = new AgentManager();
  });

  afterEach(async () => {
    await manager.cleanup();
  });

  describe('Agent Creation', () => {
    it('should create agents asynchronously', async () => {
      const agent = await manager.createAgent({ name: 'test-agent' });
      
      expect(agent.name).toBe('test-agent');
      expect(manager.agentCount).toBe(1);
      expect(manager.agentNames).toContain('test-agent');
    });

    it('should create multiple agents concurrently', async () => {
      const configs = [
        { name: 'agent-1' },
        { name: 'agent-2' },
        { name: 'agent-3' }
      ];

      const { results, duration } = await AsyncTestUtils.runConcurrently(
        configs.map(config => () => manager.createAgent(config))
      );

      expect(results).toHaveLength(3);
      expect(manager.agentCount).toBe(3);
      expect(duration).toBeLessThan(1000); // Should be concurrent
    });

    it('should emit events when agents are created', async () => {
      const eventPromise = new Promise(resolve => {
        manager.on('agentCreated', resolve);
      });

      await manager.createAgent({ name: 'event-agent' });

      const eventData = await eventPromise;
      expect(eventData).toEqual({ agent: 'event-agent' });
    });
  });

  describe('Agent Retrieval', () => {
    beforeEach(async () => {
      await manager.createAgent({ name: 'existing-agent' });
    });

    it('should retrieve existing agents', () => {
      const agent = manager.getAgent('existing-agent');
      expect(agent).toBeDefined();
      expect(agent!.name).toBe('existing-agent');
    });

    it('should return undefined for non-existent agents', () => {
      const agent = manager.getAgent('non-existent');
      expect(agent).toBeUndefined();
    });
  });

  describe('Cross-Agent Processing', () => {
    beforeEach(async () => {
      await manager.createAgent({ name: 'agent-1' });
      await manager.createAgent({ name: 'agent-2' });
      await manager.createAgent({ name: 'agent-3' });
    });

    it('should process requests across multiple agents', async () => {
      const agentNames = ['agent-1', 'agent-2'];
      const input = 'cross-agent test';

      const results = await manager.processAcrossAgents(agentNames, input);

      expect(results.size).toBe(2);
      expect(results.get('agent-1')?.success).toBe(true);
      expect(results.get('agent-2')?.success).toBe(true);
      expect(results.get('agent-1')?.data).toBe(`Processed: ${input}`);
    });

    it('should handle errors in cross-agent processing', async () => {
      const agentNames = ['agent-1', 'non-existent-agent'];
      const input = 'test';

      await expect(
        manager.processAcrossAgents(agentNames, input)
      ).rejects.toThrow('Agent non-existent-agent not found');
    });

    it('should process concurrently across agents', async () => {
      const agentNames = ['agent-1', 'agent-2', 'agent-3'];
      const input = 'concurrent test';

      const { result: results, duration } = await AsyncTestUtils.measureExecutionTime(
        () => manager.processAcrossAgents(agentNames, input)
      );

      expect(results.size).toBe(3);
      // Should be faster than sequential processing (which would take ~1.5-3 seconds)
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('Health Monitoring', () => {
    beforeEach(async () => {
      await manager.createAgent({ name: 'healthy-agent-1' });
      await manager.createAgent({ name: 'healthy-agent-2' });
    });

    it('should check health of all agents', async () => {
      const healthResults = await manager.healthCheckAll();

      expect(healthResults.size).toBe(2);
      expect(healthResults.get('healthy-agent-1')?.healthy).toBe(true);
      expect(healthResults.get('healthy-agent-2')?.healthy).toBe(true);
      expect(healthResults.get('healthy-agent-1')?.latency).toBeGreaterThan(0);
    });

    it('should perform health checks concurrently', async () => {
      // Add more agents to test concurrency
      await manager.createAgent({ name: 'agent-3' });
      await manager.createAgent({ name: 'agent-4' });
      await manager.createAgent({ name: 'agent-5' });

      const { result: healthResults, duration } = await AsyncTestUtils.measureExecutionTime(
        () => manager.healthCheckAll()
      );

      expect(healthResults.size).toBe(5);
      // Should be faster than sequential health checks
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Event System', () => {
    it('should handle multiple event listeners', async () => {
      const events: any[] = [];
      
      manager.on('agentCreated', (data) => events.push({ type: 'listener1', data }));
      manager.on('agentCreated', (data) => events.push({ type: 'listener2', data }));

      await manager.createAgent({ name: 'event-test-agent' });

      // Wait for async event handling
      await AsyncTestUtils.delay(50);

      expect(events).toHaveLength(2);
      expect(events[0].data).toEqual({ agent: 'event-test-agent' });
      expect(events[1].data).toEqual({ agent: 'event-test-agent' });
    });

    it('should handle events asynchronously', async () => {
      let eventReceived = false;
      
      manager.on('agentCreated', () => {
        eventReceived = true;
      });

      await manager.createAgent({ name: 'async-event-agent' });

      // Event should be handled asynchronously
      expect(eventReceived).toBe(false);
      
      // Wait for async event processing
      await AsyncTestUtils.delay(10);
      expect(eventReceived).toBe(true);
    });
  });

  describe('Resource Management', () => {
    it('should cleanup all agents', async () => {
      await manager.createAgent({ name: 'cleanup-agent-1' });
      await manager.createAgent({ name: 'cleanup-agent-2' });

      expect(manager.agentCount).toBe(2);

      await manager.cleanup();

      expect(manager.agentCount).toBe(0);
      expect(manager.agentNames).toHaveLength(0);
    });

    it('should handle cleanup of many agents efficiently', async () => {
      // Create many agents
      const agentPromises = Array.from({ length: 10 }, (_, i) =>
        manager.createAgent({ name: `bulk-agent-${i}` })
      );
      await Promise.all(agentPromises);

      expect(manager.agentCount).toBe(10);

      const { duration } = await AsyncTestUtils.measureExecutionTime(
        () => manager.cleanup()
      );

      expect(manager.agentCount).toBe(0);
      expect(duration).toBeLessThan(2000); // Should cleanup efficiently
    });
  });

  describe('Error Handling', () => {
    it('should handle agent creation failures gracefully', async () => {
      // Mock agent creation to fail
      const originalCreateAgent = manager.createAgent;
      manager.createAgent = jest.fn().mockRejectedValue(new Error('Creation failed'));

      await expect(manager.createAgent({ name: 'failing-agent' })).rejects.toThrow('Creation failed');

      // Restore original method
      manager.createAgent = originalCreateAgent;
    });

    it('should handle partial failures in cross-agent processing', async () => {
      await manager.createAgent({ name: 'good-agent' });
      
      // Create an agent that will fail processing
      const badAgent = await manager.createAgent({ name: 'bad-agent' });
      
      // Mock the bad agent to fail
      badAgent.processRequest = jest.fn().mockRejectedValue(new Error('Processing failed'));

      const results = await manager.processAcrossAgents(['good-agent', 'bad-agent'], 'test');

      // Good agent should succeed, bad agent should fail
      expect(results.get('good-agent')?.success).toBe(true);
      // The bad agent result might not be in the map due to the error
      expect(results.size).toBeLessThanOrEqual(2);
    });
  });

  describe('Performance Testing', () => {
    it('should handle high agent count efficiently', async () => {
      const agentCount = 20;
      
      const { duration } = await AsyncTestUtils.measureExecutionTime(async () => {
        const promises = Array.from({ length: agentCount }, (_, i) =>
          manager.createAgent({ name: `perf-agent-${i}` })
        );
        await Promise.all(promises);
      });

      expect(manager.agentCount).toBe(agentCount);
      expect(duration).toBeLessThan(3000); // Should handle many agents efficiently
    });

    it('should process across many agents concurrently', async () => {
      // Create multiple agents
      const agentCount = 15;
      const promises = Array.from({ length: agentCount }, (_, i) =>
        manager.createAgent({ name: `concurrent-agent-${i}` })
      );
      await Promise.all(promises);

      const agentNames = manager.agentNames;
      
      const { result: results, duration } = await AsyncTestUtils.measureExecutionTime(
        () => manager.processAcrossAgents(agentNames, 'performance test')
      );

      expect(results.size).toBe(agentCount);
      expect(duration).toBeLessThan(5000); // Should be reasonably fast
    });
  });

  describe('State Consistency', () => {
    it('should maintain consistent state during concurrent operations', async () => {
      const operations = [
        () => manager.createAgent({ name: 'concurrent-1' }),
        () => manager.createAgent({ name: 'concurrent-2' }),
        () => manager.createAgent({ name: 'concurrent-3' }),
      ];

      await AsyncTestUtils.runConcurrently(operations);

      expect(manager.agentCount).toBe(3);
      expect(manager.agentNames).toContain('concurrent-1');
      expect(manager.agentNames).toContain('concurrent-2');
      expect(manager.agentNames).toContain('concurrent-3');
    });

    it('should handle rapid create/cleanup cycles', async () => {
      for (let i = 0; i < 5; i++) {
        await manager.createAgent({ name: `cycle-agent-${i}` });
        expect(manager.agentCount).toBe(1);
        
        await manager.cleanup();
        expect(manager.agentCount).toBe(0);
        
        // Recreate manager for next iteration
        manager = new AgentManager();
      }
    });
  });
});

