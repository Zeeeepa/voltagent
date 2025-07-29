/**
 * Async tests for AgentManager class
 */

import { AgentManager } from '../src/agent-manager';
import { AgentConfig } from '../src/agent';
import { AsyncTestUtils } from './utils/async-test-utils';

describe('AgentManager - Async Operations', () => {
  let manager: AgentManager;

  beforeEach(() => {
    manager = new AgentManager();
  });

  afterEach(async () => {
    await manager.cleanup();
  });

  describe('Agent Creation and Management', () => {
    it('should create agents asynchronously', async () => {
      const config: AgentConfig = { name: 'test-agent-1' };
      
      const agent = await manager.createAgent(config);
      
      expect(agent.name).toBe('test-agent-1');
      expect(manager.agentCount).toBe(1);
      expect(manager.agentNames).toContain('test-agent-1');
    });

    it('should create multiple agents concurrently', async () => {
      const configs: AgentConfig[] = [
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

    it('should retrieve agents by name', async () => {
      await manager.createAgent({ name: 'retrievable-agent' });
      
      const agent = manager.getAgent('retrievable-agent');
      expect(agent).toBeDefined();
      expect(agent!.name).toBe('retrievable-agent');
      
      const nonExistent = manager.getAgent('non-existent');
      expect(nonExistent).toBeUndefined();
    });
  });

  describe('Cross-Agent Processing', () => {
    beforeEach(async () => {
      await manager.createAgent({ name: 'agent-1' });
      await manager.createAgent({ name: 'agent-2' });
      await manager.createAgent({ name: 'agent-3' });
    });

    it('should process requests across multiple agents', async () => {
      const agentNames = ['agent-1', 'agent-2', 'agent-3'];
      const input = 'cross-agent test';
      
      const results = await manager.processAcrossAgents(agentNames, input);
      
      expect(results.size).toBe(3);
      
      for (const [name, response] of results) {
        expect(agentNames).toContain(name);
        expect(response.success).toBe(true);
        expect(response.data).toBe(`Processed: ${input}`);
      }
    });

    it('should handle errors in cross-agent processing', async () => {
      const agentNames = ['agent-1', 'agent-2'];
      const errorInput = 'error test';
      
      const results = await manager.processAcrossAgents(agentNames, errorInput);
      
      expect(results.size).toBe(2);
      
      for (const [, response] of results) {
        expect(response.success).toBe(false);
        expect(response.error).toBe('Processing failed');
      }
    });

    it('should throw error for non-existent agents', async () => {
      const agentNames = ['agent-1', 'non-existent-agent'];
      
      await expect(
        manager.processAcrossAgents(agentNames, 'test')
      ).rejects.toThrow('Agent non-existent-agent not found');
    });

    it('should handle partial failures in cross-agent processing', async () => {
      // Create one more agent that we'll remove to simulate failure
      await manager.createAgent({ name: 'temp-agent' });
      
      const agentNames = ['agent-1', 'agent-2', 'temp-agent'];
      
      // Remove temp-agent to simulate it being unavailable
      const tempAgent = manager.getAgent('temp-agent');
      await tempAgent!.cleanup();
      (manager as any).agents.delete('temp-agent');
      
      await expect(
        manager.processAcrossAgents(agentNames, 'test')
      ).rejects.toThrow('Agent temp-agent not found');
    });
  });

  describe('Health Monitoring', () => {
    beforeEach(async () => {
      await manager.createAgent({ name: 'health-agent-1' });
      await manager.createAgent({ name: 'health-agent-2' });
    });

    it('should perform health checks on all agents', async () => {
      const healthResults = await manager.healthCheckAll();
      
      expect(healthResults.size).toBe(2);
      
      for (const [name, health] of healthResults) {
        expect(['health-agent-1', 'health-agent-2']).toContain(name);
        expect(health.healthy).toBe(true);
        expect(health.latency).toBeGreaterThan(0);
      }
    });

    it('should measure health check performance', async () => {
      const { result: healthResults, duration } = await AsyncTestUtils.measureExecutionTime(
        () => manager.healthCheckAll()
      );
      
      expect(healthResults.size).toBe(2);
      expect(duration).toBeLessThan(1000); // Should be reasonably fast
    });
  });

  describe('Event System', () => {
    it('should emit events asynchronously', async () => {
      const eventData: any[] = [];
      
      manager.on('agentCreated', (data: any) => {
        eventData.push(data);
      });
      
      await manager.createAgent({ name: 'event-test-agent' });
      
      // Wait for async event handling
      await AsyncTestUtils.delay(10);
      
      expect(eventData).toHaveLength(1);
      expect(eventData[0]).toEqual({ agent: 'event-test-agent' });
    });

    it('should handle multiple event listeners', async () => {
      const listener1Data: any[] = [];
      const listener2Data: any[] = [];
      
      manager.on('agentCreated', (data: any) => listener1Data.push(data));
      manager.on('agentCreated', (data: any) => listener2Data.push(data));
      
      await manager.createAgent({ name: 'multi-listener-agent' });
      
      // Wait for async event handling
      await AsyncTestUtils.delay(10);
      
      expect(listener1Data).toHaveLength(1);
      expect(listener2Data).toHaveLength(1);
    });
  });

  describe('Cleanup and Resource Management', () => {
    it('should cleanup all agents asynchronously', async () => {
      await manager.createAgent({ name: 'cleanup-agent-1' });
      await manager.createAgent({ name: 'cleanup-agent-2' });
      
      expect(manager.agentCount).toBe(2);
      
      await manager.cleanup();
      
      expect(manager.agentCount).toBe(0);
      expect(manager.agentNames).toHaveLength(0);
    });

    it('should handle cleanup errors gracefully', async () => {
      await manager.createAgent({ name: 'error-cleanup-agent' });
      
      const agent = manager.getAgent('error-cleanup-agent');
      
      // Mock cleanup to throw error
      const originalCleanup = agent!.cleanup;
      agent!.cleanup = jest.fn().mockRejectedValue(new Error('Cleanup error'));
      
      // Should not throw, but handle gracefully
      await expect(manager.cleanup()).resolves.not.toThrow();
      
      expect(manager.agentCount).toBe(0);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent agent creation and processing', async () => {
      const operations = [
        () => manager.createAgent({ name: 'concurrent-1' }),
        () => manager.createAgent({ name: 'concurrent-2' }),
        () => manager.createAgent({ name: 'concurrent-3' })
      ];

      const { results, errors } = await AsyncTestUtils.runConcurrently(operations);
      
      expect(errors).toHaveLength(0);
      expect(results).toHaveLength(3);
      expect(manager.agentCount).toBe(3);
      
      // Now test concurrent processing
      const processResults = await manager.processAcrossAgents(
        ['concurrent-1', 'concurrent-2', 'concurrent-3'],
        'concurrent test'
      );
      
      expect(processResults.size).toBe(3);
    });

    it('should handle high load scenarios', async () => {
      // Create many agents
      const agentCount = 20;
      const createOperations = Array.from({ length: agentCount }, (_, i) => 
        () => manager.createAgent({ name: `load-agent-${i}` })
      );

      const { results, duration, errors } = await AsyncTestUtils.runConcurrently(
        createOperations,
        { timeout: 15000 }
      );

      expect(errors).toHaveLength(0);
      expect(results).toHaveLength(agentCount);
      expect(manager.agentCount).toBe(agentCount);
      expect(duration).toBeLessThan(10000); // Should handle load efficiently
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should recover from agent creation failures', async () => {
      // Mock Agent constructor to fail once
      const originalAgent = require('../src/agent').Agent;
      let failCount = 0;
      
      const MockAgent = class extends originalAgent {
        constructor(config: AgentConfig) {
          if (failCount === 0) {
            failCount++;
            throw new Error('Agent creation failed');
          }
          super(config);
        }
      };
      
      // Replace Agent temporarily
      jest.doMock('../src/agent', () => ({ Agent: MockAgent }));
      
      // First creation should fail
      await expect(
        manager.createAgent({ name: 'failing-agent' })
      ).rejects.toThrow('Agent creation failed');
      
      // Second creation should succeed
      const agent = await manager.createAgent({ name: 'success-agent' });
      expect(agent.name).toBe('success-agent');
      
      jest.clearAllMocks();
    });

    it('should handle async operation timeouts', async () => {
      await manager.createAgent({ name: 'timeout-agent' });
      
      // Mock processRequest to take very long
      const agent = manager.getAgent('timeout-agent');
      const originalProcess = agent!.processRequest;
      agent!.processRequest = jest.fn().mockImplementation(
        () => AsyncTestUtils.delay(10000).then(() => ({ success: true }))
      );
      
      // This should timeout quickly
      const startTime = Date.now();
      await expect(
        Promise.race([
          manager.processAcrossAgents(['timeout-agent'], 'test'),
          AsyncTestUtils.delayedReject(1000, new Error('Test timeout'))
        ])
      ).rejects.toThrow('Test timeout');
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1500);
    });
  });
});

