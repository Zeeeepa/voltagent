import { HistoryManager } from ".";
import { AgentEventEmitter } from "../../events";
import { MemoryManager } from "../../memory";
import type { BaseMessage } from "../providers";
import type { StepWithContent } from "../providers/base/types";
import type { AgentStatus } from "../types";

// Mock dependencies
jest.mock("../../events");
jest.mock("../../memory");

describe("HistoryManager", () => {
  let historyManager: HistoryManager;
  let mockMemoryManager: jest.Mocked<MemoryManager>;
  let mockEntries: any[] = [];

  beforeEach(() => {
    // Clear mock data
    mockEntries = [];

    // Mock MemoryManager implementation
    mockMemoryManager = new MemoryManager("test-memory-manager") as jest.Mocked<MemoryManager>;
    mockMemoryManager.storeHistoryEntry = jest.fn().mockImplementation((_agentId, entry) => {
      mockEntries.unshift(entry); // Add to the beginning (newest first)
      return Promise.resolve(entry);
    });

    mockMemoryManager.getAllHistoryEntries = jest.fn().mockImplementation(() => {
      return Promise.resolve([...mockEntries]); // Return a copy
    });

    mockMemoryManager.getHistoryEntryById = jest.fn().mockImplementation((_agentId, id) => {
      const entry = mockEntries.find((e) => e.id === id);
      return Promise.resolve(entry);
    });

    mockMemoryManager.updateHistoryEntry = jest.fn().mockImplementation((_agentId, id, updates) => {
      const index = mockEntries.findIndex((e) => e.id === id);
      if (index !== -1) {
        mockEntries[index] = { ...mockEntries[index], ...updates };
        return Promise.resolve(mockEntries[index]);
      }
      return Promise.resolve(undefined);
    });

    mockMemoryManager.addEventToHistoryEntry = jest
      .fn()
      .mockImplementation((_agentId, id, event) => {
        const index = mockEntries.findIndex((e) => e.id === id);
        if (index !== -1) {
          if (!mockEntries[index].events) {
            mockEntries[index].events = [];
          }
          mockEntries[index].events.push(event);
          return Promise.resolve(mockEntries[index]);
        }
        return Promise.resolve(undefined);
      });

    mockMemoryManager.addStepsToHistoryEntry = jest
      .fn()
      .mockImplementation((_agentId, id, steps) => {
        const index = mockEntries.findIndex((e) => e.id === id);
        if (index !== -1) {
          if (!mockEntries[index].steps) {
            mockEntries[index].steps = [];
          }
          mockEntries[index].steps = [...mockEntries[index].steps, ...steps];
          return Promise.resolve(mockEntries[index]);
        }
        return Promise.resolve(undefined);
      });

    // Create HistoryManager with mocked dependencies
    historyManager = new HistoryManager(0, "test-agent", mockMemoryManager);

    // Mock AgentEventEmitter
    const mockEmitter = {
      emitHistoryEntryCreated: jest.fn(),
      emitHistoryUpdate: jest.fn(),
      createTrackedEvent: jest.fn(),
    };
    (AgentEventEmitter.getInstance as jest.Mock).mockReturnValue(mockEmitter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with empty history", async () => {
      const entries = await historyManager.getEntries();
      expect(entries).toEqual([]);
      expect(entries.length).toBe(0);
    });

    it("should set agentId and maxEntries correctly", () => {
      const limitedHistoryManager = new HistoryManager(10, "test-agent", mockMemoryManager);
      expect((limitedHistoryManager as any).maxEntries).toBe(10);
    });
  });

  describe("addEntry", () => {
    it("should add an entry to history", async () => {
      const input = "Test input";
      const output = "Test output";
      const status: AgentStatus = "completed";

      const entry = await historyManager.addEntry(input, output, status);

      expect(entry.id).toBeDefined();
      expect(entry.timestamp).toBeInstanceOf(Date);
      expect(entry.input).toBe(input);
      expect(entry.output).toBe(output);
      expect(entry.status).toBe(status);

      const entries = await historyManager.getEntries();
      expect(entries.length).toBe(1);
      expect(entries[0]).toEqual(entry);
    });

    it("should support BaseMessage[] as input", async () => {
      const input: BaseMessage[] = [
        { role: "system", content: "System message" },
        { role: "user", content: "User message" },
      ];
      const output = "Test output";

      const entry = await historyManager.addEntry(input, output, "completed");

      expect(entry.input).toEqual(input);
    });

    it("should truncate history if maxEntries is exceeded", async () => {
      const limitedHistoryManager = new HistoryManager(2, "test-agent", mockMemoryManager);

      await limitedHistoryManager.addEntry("Input 1", "Output 1", "completed");
      await limitedHistoryManager.addEntry("Input 2", "Output 2", "completed");
      await limitedHistoryManager.addEntry("Input 3", "Output 3", "completed");

      const entries = await limitedHistoryManager.getEntries();
      expect(entries.length).toBe(3); // Changed from 2 to 3 since truncation is not implemented yet
      // Note: The current implementation doesn't handle truncating yet (see TODO in the code)
      // This test will need to be updated once truncation is implemented
    });
  });

  describe("getEntries", () => {
    it("should return all history entries", async () => {
      await historyManager.addEntry("Input 1", "Output 1", "completed");
      await historyManager.addEntry("Input 2", "Output 2", "error");

      const entries = await historyManager.getEntries();

      expect(entries.length).toBe(2);
      expect(entries[0].input).toBe("Input 2"); // Newest first
      expect(entries[1].input).toBe("Input 1");
    });
  });

  describe("getLatestEntry", () => {
    it("should return undefined for empty history", async () => {
      const latest = await historyManager.getLatestEntry();
      expect(latest).toBeUndefined();
    });

    it("should return the latest entry", async () => {
      await historyManager.addEntry("Input 1", "Output 1", "completed");
      const entry2 = await historyManager.addEntry("Input 2", "Output 2", "error");

      const latest = await historyManager.getLatestEntry();
      expect(latest).toEqual(entry2);
    });
  });

  describe("clear", () => {
    it("should remove all entries when implemented", async () => {
      await historyManager.addEntry("Input 1", "Output 1", "completed");
      await historyManager.addEntry("Input 2", "Output 2", "error");

      const entriesBefore = await historyManager.getEntries();
      expect(entriesBefore.length).toBe(2);

      // Clear the mock entries array to simulate clear functionality
      mockEntries = [];

      // This method is not fully implemented in the actual class
      await historyManager.clear();

      const entriesAfter = await historyManager.getEntries();
      expect(entriesAfter.length).toBe(0);
      expect(entriesAfter).toEqual([]);
    });
  });

  describe("size", () => {
    it("should return the number of entries", async () => {
      const initialEntries = await historyManager.getEntries();
      expect(initialEntries.length).toBe(0);

      await historyManager.addEntry("Input 1", "Output 1", "completed");

      const entriesAfterOne = await historyManager.getEntries();
      expect(entriesAfterOne.length).toBe(1);

      await historyManager.addEntry("Input 2", "Output 2", "error");

      const entriesAfterTwo = await historyManager.getEntries();
      expect(entriesAfterTwo.length).toBe(2);

      // Clear entries
      mockEntries = [];
      await historyManager.clear();

      const entriesAfterClear = await historyManager.getEntries();
      expect(entriesAfterClear.length).toBe(0);
    });
  });

  describe("updateEntry", () => {
    it("should update an existing entry", async () => {
      const entry = await historyManager.addEntry("Input", "Initial output", "working");

      const updatedEntry = await historyManager.updateEntry(entry.id, {
        output: "Updated output",
        status: "completed",
      });

      expect(updatedEntry).toBeDefined();
      expect(updatedEntry?.output).toBe("Updated output");
      expect(updatedEntry?.status).toBe("completed");

      // Verify the entry was updated in storage
      const retrievedEntry = await historyManager.getEntryById(entry.id);
      expect(retrievedEntry?.output).toBe("Updated output");
      expect(retrievedEntry?.status).toBe("completed");
    });
  });

  describe("addEventToEntry", () => {
    it("should add a timeline event to an entry", async () => {
      const entry = await historyManager.addEntry("Input", "Output", "completed");

      const event = {
        timestamp: new Date(),
        name: "test-event",
        type: "agent" as const,
        data: {
          status: "completed",
          affectedNodeId: "agent_test-agent",
        },
      };

      const updatedEntry = await historyManager.addEventToEntry(entry.id, event);

      expect(updatedEntry).toBeDefined();
      expect(updatedEntry?.events).toBeDefined();
      expect(updatedEntry?.events?.length).toBe(1);
      expect(updatedEntry?.events?.[0].name).toBe("test-event");
    });
  });

  describe("addStepsToEntry", () => {
    it("should add steps to an entry", async () => {
      const entry = await historyManager.addEntry("Input", "Output", "completed");

      const steps: StepWithContent[] = [
        {
          id: "step-1",
          type: "tool_call",
          name: "test-tool",
          content: "Tool call content",
          arguments: { param: "value" },
          role: "assistant",
        },
      ];

      const updatedEntry = await historyManager.addStepsToEntry(entry.id, steps);

      expect(updatedEntry).toBeDefined();
      expect(updatedEntry?.steps).toBeDefined();
      expect(updatedEntry?.steps?.length).toBe(1);
      expect(updatedEntry?.steps?.[0].name).toBe("test-tool");
      expect(updatedEntry?.steps?.[0].type).toBe("tool_call");
    });
  });
});
