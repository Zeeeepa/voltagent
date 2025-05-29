import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Orchestrator } from "./index";
import { Agent } from "../agent";
import type { WorkflowDefinition, OrchestratorConfig } from "./types";

// Mock agent for testing
class MockAgent extends Agent<any> {
  constructor(id: string, name: string) {
    super({
      id,
      name,
      instructions: "Test agent",
      llm: {
        generateText: vi.fn().mockResolvedValue({ text: "Mock response" }),
        streamText: vi.fn(),
        generateObject: vi.fn(),
        streamObject: vi.fn(),
        getModelIdentifier: vi.fn().mockReturnValue("mock-model"),
      } as any,
      model: "mock-model" as any,
    });
  }
}

describe("Orchestrator", () => {
  let orchestrator: Orchestrator;
  let testConfig: Partial<OrchestratorConfig>;

  beforeEach(() => {
    testConfig = {
      healthCheckInterval: 1000,
      metricsCollectionInterval: 2000,
      workflowTimeout: 30000,
      maxConcurrentWorkflows: 3,
      loadBalancingStrategy: "round_robin",
      cacheConfig: {
        ttl: 10000,
        maxSize: 1024 * 1024,
        strategy: "lru",
      },
      enableTelemetry: false,
      logLevel: "error",
    };

    orchestrator = new Orchestrator(testConfig);
  });

  afterEach(async () => {
    if (orchestrator) {
      await orchestrator.stop();
    }
  });

  describe("Lifecycle Management", () => {
    it("should start and stop successfully", async () => {
      expect(orchestrator.getStats().isRunning).toBe(false);
      
      await orchestrator.start();
      expect(orchestrator.getStats().isRunning).toBe(true);
      
      await orchestrator.stop();
      expect(orchestrator.getStats().isRunning).toBe(false);
    });

    it("should not start twice", async () => {
      await orchestrator.start();
      await orchestrator.start(); // Should not throw
      expect(orchestrator.getStats().isRunning).toBe(true);
    });

    it("should not stop twice", async () => {
      await orchestrator.start();
      await orchestrator.stop();
      await orchestrator.stop(); // Should not throw
      expect(orchestrator.getStats().isRunning).toBe(false);
    });
  });

  describe("Agent Management", () => {
    beforeEach(async () => {
      await orchestrator.start();
    });

    it("should register agents successfully", async () => {
      const agent = new MockAgent("test-agent", "Test Agent");
      
      await orchestrator.registerAgent(agent);
      
      const stats = orchestrator.getStats();
      expect(stats.agents.totalAgents).toBe(1);
    });

    it("should unregister agents successfully", async () => {
      const agent = new MockAgent("test-agent", "Test Agent");
      
      await orchestrator.registerAgent(agent);
      expect(orchestrator.getStats().agents.totalAgents).toBe(1);
      
      await orchestrator.unregisterAgent("test-agent");
      expect(orchestrator.getStats().agents.totalAgents).toBe(0);
    });

    it("should handle multiple agents", async () => {
      const agent1 = new MockAgent("agent-1", "Agent 1");
      const agent2 = new MockAgent("agent-2", "Agent 2");
      
      await orchestrator.registerAgent(agent1);
      await orchestrator.registerAgent(agent2);
      
      const stats = orchestrator.getStats();
      expect(stats.agents.totalAgents).toBe(2);
    });
  });

  describe("Workflow Management", () => {
    let testWorkflow: WorkflowDefinition;

    beforeEach(async () => {
      await orchestrator.start();
      
      testWorkflow = {
        id: "test-workflow",
        name: "Test Workflow",
        description: "A simple test workflow",
        steps: [
          {
            id: "step-1",
            name: "First Step",
            type: "requirement_analysis",
            timeout: 5000,
          },
          {
            id: "step-2",
            name: "Second Step",
            type: "task_generation",
            dependencies: ["step-1"],
            timeout: 5000,
          },
        ],
        timeout: 15000,
      };
    });

    it("should execute workflows successfully", async () => {
      const execution = await orchestrator.executeWorkflow(testWorkflow, {
        input: "test data",
      });
      
      expect(execution.id).toBeDefined();
      expect(execution.workflowId).toBe("test-workflow");
      expect(execution.status).toBe("pending");
    });

    it("should get workflow status", async () => {
      const execution = await orchestrator.executeWorkflow(testWorkflow);
      
      const status = await orchestrator.getWorkflowStatus(execution.id);
      expect(status).toBeDefined();
      expect(status?.id).toBe(execution.id);
    });

    it("should cancel workflows", async () => {
      const execution = await orchestrator.executeWorkflow(testWorkflow);
      
      const cancelled = await orchestrator.cancelWorkflow(execution.id);
      expect(cancelled).toBe(true);
    });

    it("should handle workflow limits", async () => {
      const promises = [];
      
      // Try to execute more workflows than the limit
      for (let i = 0; i < testConfig.maxConcurrentWorkflows! + 2; i++) {
        const workflow = {
          ...testWorkflow,
          id: `test-workflow-${i}`,
        };
        promises.push(orchestrator.executeWorkflow(workflow));
      }
      
      // Some should succeed, some should fail due to limits
      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => r.status === "fulfilled").length;
      const failed = results.filter(r => r.status === "rejected").length;
      
      expect(successful).toBeLessThanOrEqual(testConfig.maxConcurrentWorkflows!);
      expect(failed).toBeGreaterThan(0);
    });
  });

  describe("System Health", () => {
    beforeEach(async () => {
      await orchestrator.start();
    });

    it("should report system health", async () => {
      const health = await orchestrator.getHealth();
      expect(["healthy", "degraded", "unhealthy", "unknown"]).toContain(health);
    });

    it("should collect system metrics", async () => {
      const metrics = await orchestrator.getSystemMetrics();
      
      expect(metrics.responseTime).toBeGreaterThanOrEqual(0);
      expect(metrics.throughput).toBeGreaterThanOrEqual(0);
      expect(metrics.errorRate).toBeGreaterThanOrEqual(0);
      expect(metrics.memoryUsage).toBeGreaterThan(0);
      expect(metrics.cpuUsage).toBeGreaterThanOrEqual(0);
      expect(metrics.timestamp).toBeInstanceOf(Date);
    });

    it("should provide comprehensive statistics", () => {
      const stats = orchestrator.getStats();
      
      expect(stats).toHaveProperty("isRunning");
      expect(stats).toHaveProperty("uptime");
      expect(stats).toHaveProperty("systemHealth");
      expect(stats).toHaveProperty("components");
      expect(stats).toHaveProperty("agents");
      expect(stats).toHaveProperty("workflows");
      expect(stats).toHaveProperty("cache");
      expect(stats).toHaveProperty("loadBalancer");
      expect(stats).toHaveProperty("events");
    });
  });

  describe("Cache Management", () => {
    beforeEach(async () => {
      await orchestrator.start();
    });

    it("should provide cache access", () => {
      const cache = orchestrator.getCache();
      expect(cache).toBeDefined();
    });

    it("should cache and retrieve data", () => {
      const cache = orchestrator.getCache();
      
      cache.set("test-key", "test-value");
      const value = cache.get("test-key");
      
      expect(value).toBe("test-value");
    });

    it("should handle cache namespaces", () => {
      const cache = orchestrator.getCache();
      
      cache.set("key", "value1", { namespace: "ns1" });
      cache.set("key", "value2", { namespace: "ns2" });
      
      expect(cache.get("key", "ns1")).toBe("value1");
      expect(cache.get("key", "ns2")).toBe("value2");
    });

    it("should support memoization", async () => {
      const cache = orchestrator.getCache();
      let callCount = 0;
      
      const memoizedFn = cache.memoize(async (input: string) => {
        callCount++;
        return `processed-${input}`;
      });
      
      const result1 = await memoizedFn("test");
      const result2 = await memoizedFn("test");
      
      expect(result1).toBe("processed-test");
      expect(result2).toBe("processed-test");
      expect(callCount).toBe(1); // Should only be called once due to caching
    });
  });

  describe("Event System", () => {
    beforeEach(async () => {
      await orchestrator.start();
    });

    it("should provide event dispatcher access", () => {
      const eventDispatcher = orchestrator.getEventDispatcher();
      expect(eventDispatcher).toBeDefined();
    });

    it("should handle event registration and dispatch", async () => {
      const eventDispatcher = orchestrator.getEventDispatcher();
      let eventReceived = false;
      
      eventDispatcher.registerHandler({
        type: "test:event",
        priority: "normal",
        handler: async () => {
          eventReceived = true;
        },
      });
      
      await eventDispatcher.createEvent("test:event", "test", {});
      
      // Wait a bit for event processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(eventReceived).toBe(true);
    });

    it("should provide event statistics", () => {
      const eventDispatcher = orchestrator.getEventDispatcher();
      const stats = eventDispatcher.getEventStats();
      
      expect(stats).toHaveProperty("totalEvents");
      expect(stats).toHaveProperty("eventsByType");
      expect(stats).toHaveProperty("eventsByPriority");
      expect(stats).toHaveProperty("queueSize");
    });
  });

  describe("Load Balancing", () => {
    beforeEach(async () => {
      await orchestrator.start();
    });

    it("should provide load balancer access", () => {
      const loadBalancer = orchestrator.getLoadBalancer();
      expect(loadBalancer).toBeDefined();
    });

    it("should register agents with load balancer", async () => {
      const agent = new MockAgent("test-agent", "Test Agent");
      const loadBalancer = orchestrator.getLoadBalancer();
      
      await orchestrator.registerAgent(agent);
      
      const stats = loadBalancer.getStats();
      expect(stats.totalAgents).toBe(1);
    });

    it("should select agents for tasks", async () => {
      const agent = new MockAgent("test-agent", "Test Agent");
      const loadBalancer = orchestrator.getLoadBalancer();
      
      await orchestrator.registerAgent(agent);
      
      const result = loadBalancer.selectAgent({
        agentId: "",
        taskId: "test-task",
        priority: 1,
      });
      
      expect(result.selectedAgent).toBeDefined();
      expect(result.selectedAgent?.id).toBe("test-agent");
    });
  });

  describe("Configuration Management", () => {
    it("should use default configuration", () => {
      const defaultOrchestrator = new Orchestrator();
      const stats = defaultOrchestrator.getStats();
      expect(stats).toBeDefined();
    });

    it("should accept custom configuration", () => {
      const customConfig = {
        maxConcurrentWorkflows: 5,
        loadBalancingStrategy: "weighted" as const,
      };
      
      const customOrchestrator = new Orchestrator(customConfig);
      expect(customOrchestrator).toBeDefined();
    });

    it("should update configuration", async () => {
      await orchestrator.start();
      
      orchestrator.updateConfig({
        maxConcurrentWorkflows: 15,
        loadBalancingStrategy: "least_connections",
      });
      
      // Configuration should be updated
      const loadBalancer = orchestrator.getLoadBalancer();
      const stats = loadBalancer.getStats();
      expect(stats.strategy).toBe("least_connections");
    });
  });

  describe("Complete Workflow Pipeline", () => {
    beforeEach(async () => {
      await orchestrator.start();
    });

    it("should execute complete workflow pipeline", async () => {
      const execution = await orchestrator.executeCompleteWorkflow({
        requirements: "Test requirement",
        technology: "TypeScript",
      });
      
      expect(execution.id).toBeDefined();
      expect(execution.workflowId).toBe("complete_development_pipeline");
    });
  });

  describe("Error Handling", () => {
    it("should handle start errors gracefully", async () => {
      // Mock a component that fails to start
      const mockOrchestrator = new Orchestrator(testConfig);
      vi.spyOn(mockOrchestrator.getEventDispatcher(), "start").mockRejectedValue(new Error("Start failed"));
      
      await expect(mockOrchestrator.start()).rejects.toThrow("Start failed");
      expect(mockOrchestrator.getStats().isRunning).toBe(false);
    });

    it("should handle workflow execution errors", async () => {
      await orchestrator.start();
      
      const invalidWorkflow: WorkflowDefinition = {
        id: "invalid-workflow",
        name: "Invalid Workflow",
        description: "Workflow with circular dependencies",
        steps: [
          {
            id: "step-1",
            name: "Step 1",
            type: "execution",
            dependencies: ["step-2"],
          },
          {
            id: "step-2",
            name: "Step 2",
            type: "execution",
            dependencies: ["step-1"],
          },
        ],
      };
      
      await expect(orchestrator.executeWorkflow(invalidWorkflow)).rejects.toThrow();
    });

    it("should handle operations when not running", async () => {
      // Orchestrator is not started
      await expect(orchestrator.executeWorkflow({
        id: "test",
        name: "Test",
        description: "Test",
        steps: [],
      })).rejects.toThrow("Orchestrator is not running");
    });
  });

  describe("Component Access", () => {
    beforeEach(async () => {
      await orchestrator.start();
    });

    it("should provide access to all components", () => {
      expect(orchestrator.getEventDispatcher()).toBeDefined();
      expect(orchestrator.getSystemWatcher()).toBeDefined();
      expect(orchestrator.getCoordinationEngine()).toBeDefined();
      expect(orchestrator.getWorkflowManager()).toBeDefined();
      expect(orchestrator.getCache()).toBeDefined();
      expect(orchestrator.getLoadBalancer()).toBeDefined();
    });
  });
});

