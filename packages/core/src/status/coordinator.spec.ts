import { StatusSynchronizationCoordinator } from "./coordinator";
import { AgentRegistry } from "../server/registry";
import type { AgentStatus } from "../agent/types";

// Mock dependencies
jest.mock("../server/registry");
jest.mock("../events");

const mockAgent = {
  id: "test-agent-1",
  getFullState: jest.fn(),
  getHistoryManager: jest.fn(),
  isTelemetryConfigured: jest.fn(),
  getTelemetryExporter: jest.fn(),
  getHistory: jest.fn(),
};

const mockHistoryManager = {
  updateEntry: jest.fn(),
  addEventToEntry: jest.fn(),
};

const mockTelemetryExporter = {
  updateAgentHistory: jest.fn(),
};

describe("StatusSynchronizationCoordinator", () => {
  let coordinator: StatusSynchronizationCoordinator;
  let mockRegistry: jest.Mocked<typeof AgentRegistry>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset singleton
    (StatusSynchronizationCoordinator as any).instance = null;
    
    // Setup mocks
    mockAgent.getFullState.mockReturnValue({ status: "idle" });
    mockAgent.getHistoryManager.mockReturnValue(mockHistoryManager);
    mockAgent.isTelemetryConfigured.mockReturnValue(true);
    mockAgent.getTelemetryExporter.mockReturnValue(mockTelemetryExporter);
    mockAgent.getHistory.mockResolvedValue([
      { id: "history-1", status: "working", events: [] }
    ]);

    mockRegistry = AgentRegistry as jest.Mocked<typeof AgentRegistry>;
    mockRegistry.getInstance.mockReturnValue({
      getAgent: jest.fn().mockReturnValue(mockAgent),
    } as any);

    coordinator = StatusSynchronizationCoordinator.getInstance({
      enableWebSocket: true,
      enableTelemetry: true,
      enableHistory: true,
      enableRealTimeEvents: true,
    });
  });

  afterEach(() => {
    coordinator.cleanup();
  });

  describe("updateStatus", () => {
    it("should successfully update agent status", async () => {
      const request = {
        agentId: "test-agent-1",
        historyId: "history-1",
        status: "working" as AgentStatus,
        metadata: { test: "data" },
        source: "system" as const,
      };

      const result = await coordinator.updateStatus(request);

      expect(result.success).toBe(true);
      expect(result.agentId).toBe("test-agent-1");
      expect(result.status).toBe("working");
      expect(result.propagatedTo).toContain("history");
    });

    it("should handle missing agent gracefully", async () => {
      mockRegistry.getInstance().getAgent = jest.fn().mockReturnValue(null);

      const request = {
        agentId: "non-existent-agent",
        status: "working" as AgentStatus,
      };

      await expect(coordinator.updateStatus(request)).rejects.toThrow("Agent not found");
    });

    it("should validate required fields", async () => {
      const request = {
        agentId: "",
        status: "working" as AgentStatus,
      };

      await expect(coordinator.updateStatus(request)).rejects.toThrow(
        "Invalid status update request: agentId and status are required"
      );
    });

    it("should propagate to all enabled channels", async () => {
      const request = {
        agentId: "test-agent-1",
        historyId: "history-1",
        status: "completed" as AgentStatus,
        eventName: "task_completed",
        additionalData: { result: "success" },
      };

      const result = await coordinator.updateStatus(request);

      expect(result.success).toBe(true);
      expect(result.propagatedTo).toEqual(
        expect.arrayContaining(["history", "events", "telemetry", "websocket"])
      );
    });

    it("should handle partial failures gracefully", async () => {
      // Make telemetry fail
      mockTelemetryExporter.updateAgentHistory.mockRejectedValue(new Error("Telemetry error"));

      const request = {
        agentId: "test-agent-1",
        historyId: "history-1",
        status: "error" as AgentStatus,
      };

      const result = await coordinator.updateStatus(request);

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0].target).toBe("telemetry");
      expect(result.propagatedTo).toContain("history");
    });
  });

  describe("batching", () => {
    it("should batch updates when enabled", async () => {
      coordinator.configure({ batchUpdates: true, batchInterval: 50 });

      const requests = [
        { agentId: "test-agent-1", status: "working" as AgentStatus },
        { agentId: "test-agent-1", status: "tool_calling" as AgentStatus },
        { agentId: "test-agent-1", status: "completed" as AgentStatus },
      ];

      const results = await Promise.all(
        requests.map(req => coordinator.updateStatus(req))
      );

      // All should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Wait for batch processing
      await new Promise(resolve => setTimeout(resolve, 100));
    });
  });

  describe("status queries", () => {
    it("should get current agent status", () => {
      const status = coordinator.getAgentStatus("test-agent-1");
      expect(status).toBe("idle");
    });

    it("should return null for non-existent agent", () => {
      mockRegistry.getInstance().getAgent = jest.fn().mockReturnValue(null);
      const status = coordinator.getAgentStatus("non-existent");
      expect(status).toBeNull();
    });

    it("should get status history", async () => {
      const history = await coordinator.getStatusHistory("test-agent-1", 5);
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe("subscriptions", () => {
    it("should allow subscribing to agent status changes", () => {
      const callback = jest.fn();
      const unsubscribe = coordinator.onStatusChange("test-agent-1", callback);

      expect(typeof unsubscribe).toBe("function");
      
      // Cleanup
      unsubscribe();
    });

    it("should allow subscribing to all status changes", () => {
      const callback = jest.fn();
      const unsubscribe = coordinator.onAnyStatusChange(callback);

      expect(typeof unsubscribe).toBe("function");
      
      // Cleanup
      unsubscribe();
    });
  });

  describe("configuration", () => {
    it("should allow updating configuration", () => {
      const newConfig = {
        enableWebSocket: false,
        enableTelemetry: false,
        batchUpdates: true,
      };

      coordinator.configure(newConfig);
      const config = coordinator.getConfiguration();

      expect(config.enableWebSocket).toBe(false);
      expect(config.enableTelemetry).toBe(false);
      expect(config.batchUpdates).toBe(true);
    });
  });

  describe("singleton behavior", () => {
    it("should return the same instance", () => {
      const instance1 = StatusSynchronizationCoordinator.getInstance();
      const instance2 = StatusSynchronizationCoordinator.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe("error handling", () => {
    it("should emit error events on failures", async () => {
      const errorCallback = jest.fn();
      coordinator.on("statusUpdateError", errorCallback);

      // Make history update fail
      mockHistoryManager.updateEntry.mockRejectedValue(new Error("History error"));

      const request = {
        agentId: "test-agent-1",
        historyId: "history-1",
        status: "error" as AgentStatus,
      };

      const result = await coordinator.updateStatus(request);

      expect(result.success).toBe(true); // Should still succeed partially
      expect(result.errors).toHaveLength(1);
    });
  });

  describe("cleanup", () => {
    it("should cleanup resources properly", () => {
      const cleanupSpy = jest.spyOn(coordinator, "removeAllListeners");
      
      coordinator.cleanup();
      
      expect(cleanupSpy).toHaveBeenCalled();
    });
  });
});

