import { z } from "zod";
import { type AgentTool, ToolManager, createTool } from "../index";

describe("ToolManager", () => {
  let toolManager: ToolManager;
  // Create sample tools for testing
  const mockTool1 = createTool({
    name: "tool1",
    description: "Test tool 1",
    parameters: z.object({
      param1: z.string().describe("Parameter 1"),
    }),
    execute: jest.fn().mockResolvedValue("Tool 1 result"),
  });

  const mockTool2 = createTool({
    name: "tool2",
    description: "Test tool 2",
    parameters: z.object({
      param2: z.number().describe("Parameter 2"),
    }),
    execute: jest.fn().mockResolvedValue("Tool 2 result"),
  });

  beforeEach(() => {
    toolManager = new ToolManager();
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with empty tools if none provided", () => {
      const tools = toolManager.getTools();
      expect(tools).toEqual([]);
    });

    it("should initialize with provided tools", () => {
      const manager = new ToolManager([mockTool1, mockTool2]);
      const tools = manager.getTools();
      expect(tools.length).toBe(2);
      expect(tools[0].name).toBe("tool1");
      expect(tools[1].name).toBe("tool2");
    });
  });

  describe("addTool", () => {
    it("should add a tool", () => {
      const result = toolManager.addTool(mockTool1);
      expect(result).toBe(true);

      const tools = toolManager.getTools();
      expect(tools.length).toBe(1);
      expect(tools[0].name).toBe("tool1");
      expect(tools[0].description).toBe("Test tool 1");
    });

    it("should replace an existing tool with the same name", () => {
      toolManager.addTool(mockTool1);

      const updatedTool = createTool({
        name: "tool1",
        description: "Updated test tool 1",
        parameters: z.object({
          newParam: z.string().describe("New parameter"),
        }),
        execute: jest.fn().mockResolvedValue("Updated tool 1 result"),
      });

      const result = toolManager.addTool(updatedTool);
      expect(result).toBe(true); // should return true when replacing

      const tools = toolManager.getTools();
      expect(tools.length).toBe(1);
      expect(tools[0].name).toBe("tool1");
      expect(tools[0].description).toBe("Updated test tool 1");
    });

    it("should throw an error if tool doesn't have an execute function", () => {
      const invalidTool = {
        name: "invalidTool",
        description: "Invalid tool",
        parameters: z.object({}),
      } as unknown as AgentTool;

      expect(() => toolManager.addTool(invalidTool)).toThrow();
    });
  });

  describe("addItems", () => {
    it("should add multiple tools", () => {
      toolManager.addItems([mockTool1, mockTool2]);

      const tools = toolManager.getTools();
      expect(tools.length).toBe(2);
      expect(tools[0].name).toBe("tool1");
      expect(tools[1].name).toBe("tool2");
    });
  });

  describe("removeTool", () => {
    it("should remove a tool by name", () => {
      toolManager.addItems([mockTool1, mockTool2]);

      const result = toolManager.removeTool("tool1");
      expect(result).toBe(true);

      const tools = toolManager.getTools();
      expect(tools.length).toBe(1);
      expect(tools[0].name).toBe("tool2");
    });

    it("should return false when trying to remove a non-existent tool", () => {
      const result = toolManager.removeTool("nonExistentTool");
      expect(result).toBe(false);
    });
  });

  describe("prepareToolsForGeneration", () => {
    it("should return a copy of all tools", () => {
      toolManager.addItems([mockTool1, mockTool2]);

      const preparedTools = toolManager.prepareToolsForGeneration();
      expect(preparedTools.length).toBe(2);
      expect(preparedTools[0].name).toBe("tool1");
      expect(preparedTools[1].name).toBe("tool2");

      // Should be a copy, not the same reference
      expect(preparedTools).not.toBe(toolManager.getTools());
    });

    it("should include dynamic tools when provided", () => {
      toolManager.addTool(mockTool1);

      const dynamicTools = [mockTool2];

      const preparedTools = toolManager.prepareToolsForGeneration(dynamicTools);
      expect(preparedTools.length).toBe(2);
      expect(preparedTools[0].name).toBe("tool1");
      expect(preparedTools[1].name).toBe("tool2");
    });
  });

  describe("getToolsForApi", () => {
    it("should return simplified tool information for API", () => {
      toolManager.addItems([mockTool1, mockTool2]);

      const apiTools = toolManager.getToolsForApi();
      expect(apiTools).toEqual([
        { name: "tool1", description: "Test tool 1", parameters: expect.any(Object) },
        { name: "tool2", description: "Test tool 2", parameters: expect.any(Object) },
      ]);
    });
  });

  describe("hasTool", () => {
    it("should return true if tool exists", () => {
      toolManager.addTool(mockTool1);

      expect(toolManager.hasTool("tool1")).toBe(true);
    });

    it("should return false if tool doesn't exist", () => {
      expect(toolManager.hasTool("nonExistentTool")).toBe(false);
    });
  });
});
