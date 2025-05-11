# MCP Server

This module provides a TypeScript implementation of the Model Context Protocol (MCP) server, which allows AI agents to interact with external tools and resources.

## Overview

The MCP server implementation consists of the following components:

- **MCPServer**: The main server class that handles initialization, starting, stopping, and tool registration.
- **AsyncOperationManager**: Manages long-running asynchronous operations, allowing tools to execute in the background.
- **Logger**: Provides logging functionality for the MCP server.
- **MCPToolAdapter**: Adapts tools from the VoltAgent tool registry to the MCP server format.

## Usage

### Basic Usage

```typescript
import { MCPServer, createToolRegistrationFn } from "@voltagent/core/mcp/server";
import { ToolManager } from "@voltagent/core/tool/manager";

// Create a tool manager and register tools
const toolManager = new ToolManager();
// ... register tools with the tool manager

// Create an MCP server
const mcpServer = new MCPServer({
  name: "My MCP Server",
  version: "1.0.0",
});

// Register tools from the tool manager
mcpServer.registerTool(createToolRegistrationFn(toolManager));

// Start the server
await mcpServer.start({
  transportType: "stdio", // or "http"
  timeout: 120000, // 2 minutes
});

// Handle graceful shutdown
process.on("SIGINT", async () => {
  await mcpServer.stop();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await mcpServer.stop();
  process.exit(0);
});
```

### Async Operations

The MCP server supports long-running asynchronous operations through the `AsyncOperationManager`. This allows tools to execute in the background and report progress.

```typescript
import { MCPServer, asyncOperationManager } from "@voltagent/core/mcp/server";

// Create an MCP server
const mcpServer = new MCPServer();

// Register a tool that uses async operations
mcpServer.registerTool((server, asyncManager) => {
  server.addTool({
    name: "long_running_task",
    description: "A task that takes a long time to complete",
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "string" },
      },
      required: ["taskId"],
    },
    handler: async (args, context) => {
      const operationId = asyncManager.addOperation(
        async (toolArgs, log, opContext) => {
          // Simulate a long-running task
          log.info(`Starting long-running task: ${toolArgs.taskId}`);
          
          // Report progress
          opContext.reportProgress({ progress: 0 });
          
          // Do some work...
          await new Promise(resolve => setTimeout(resolve, 1000));
          opContext.reportProgress({ progress: 50 });
          
          // Do more work...
          await new Promise(resolve => setTimeout(resolve, 1000));
          opContext.reportProgress({ progress: 100 });
          
          log.info(`Completed long-running task: ${toolArgs.taskId}`);
          
          return {
            success: true,
            data: { result: `Task ${toolArgs.taskId} completed` },
          };
        },
        args,
        context
      );
      
      return {
        success: true,
        data: {
          operationId,
          status: "pending",
          message: "Operation started",
        },
      };
    },
  });
  
  // Register a tool to check operation status
  server.addTool({
    name: "check_operation",
    description: "Check the status of an async operation",
    inputSchema: {
      type: "object",
      properties: {
        operationId: { type: "string" },
      },
      required: ["operationId"],
    },
    handler: async (args, context) => {
      const status = asyncManager.getStatus(args.operationId);
      return {
        success: true,
        data: status,
      };
    },
  });
});

// Start the server
await mcpServer.start();
```

## API Reference

### MCPServer

The main server class that implements the MCP protocol.

#### Constructor

```typescript
constructor(options?: Partial<MCPServerOptions>)
```

- `options`: Optional server options
  - `name`: Server name (default: "VoltAgent MCP Server")
  - `version`: Server version (default: package.json version or "0.1.0")

#### Methods

- `init()`: Initialize the server
- `start(options?)`: Start the server
  - `options.transportType`: Transport type ("stdio" or "http", default: "stdio")
  - `options.timeout`: Timeout in milliseconds (default: 120000)
- `stop()`: Stop the server
- `registerTool(registrationFn)`: Register a tool with the server

### AsyncOperationManager

Manages long-running asynchronous operations.

#### Methods

- `addOperation(operationFn, args, context)`: Add an operation to be executed asynchronously
- `getStatus(operationId)`: Get the status of an operation

### MCPToolAdapter

Adapts tools from the VoltAgent tool registry to the MCP server format.

#### Constructor

```typescript
constructor(toolManager: ToolManager, mcpServer: FastMCP, asyncManager: AsyncOperationManager)
```

#### Methods

- `registerAllTools()`: Register all tools from the tool manager
- `registerTool(tool)`: Register a single tool
- `registerAsyncTool(tool)`: Register a tool with async execution support

### Helper Functions

- `createToolRegistrationFn(toolManager)`: Create a tool registration function for the MCP server
- `createLogger(options?)`: Create a logger instance

