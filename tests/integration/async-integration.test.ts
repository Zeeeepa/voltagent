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
      const input = 'integration test workflow';
      const results = await manager.processAcrossAgents(
        manager.agentNames,
        input
      );

      expect(results.size).toBe(3);
      Array.from(results.values()).forEach(response => {
        expect(response.success).toBe(true);
        expect(response.data).toBe(`Processed: ${input}`);
      });

      // Health check all agents
      const healthResults = await manager.healthCheckAll();
      expect(healthResults.size).toBe(3);
      Array.from(healthResults.values()).forEach(health => {
        expect(health.healthy).toBe(true);
      });

      // Cleanup
      await manager.cleanup();
      expect(manager.agentCount).toBe(0);
    });

    it('should handle complex multi-step async operations', async () => {
      // Step 1: Create agents with different configurations
      const agent1 = await manager.createAgent({ 
        name: 'step-agent-1', 
        timeout: 2000,
        retryAttempts: 2 
      });
      const agent2 = await manager.createAgent({ 
        name: 'step-agent-2', 
        timeout: 3000,
        retryAttempts: 3 
      });

      // Step 2: Process initial requests
      const initialResults = await Promise.all([
        agent1.processRequest('step 1 data'),
        agent2.processRequest('step 1 data')
      ]);

      expect(initialResults.every(r => r.success)).toBe(true);

      // Step 3: Use results from step 2 for batch processing
      const batchInputs = initialResults.map(r => `batch: ${r.data}`);
      const batchResults = await agent1.batchProcess(batchInputs);

      expect(batchResults).toHaveLength(2);
      expect(batchResults.every(r => r.success)).toBe(true);

      // Step 4: Stream processing with results
      const streamInputs = batchResults.map(r => `stream: ${r.data}`);
      const streamResults: any[] = [];
      
      for await (const result of agent2.streamProcess(streamInputs)) {
        streamResults.push(result);
      }

      expect(streamResults).toHaveLength(2);
      expect(streamResults.every(r => r.success)).toBe(true);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from partial system failures', async () => {
      // Create agents
      await manager.createAgent({ name: 'resilient-1' });
      await manager.createAgent({ name: 'resilient-2' });
      await manager.createAgent({ name: 'resilient-3' });

      // Simulate partial failure by making one agent fail
      const failingAgent = manager.getAgent('resilient-2')!;
      const originalProcess = failingAgent.processRequest;
      failingAgent.processRequest = jest.fn().mockRejectedValue(new Error('Simulated failure'));

      // Process across all agents - some should succeed, one should fail
      const results = await manager.processAcrossAgents(
        ['resilient-1', 'resilient-2', 'resilient-3'],
        'resilience test'
      );

      // Should have results from working agents
      expect(results.get('resilient-1')?.success).toBe(true);
      expect(results.get('resilient-3')?.success).toBe(true);

      // Restore failing agent
      failingAgent.processRequest = originalProcess;

      // Verify system can recover
      const recoveryResults = await manager.processAcrossAgents(
        ['resilient-1', 'resilient-2', 'resilient-3'],
        'recovery test'
      );

      expect(recoveryResults.size).toBe(3);
      Array.from(recoveryResults.values()).forEach(result => {
        expect(result.success).toBe(true);
      });
    });

    it('should handle cascading async operations with error recovery', async () => {
      const agent = await manager.createAgent({ name: 'cascade-agent' });

      // Test retry mechanism with eventual success
      let attempts = 0;
      const flakyOperation = async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return agent.processRequest('cascade success');
      };

      const result = await AsyncTestUtils.retry(flakyOperation, {
        maxAttempts: 5,
        delay: 100,
        backoff: 'exponential'
      });

      expect(result.success).toBe(true);
      expect(attempts).toBe(3);
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle high concurrency across multiple agents', async () => {
      // Create multiple agents
      const agentCount = 10;
      const agents = await Promise.all(
        Array.from({ length: agentCount }, (_, i) =>
          manager.createAgent({ name: `load-agent-${i}` })
        )
      );

      expect(agents).toHaveLength(agentCount);

      // Generate high concurrent load
      const operationsPerAgent = 5;
      const totalOperations = agentCount * operationsPerAgent;
      
      const operations = agents.flatMap(agent =>
        Array.from({ length: operationsPerAgent }, (_, i) =>
          () => agent.processRequest(`load test ${i}`)
        )
      );

      const { results, duration, errors } = await AsyncTestUtils.runConcurrently(
        operations,
        { timeout: 15000 }
      );

      expect(errors).toHaveLength(0);
      expect(results).toHaveLength(totalOperations);
      expect(duration).toBeLessThan(10000); // Should handle load efficiently
      
      // Verify all results are successful
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });

    it('should maintain performance under memory pressure', async () => {
      // Create agents and generate large data sets
      const agent = await manager.createAgent({ name: 'memory-test-agent' });
      
      // Generate large batch of operations
      const largeInputs = Array.from({ length: 100 }, (_, i) => 
        `large data set ${i} ${'x'.repeat(1000)}`
      );

      const { result: batchResults, duration } = await AsyncTestUtils.measureExecutionTime(
        () => agent.batchProcess(largeInputs)
      );

      expect(batchResults).toHaveLength(100);
      expect(batchResults.every(r => r.success)).toBe(true);
      expect(duration).toBeLessThan(30000); // Should complete within reasonable time
    });

    it('should handle concurrent user scenarios', async () => {
      // Simulate multiple users with different usage patterns
      const userAgents = await Promise.all([
        manager.createAgent({ name: 'user-1-agent' }),
        manager.createAgent({ name: 'user-2-agent' }),
        manager.createAgent({ name: 'user-3-agent' })
      ]);

      // User 1: Heavy batch processing
      const user1Operations = () => Promise.all([
        userAgents[0].batchProcess(['batch1', 'batch2', 'batch3']),
        userAgents[0].processWithTimeout('timeout test', 5000)
      ]);

      // User 2: Stream processing
      const user2Operations = async () => {
        const results: any[] = [];
        for await (const result of userAgents[1].streamProcess(['stream1', 'stream2'])) {
          results.push(result);
        }
        return results;
      };

      // User 3: Health monitoring and simple requests
      const user3Operations = () => Promise.all([
        userAgents[2].healthCheck(),
        userAgents[2].processRequest('simple request'),
        userAgents[2].healthCheck()
      ]);

      // Run all user scenarios concurrently
      const { results, errors } = await AsyncTestUtils.runConcurrently([
        user1Operations,
        user2Operations,
        user3Operations
      ]);

      expect(errors).toHaveLength(0);
      expect(results).toHaveLength(3);

      // Verify user 1 results
      const [user1Batch, user1Timeout] = results[0];
      expect(user1Batch).toHaveLength(3);
      expect(user1Timeout.success).toBe(true);

      // Verify user 2 results
      const user2Stream = results[1];
      expect(user2Stream).toHaveLength(2);

      // Verify user 3 results
      const [user3Health1, user3Process, user3Health2] = results[2];
      expect(user3Health1.healthy).toBe(true);
      expect(user3Process.success).toBe(true);
      expect(user3Health2.healthy).toBe(true);
    });
  });

  describe('Real-world Simulation', () => {
    it('should simulate AI agent pipeline with async operations', async () => {
      // Simulate a real AI agent pipeline
      const preprocessAgent = await manager.createAgent({ 
        name: 'preprocess-agent',
        timeout: 3000 
      });
      const analysisAgent = await manager.createAgent({ 
        name: 'analysis-agent',
        timeout: 5000 
      });
      const responseAgent = await manager.createAgent({ 
        name: 'response-agent',
        timeout: 2000 
      });

      // Simulate user input processing pipeline
      const userInput = 'complex user query requiring AI processing';

      // Step 1: Preprocessing
      const preprocessResult = await preprocessAgent.processRequest(
        `preprocess: ${userInput}`
      );
      expect(preprocessResult.success).toBe(true);

      // Step 2: Analysis (using preprocessed data)
      const analysisResult = await analysisAgent.processRequest(
        `analyze: ${preprocessResult.data}`
      );
      expect(analysisResult.success).toBe(true);

      // Step 3: Response generation (using analysis)
      const responseResult = await responseAgent.processRequest(
        `respond: ${analysisResult.data}`
      );
      expect(responseResult.success).toBe(true);

      // Verify the pipeline completed successfully
      expect(responseResult.data).toContain('Processed');
      expect(responseResult.timestamp).toBeGreaterThan(0);

      // Test pipeline with concurrent requests
      const concurrentInputs = [
        'query 1', 'query 2', 'query 3'
      ];

      const pipelinePromises = concurrentInputs.map(async (input) => {
        const prep = await preprocessAgent.processRequest(`preprocess: ${input}`);
        const analysis = await analysisAgent.processRequest(`analyze: ${prep.data}`);
        const response = await responseAgent.processRequest(`respond: ${analysis.data}`);
        return { input, response };
      });

      const pipelineResults = await Promise.all(pipelinePromises);
      
      expect(pipelineResults).toHaveLength(3);
      pipelineResults.forEach(({ input, response }) => {
        expect(response.success).toBe(true);
        expect(response.data).toContain('Processed');
      });
    });

    it('should handle system monitoring and health checks', async () => {
      // Create a monitoring scenario
      const monitoredAgents = await Promise.all([
        manager.createAgent({ name: 'service-1' }),
        manager.createAgent({ name: 'service-2' }),
        manager.createAgent({ name: 'service-3' }),
        manager.createAgent({ name: 'service-4' })
      ]);

      // Continuous health monitoring simulation
      const healthCheckRounds = 3;
      const healthHistory: any[] = [];

      for (let round = 0; round < healthCheckRounds; round++) {
        const healthResults = await manager.healthCheckAll();
        healthHistory.push({
          round,
          timestamp: Date.now(),
          results: Array.from(healthResults.entries())
        });

        // Wait between health checks
        await AsyncTestUtils.delay(100);
      }

      expect(healthHistory).toHaveLength(healthCheckRounds);
      
      // Verify all health checks passed
      healthHistory.forEach(({ results }) => {
        expect(results).toHaveLength(4);
        results.forEach(([agentName, health]) => {
          expect(health.healthy).toBe(true);
          expect(health.latency).toBeGreaterThan(0);
        });
      });

      // Test system under load while monitoring
      const loadOperations = monitoredAgents.map(agent =>
        () => agent.batchProcess(['load1', 'load2', 'load3'])
      );

      const { results: loadResults } = await AsyncTestUtils.runConcurrently(loadOperations);
      
      // Health check after load
      const postLoadHealth = await manager.healthCheckAll();
      
      expect(loadResults).toHaveLength(4);
      expect(postLoadHealth.size).toBe(4);
      Array.from(postLoadHealth.values()).forEach(health => {
        expect(health.healthy).toBe(true);
      });
    });
  });
});

