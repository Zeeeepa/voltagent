/**
 * Integration tests for async operations across the entire framework
 */

import { Agent, AgentManager } from '../../src';
import { AsyncTestUtils } from '../utils/async-test-utils';

describe('Async Integration Tests', () => {
  let manager: AgentManager;

  beforeEach(() => {
    manager = new AgentManager();
  });

  afterEach(async () => {
    await manager.cleanup();
  });

  describe('End-to-End Async Workflows', () => {
    it('should handle complete agent lifecycle asynchronously', async () => {
      // Create multiple agents
      const agentConfigs = [
        { name: 'workflow-agent-1', timeout: 3000 },
        { name: 'workflow-agent-2', timeout: 3000 },
        { name: 'workflow-agent-3', timeout: 3000 }
      ];

      const agents = await Promise.all(
        agentConfigs.map(config => manager.createAgent(config))
      );

      expect(agents).toHaveLength(3);
      expect(manager.agentCount).toBe(3);

      // Process requests across all agents
      const processResults = await manager.processAcrossAgents(
        agentConfigs.map(c => c.name),
        'integration test'
      );

      expect(processResults.size).toBe(3);
      for (const [name, response] of processResults) {
        expect(response.success).toBe(true);
        expect(response.data).toBe('Processed: integration test');
      }

      // Health check all agents
      const healthResults = await manager.healthCheckAll();
      expect(healthResults.size).toBe(3);
      for (const [, health] of healthResults) {
        expect(health.healthy).toBe(true);
      }

      // Cleanup
      await manager.cleanup();
      expect(manager.agentCount).toBe(0);
    });

    it('should handle mixed success/failure scenarios', async () => {
      await manager.createAgent({ name: 'success-agent' });
      await manager.createAgent({ name: 'error-agent' });

      const inputs = ['normal input', 'error input'];
      const agentNames = ['success-agent', 'error-agent'];

      const results = await Promise.allSettled([
        manager.processAcrossAgents(['success-agent'], inputs[0]),
        manager.processAcrossAgents(['error-agent'], inputs[1])
      ]);

      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('fulfilled');

      const successResult = (results[0] as PromiseFulfilledResult<any>).value;
      const errorResult = (results[1] as PromiseFulfilledResult<any>).value;

      expect(successResult.get('success-agent').success).toBe(true);
      expect(errorResult.get('error-agent').success).toBe(false);
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle high-load concurrent operations', async () => {
      const agentCount = 50;
      const requestsPerAgent = 10;

      // Create many agents concurrently
      const createOperations = Array.from({ length: agentCount }, (_, i) =>
        () => manager.createAgent({ name: `load-agent-${i}`, timeout: 5000 })
      );

      const { results: agents, duration: createDuration } = await AsyncTestUtils.runConcurrently(
        createOperations,
        { timeout: 30000 }
      );

      expect(agents).toHaveLength(agentCount);
      expect(createDuration).toBeLessThan(15000);

      // Process multiple requests per agent
      const processOperations = agents.flatMap((agent, agentIndex) =>
        Array.from({ length: requestsPerAgent }, (_, reqIndex) =>
          () => agent.processRequest(`load-test-${agentIndex}-${reqIndex}`)
        )
      );

      const { results: processResults, duration: processDuration } = await AsyncTestUtils.runConcurrently(
        processOperations,
        { timeout: 60000 }
      );

      expect(processResults).toHaveLength(agentCount * requestsPerAgent);
      expect(processDuration).toBeLessThan(30000);

      // Verify all results are successful
      processResults.forEach(result => {
        expect(result.success).toBe(true);
      });
    });

    it('should maintain performance under stress', async () => {
      const stressTestAgents = 20;
      
      // Create agents
      await Promise.all(
        Array.from({ length: stressTestAgents }, (_, i) =>
          manager.createAgent({ name: `stress-agent-${i}` })
        )
      );

      // Measure baseline performance
      const baselineStart = Date.now();
      await manager.processAcrossAgents(['stress-agent-0'], 'baseline test');
      const baselineTime = Date.now() - baselineStart;

      // Measure performance under load
      const loadStart = Date.now();
      const loadPromises = Array.from({ length: stressTestAgents }, (_, i) =>
        manager.processAcrossAgents([`stress-agent-${i}`], `load test ${i}`)
      );
      await Promise.all(loadPromises);
      const loadTime = Date.now() - loadStart;

      // Performance should not degrade significantly
      expect(loadTime).toBeLessThan(baselineTime * stressTestAgents * 0.5); // Allow some overhead
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from cascading failures', async () => {
      await manager.createAgent({ name: 'resilient-agent-1' });
      await manager.createAgent({ name: 'resilient-agent-2' });
      await manager.createAgent({ name: 'resilient-agent-3' });

      // Simulate cascading failures
      const failureInputs = ['error test', 'error test', 'normal test'];
      const agentNames = ['resilient-agent-1', 'resilient-agent-2', 'resilient-agent-3'];

      const results = await Promise.allSettled(
        agentNames.map((name, index) =>
          manager.processAcrossAgents([name], failureInputs[index])
        )
      );

      // First two should have errors, third should succeed
      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('fulfilled');
      expect(results[2].status).toBe('fulfilled');

      const result1 = (results[0] as PromiseFulfilledResult<any>).value;
      const result2 = (results[1] as PromiseFulfilledResult<any>).value;
      const result3 = (results[2] as PromiseFulfilledResult<any>).value;

      expect(result1.get('resilient-agent-1').success).toBe(false);
      expect(result2.get('resilient-agent-2').success).toBe(false);
      expect(result3.get('resilient-agent-3').success).toBe(true);

      // System should still be functional
      const healthResults = await manager.healthCheckAll();
      expect(healthResults.size).toBe(3);
    });

    it('should handle timeout scenarios gracefully', async () => {
      await manager.createAgent({ name: 'timeout-agent', timeout: 100 });

      const agent = manager.getAgent('timeout-agent');
      
      // Mock a very slow operation
      const originalProcess = agent!.processRequest;
      agent!.processRequest = jest.fn().mockImplementation(async () => {
        await AsyncTestUtils.delay(5000);
        return { success: true, data: 'slow result', timestamp: Date.now() };
      });

      // This should timeout
      await expect(
        agent!.processWithTimeout('slow test', 200)
      ).rejects.toThrow(/timed out/);

      // Agent should still be functional after timeout
      agent!.processRequest = originalProcess;
      const response = await agent!.processRequest('normal test');
      expect(response.success).toBe(true);
    });
  });

  describe('Memory and Resource Management', () => {
    it('should properly cleanup resources in long-running scenarios', async () => {
      const iterations = 10;
      const agentsPerIteration = 5;

      for (let i = 0; i < iterations; i++) {
        // Create agents
        const agents = await Promise.all(
          Array.from({ length: agentsPerIteration }, (_, j) =>
            manager.createAgent({ name: `temp-agent-${i}-${j}` })
          )
        );

        // Use agents
        await Promise.all(
          agents.map(agent => agent.processRequest(`iteration-${i}`))
        );

        // Cleanup this iteration
        await manager.cleanup();
        manager = new AgentManager();
      }

      // Final verification
      expect(manager.agentCount).toBe(0);
    });

    it('should handle memory pressure scenarios', async () => {
      const largeDataSize = 1000;
      
      await manager.createAgent({ name: 'memory-agent' });
      const agent = manager.getAgent('memory-agent');

      // Process large amounts of data
      const largeInputs = Array.from({ length: largeDataSize }, (_, i) =>
        `large-data-${i}-${'x'.repeat(100)}`
      );

      const results = await Promise.all(
        largeInputs.map(input => agent!.processRequest(input))
      );

      expect(results).toHaveLength(largeDataSize);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Memory should be manageable
      const memUsage = process.memoryUsage();
      expect(memUsage.heapUsed).toBeLessThan(500 * 1024 * 1024); // Less than 500MB
    });
  });

  describe('Real-world Simulation', () => {
    it('should simulate realistic AI agent workflow', async () => {
      // Simulate a realistic AI agent scenario
      const agentTypes = ['analyzer', 'processor', 'validator'];
      
      // Create specialized agents
      const agents = await Promise.all(
        agentTypes.map(type => manager.createAgent({ 
          name: `${type}-agent`,
          timeout: 10000
        }))
      );

      // Simulate a pipeline workflow
      const inputData = 'complex AI processing task';
      
      // Step 1: Analysis
      const analysisResult = await manager.processAcrossAgents(['analyzer-agent'], inputData);
      expect(analysisResult.get('analyzer-agent').success).toBe(true);

      // Step 2: Processing (based on analysis)
      const processResult = await manager.processAcrossAgents(['processor-agent'], 
        `processed-${inputData}`);
      expect(processResult.get('processor-agent').success).toBe(true);

      // Step 3: Validation
      const validationResult = await manager.processAcrossAgents(['validator-agent'], 
        `validated-processed-${inputData}`);
      expect(validationResult.get('validator-agent').success).toBe(true);

      // Health check the entire pipeline
      const pipelineHealth = await manager.healthCheckAll();
      expect(pipelineHealth.size).toBe(3);
      
      for (const [, health] of pipelineHealth) {
        expect(health.healthy).toBe(true);
        expect(health.latency).toBeLessThan(1000);
      }
    });

    it('should handle concurrent user requests', async () => {
      const userCount = 25;
      const requestsPerUser = 4;

      // Create agents to handle user requests
      await Promise.all([
        manager.createAgent({ name: 'user-handler-1' }),
        manager.createAgent({ name: 'user-handler-2' }),
        manager.createAgent({ name: 'user-handler-3' })
      ]);

      // Simulate concurrent user requests
      const userRequests = Array.from({ length: userCount }, (_, userId) =>
        Array.from({ length: requestsPerUser }, (_, reqId) => ({
          userId,
          reqId,
          handler: `user-handler-${(userId % 3) + 1}`,
          data: `user-${userId}-request-${reqId}`
        }))
      ).flat();

      const { results, duration, errors } = await AsyncTestUtils.runConcurrently(
        userRequests.map(req => () => 
          manager.processAcrossAgents([req.handler], req.data)
        ),
        { timeout: 30000 }
      );

      expect(errors).toHaveLength(0);
      expect(results).toHaveLength(userCount * requestsPerUser);
      expect(duration).toBeLessThan(15000); // Should handle concurrent load efficiently

      // Verify all requests were processed successfully
      results.forEach(result => {
        const response = Array.from(result.values())[0];
        expect(response.success).toBe(true);
      });
    });
  });
});

