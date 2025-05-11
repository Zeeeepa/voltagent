import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MCPToolAdapter, createToolRegistrationFn } from "./tool-adapter";
import { asyncOperationManager } from "./async-manager";
import { createTool } from "../../tool";
import { z } from "zod";

// Mock tool manager
const mockToolManager = {
  getTools: vi.fn(),
};

// Mock FastMCP
const mockMcpServer = {
  addTool: vi.fn(),
};

describe("MCPToolAdapter", () => {
  let adapter: MCPToolAdapter;

  beforeEach(() => {
    adapter = new MCPToolAdapter(
      mockToolManager as any,
      mockMcpServer as any,
      asyncOperationManager
    );
    
    // Reset mocks
    mockToolManager.getTools.mockReset();
    mockMcpServer.addTool.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should register all tools", () => {
    const mockTool1 = createTool({
      name: "tool1",
      description: "Test tool 1",
      parameters: z.object({
        param1: z.string(),
      }),
      execute: async () => "result1",
    });

    const mockTool2 = createTool({
      name: "tool2",
      description: "Test tool 2",
      parameters: z.object({
        param2: z.number(),
      }),
      execute: async () => "result2",
    });

    mockToolManager.getTools.mockReturnValue([mockTool1, mockTool2]);

    adapter.registerAllTools();

    expect(mockToolManager.getTools).toHaveBeenCalled();
    expect(mockMcpServer.addTool).toHaveBeenCalledTimes(2);
  });

  it("should register a single tool", () => {
    const mockTool = createTool({
      name: "tool1",
      description: "Test tool 1",
      parameters: z.object({
        param1: z.string(),
      }),
      execute: async () => "result1",
    });

    adapter.registerTool(mockTool);

    expect(mockMcpServer.addTool).toHaveBeenCalledTimes(1);
    expect(mockMcpServer.addTool).toHaveBeenCalledWith(expect.objectContaining({
      name: "tool1",
      description: "Test tool 1",
    }));
  });

  it("should register an async tool", () => {
    const mockTool = createTool({
      name: "tool1",
      description: "Test tool 1",
      parameters: z.object({
        param1: z.string(),
      }),
      execute: async () => "result1",
    });

    adapter.registerAsyncTool(mockTool);

    expect(mockMcpServer.addTool).toHaveBeenCalledTimes(2); // Async tool + check status tool
    expect(mockMcpServer.addTool).toHaveBeenCalledWith(expect.objectContaining({
      name: "async_tool1",
      description: expect.stringContaining("Test tool 1"),
    }));
  });

  it("should skip invalid tools", () => {
    const invalidTool = {
      // Missing name
      description: "Invalid tool",
      execute: async () => "result",
    };

    adapter.registerTool(invalidTool as any);

    expect(mockMcpServer.addTool).not.toHaveBeenCalled();
  });
});

describe("createToolRegistrationFn", () => {
  it("should create a tool registration function", () => {
    const mockToolManager = {
      getTools: vi.fn().mockReturnValue([]),
    };

    const registrationFn = createToolRegistrationFn(mockToolManager as any);
    const mockMcpServer = { addTool: vi.fn() };

    registrationFn(mockMcpServer as any, asyncOperationManager);

    expect(mockToolManager.getTools).toHaveBeenCalled();
  });
});

