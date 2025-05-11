import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MCPServer } from "./index";
import { asyncOperationManager } from "./async-manager";
import { createTool } from "../../tool";
import { z } from "zod";

// Mock FastMCP
vi.mock("fastmcp", () => {
  return {
    FastMCP: vi.fn().mockImplementation(() => ({
      addResource: vi.fn(),
      addResourceTemplate: vi.fn(),
      addTool: vi.fn(),
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
    })),
  };
});

// Mock fs
vi.mock("fs", () => ({
  existsSync: vi.fn().mockReturnValue(false),
  readFileSync: vi.fn(),
}));

describe("MCPServer", () => {
  let server: MCPServer;

  beforeEach(() => {
    server = new MCPServer({
      name: "Test MCP Server",
      version: "1.0.0",
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should create a server instance", () => {
    expect(server).toBeDefined();
  });

  it("should initialize the server", async () => {
    await server.init();
    expect(server["initialized"]).toBe(true);
  });

  it("should start the server", async () => {
    await server.start();
    expect(server["server"].start).toHaveBeenCalled();
  });

  it("should stop the server", async () => {
    await server.stop();
    expect(server["server"].stop).toHaveBeenCalled();
  });

  it("should register a tool", async () => {
    const registrationFn = vi.fn();
    server.registerTool(registrationFn);
    
    expect(server["toolRegistrations"].length).toBe(1);
    
    // Initialize to trigger registration
    await server.init();
    expect(registrationFn).toHaveBeenCalledWith(server["server"], asyncOperationManager);
  });

  it("should register a tool after initialization", async () => {
    await server.init();
    
    const registrationFn = vi.fn();
    server.registerTool(registrationFn);
    
    expect(registrationFn).toHaveBeenCalledWith(server["server"], asyncOperationManager);
  });
});

describe("AsyncOperationManager", () => {
  it("should add an operation", () => {
    const operationFn = vi.fn().mockResolvedValue({ success: true, data: "result" });
    const context = {
      log: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      },
      reportProgress: vi.fn(),
      session: {},
    };

    const operationId = asyncOperationManager.addOperation(operationFn, { test: true }, context);
    expect(operationId).toMatch(/^op-/);
  });

  it("should get operation status", () => {
    const operationFn = vi.fn().mockResolvedValue({ success: true, data: "result" });
    const context = {
      log: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      },
      reportProgress: vi.fn(),
      session: {},
    };

    const operationId = asyncOperationManager.addOperation(operationFn, { test: true }, context);
    const status = asyncOperationManager.getStatus(operationId);
    
    expect(status.id).toBe(operationId);
    expect(status.status).toBe("pending");
  });
});

